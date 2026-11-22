//! Command-line parsing.
//!
//! Hand-rolled rather than pulled from a crate. The surface is three flags and
//! it is parsed on the critical path, so a parser written in twenty lines beats
//! a dependency: this process starts, reads a small JSON document, writes it to
//! a socket and exits, and every crate it links costs start-up time and
//! installer size.
//!
//! Unrecognised arguments are collected rather than rejected. Codex appends its
//! JSON payload as a bare argument, so the command line is not fully under our
//! control and a strict parser would break the integration it exists to serve.

use std::fmt;

/// Which agent invoked us.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AgentArg {
    ClaudeCode,
    Codex,
}

impl AgentArg {
    pub const fn id(self) -> &'static str {
        match self {
            AgentArg::ClaudeCode => "claude_code",
            AgentArg::Codex => "codex",
        }
    }

    /// Accepted spellings, so a config written by hand or by the app both work.
    fn from_value(value: &str) -> Option<AgentArg> {
        match value.trim().to_ascii_lowercase().as_str() {
            "claude" | "claude-code" | "claude_code" | "claudecode" => Some(AgentArg::ClaudeCode),
            "codex" => Some(AgentArg::Codex),
            _ => None,
        }
    }
}

/// Parsed command line.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct Args {
    pub agent: Option<AgentArg>,
    /// Print the normalised event to stdout instead of sending it.
    ///
    /// For the tests and for debugging only. It must **never** appear in an
    /// agent's hook configuration: Claude Code parses a hook's stdout as hook
    /// output. That is also why it exits 0 either way.
    pub print: bool,
    pub help: bool,
    pub version: bool,
    /// Everything that was not a flag, including Codex's appended JSON.
    pub positional: Vec<String>,
}

/// Why the command line could not be used.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ArgError {
    UnknownFlag(String),
    MissingValue(String),
    UnknownAgent(String),
}

impl fmt::Display for ArgError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ArgError::UnknownFlag(flag) => write!(formatter, "unknown flag: {flag}"),
            ArgError::MissingValue(flag) => write!(formatter, "{flag} needs a value"),
            ArgError::UnknownAgent(value) => {
                write!(
                    formatter,
                    "unknown agent {value:?}; expected claude or codex"
                )
            }
        }
    }
}

impl std::error::Error for ArgError {}

/// The `--help` text.
pub const USAGE: &str = "\
skyboy-hook - tell the Skyboy desktop app that a coding agent needs you

USAGE:
    skyboy-hook --agent <claude|codex> [--print] [<payload json>]

The agent's hook configuration supplies the payload:
    Claude Code  writes JSON to stdin
    Codex        appends JSON as the final argument

OPTIONS:
    --agent <name>   claude | codex
    --print          print the normalised event as JSON and send nothing.
                     For tests and debugging; never put this in an agent's
                     hook configuration.
    -h, --help       print this text
    -V, --version    print the version

EXIT STATUS:
    Always 0. This program never blocks an agent and never emits a decision.
";

/// Parse a command line, excluding the program name.
pub fn parse<I>(argv: I) -> Result<Args, ArgError>
where
    I: IntoIterator<Item = String>,
{
    let mut args = Args::default();
    let mut pending_agent = false;

    for token in argv {
        if pending_agent {
            pending_agent = false;
            args.agent = Some(
                AgentArg::from_value(&token)
                    .ok_or_else(|| ArgError::UnknownAgent(token.clone()))?,
            );
            continue;
        }

        // `--agent=codex` as well as `--agent codex`.
        if let Some(value) = token.strip_prefix("--agent=") {
            args.agent = Some(
                AgentArg::from_value(value).ok_or_else(|| ArgError::UnknownAgent(value.into()))?,
            );
            continue;
        }

        match token.as_str() {
            "--agent" => pending_agent = true,
            "--print" => args.print = true,
            "-h" | "--help" => args.help = true,
            "-V" | "--version" => args.version = true,
            // A lone `-` is stdin by convention but carries no meaning here,
            // and `--` is the conventional end-of-flags separator.
            "-" | "--" => {}
            other if other.starts_with("--") && other.len() > 2 => {
                return Err(ArgError::UnknownFlag(other.to_string()))
            }
            other => args.positional.push(other.to_string()),
        }
    }

    if pending_agent {
        return Err(ArgError::MissingValue(String::from("--agent")));
    }

    Ok(args)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse_list(values: &[&str]) -> Result<Args, ArgError> {
        parse(values.iter().map(|value| value.to_string()))
    }

    #[test]
    fn reads_the_agent_flag_in_both_forms() {
        assert_eq!(
            parse_list(&["--agent", "codex"]).expect("parsed").agent,
            Some(AgentArg::Codex)
        );
        assert_eq!(
            parse_list(&["--agent=claude"]).expect("parsed").agent,
            Some(AgentArg::ClaudeCode)
        );
    }

    #[test]
    fn accepts_the_spellings_a_human_is_likely_to_write() {
        for spelling in ["claude", "claude-code", "claude_code", "Claude"] {
            assert_eq!(
                parse_list(&["--agent", spelling]).expect("parsed").agent,
                Some(AgentArg::ClaudeCode),
                "spelling {spelling}"
            );
        }
    }

    #[test]
    fn keeps_args_it_does_not_recognise_as_positional() {
        // This is how Codex's appended payload arrives.
        let args =
            parse_list(&["--agent", "codex", r#"{"type":"agent-turn-complete"}"#]).expect("parsed");
        assert_eq!(
            args.positional,
            vec![r#"{"type":"agent-turn-complete"}"#.to_string()]
        );
    }

    #[test]
    fn the_appended_payload_survives_parsing() {
        // The payload is opaque to this parser: text inside it that looks like
        // a flag must not be treated as one.
        let payload = r#"{"type":"agent-turn-complete","cwd":"C:\\x"}"#;
        let args = parse_list(&["--agent", "codex", payload]).expect("parsed");
        assert_eq!(args.positional, vec![payload.to_string()]);
    }

    #[test]
    fn rejects_an_unknown_agent() {
        assert_eq!(
            parse_list(&["--agent", "gemini"]),
            Err(ArgError::UnknownAgent(String::from("gemini")))
        );
    }

    #[test]
    fn rejects_an_unknown_flag_and_a_missing_value() {
        assert!(matches!(
            parse_list(&["--nope"]),
            Err(ArgError::UnknownFlag(_))
        ));
        assert!(matches!(
            parse_list(&["--agent"]),
            Err(ArgError::MissingValue(_))
        ));
    }

    #[test]
    fn defaults_are_empty_and_print_is_off() {
        let args = parse_list(&[]).expect("parsed");
        assert_eq!(args.agent, None);
        assert!(!args.print);
        assert!(args.positional.is_empty());
    }

    #[test]
    fn help_and_version_are_recognised() {
        assert!(parse_list(&["--help"]).expect("parsed").help);
        assert!(parse_list(&["-h"]).expect("parsed").help);
        assert!(parse_list(&["-V"]).expect("parsed").version);
    }

    #[test]
    fn a_bare_double_dash_is_ignored_rather_than_a_flag() {
        assert!(parse_list(&["--"]).expect("parsed").positional.is_empty());
    }
}
