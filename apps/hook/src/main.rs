//! `skyboy-hook` entry point.
//!
//! Everything interesting is in the library so that it can be tested; this file
//! only wires it to a process, and enforces the two promises a hook must keep:
//! it always exits 0, and it always exits.
//!
//! Read the contract in `lib.rs` before changing anything here. In particular,
//! do not add a `println!`, do not remove the watchdog, and do not add a
//! dependency that can reach the network.

use std::process::exit;

use skyboy_hook::{args, debug, execute, Args, Outcome, WATCHDOG};

fn main() {
    // A hook is spawned on a path the user is waiting on. If anything in here
    // wedges - a pipe that never answers, a filesystem that never returns - the
    // process must still go away rather than leave the agent waiting on it.
    // This thread is never joined, and exits the process from under `main`.
    std::thread::spawn(|| {
        std::thread::sleep(WATCHDOG);
        exit(0);
    });

    // A panic message would land in the agent's transcript, which the docs say
    // surfaces hook failures to the user. Swallow it; `SKYBOY_HOOK_DEBUG` is
    // the supported way to find out what happened.
    std::panic::set_hook(Box::new(|_| {}));

    // `args_os` rather than `args`: a non-UTF-8 argument must not panic, and
    // on Windows the appended Codex payload arrives as an OS string.
    let argv: Vec<String> = std::env::args_os()
        .skip(1)
        .map(|argument| argument.to_string_lossy().into_owned())
        .collect();

    let parsed: Args = match args::parse(argv) {
        Ok(parsed) => parsed,
        Err(error) => {
            // A configuration mistake: still exit 0, but say so when asked.
            debug(format_args!("{error}"));
            exit(0);
        }
    };

    if parsed.help {
        // A human ran this by hand. `--help` is never in an agent's config,
        // which is what makes writing to stdout safe here.
        print!("{}", args::USAGE);
        exit(0);
    }

    if parsed.version {
        println!("skyboy-hook {}", env!("CARGO_PKG_VERSION"));
        exit(0);
    }

    match execute(&parsed) {
        Outcome::Printed(event) => {
            // `--print` only, which the tests and a debugging human pass. It
            // must never appear in an agent's hook configuration.
            match event.to_json_line() {
                Ok(line) => println!("{line}"),
                Err(error) => debug(format_args!("could not print the event: {error}")),
            }
        }
        Outcome::Sent(event) => debug(format_args!(
            "sent {} for {}",
            event.kind.id(),
            event.agent.id()
        )),
        Outcome::Ignored => debug(format_args!("nothing to report")),
        Outcome::Unreadable(reason) => debug(format_args!("could not read the event: {reason}")),
        Outcome::AppNotRunning(event) => debug(format_args!(
            "the app is not running; dropped a {} event",
            event.kind.id()
        )),
        Outcome::SendFailed(event, reason) => debug(format_args!(
            "could not deliver a {} event: {reason}",
            event.kind.id()
        )),
    }

    // Unconditional, and deliberately not an `ExitCode`: there is no path
    // through this program that reports failure to the agent.
    exit(0);
}
