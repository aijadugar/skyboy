//! Runs the whole sample corpus in `samples/` through the real parsers.
//!
//! The manifest is shared with `scripts/e2e/hook-to-core.mjs`, so the payload
//! an expectation is written against and the payload the end-to-end script
//! feeds through the real binary are the same file. If an expectation is
//! wrong, both fail together rather than one of them quietly passing.

use std::fs;
use std::path::PathBuf;

use serde::Deserialize;

use skyboy_protocol::event::EventKind;
use skyboy_protocol::{claude, codex, Agent};

#[derive(Debug, Deserialize)]
struct Manifest {
    version: u32,
    cases: Vec<Case>,
}

#[derive(Debug, Deserialize)]
struct Case {
    file: String,
    agent: String,
    /// `None` means "this payload must not produce an event at all".
    expected_kind: Option<String>,
    expected_session: Option<String>,
    note: String,
}

fn samples_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("samples")
}

fn load_manifest() -> Manifest {
    let path = samples_dir().join("manifest.json");
    let text = fs::read_to_string(&path)
        .unwrap_or_else(|error| panic!("could not read {}: {error}", path.display()));
    serde_json::from_str(&text)
        .unwrap_or_else(|error| panic!("could not parse {}: {error}", path.display()))
}

/// Parse a payload the way the hook binary does for that agent.
fn parse_for(agent: &str, bytes: &[u8]) -> Option<skyboy_protocol::Event> {
    match agent {
        "claude_code" => claude::parse(bytes),
        "codex" => codex::parse(bytes),
        other => panic!("manifest names an unknown agent: {other}"),
    }
    .unwrap_or_else(|error| panic!("payload failed to parse: {error}"))
}

#[test]
fn the_manifest_is_not_empty() {
    let manifest = load_manifest();
    assert_eq!(manifest.version, 1);
    assert!(
        manifest.cases.len() >= 10,
        "the corpus shrank to {} cases",
        manifest.cases.len()
    );
}

#[test]
fn every_sample_produces_the_event_the_manifest_expects() {
    let manifest = load_manifest();
    for case in &manifest.cases {
        let path = samples_dir().join(&case.file);
        let bytes = fs::read(&path)
            .unwrap_or_else(|error| panic!("could not read {}: {error}", path.display()));

        let event = parse_for(&case.agent, &bytes);

        match &case.expected_kind {
            Some(expected) => {
                let event = event.unwrap_or_else(|| {
                    panic!(
                        "{}: expected a {expected} event, got nothing ({})",
                        case.file, case.note
                    )
                });
                assert_eq!(
                    event.kind.id(),
                    expected.as_str(),
                    "{}: wrong event kind ({})",
                    case.file,
                    case.note
                );
                assert_eq!(
                    event.agent,
                    match case.agent.as_str() {
                        "claude_code" => Agent::ClaudeCode,
                        _ => Agent::Codex,
                    },
                    "{}: wrong agent",
                    case.file
                );
                if let Some(expected_session) = &case.expected_session {
                    assert_eq!(
                        &event.session_id, expected_session,
                        "{}: wrong session id",
                        case.file
                    );
                }
            }
            None => assert!(
                event.is_none(),
                "{}: expected no event, got {:?} ({})",
                case.file,
                event.map(|event| event.kind),
                case.note
            ),
        }
    }
}

#[test]
fn every_sample_reaches_the_app_as_a_valid_event() {
    // What the hook sends is JSON, and the app parses it back. Round-tripping
    // every sample proves the two halves of the protocol agree on all of them,
    // not just on the one hand-written example in the unit tests.
    let manifest = load_manifest();
    for case in &manifest.cases {
        let path = samples_dir().join(&case.file);
        let bytes = fs::read(&path).expect("read sample");
        let Some(event) = parse_for(&case.agent, &bytes) else {
            continue;
        };
        let wire = serde_json::to_vec(&event).expect("serialise");
        let received = skyboy_protocol::event::parse(&wire)
            .unwrap_or_else(|error| panic!("{}: wire form rejected: {error}", case.file));
        assert_eq!(received, event.sanitised(), "{}: round trip", case.file);
    }
}

#[test]
fn every_manifest_entry_names_a_file_that_exists() {
    // A typo in the manifest would otherwise silently reduce coverage.
    let manifest = load_manifest();
    for case in &manifest.cases {
        let path = samples_dir().join(&case.file);
        assert!(path.is_file(), "{} does not exist", path.display());
    }
}

#[test]
fn the_corpus_covers_all_four_event_kinds_and_both_agents() {
    let manifest = load_manifest();
    let kinds: std::collections::HashSet<&str> = manifest
        .cases
        .iter()
        .filter_map(|case| case.expected_kind.as_deref())
        .collect();
    for kind in EventKind::all() {
        assert!(
            kinds.contains(kind.id()),
            "no sample produces a {} event",
            kind.id()
        );
    }
    let agents: std::collections::HashSet<&str> = manifest
        .cases
        .iter()
        .map(|case| case.agent.as_str())
        .collect();
    assert!(agents.contains("claude_code"));
    assert!(agents.contains("codex"));
}
