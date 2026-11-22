//! Playing a sound, and ringing it again on an interval.
//!
//! # Why a thread rather than an audio library
//!
//! Both platforms already have something that plays a WAV file: `PlaySoundW` on
//! Windows and `/usr/bin/afplay` on macOS. Using them means no audio decoding
//! dependency, no codec, no device enumeration and no `cpal`, which is a large
//! part of why the installer is small and why the app has no audio device
//! permissions to ask for.
//!
//! The cost is that stopping a sound is coarse: `PlaySoundW` with `SND_SYNC`
//! blocks its thread until the file ends, so "stop" is honoured between plays
//! rather than mid-note. At well under two seconds a play, that is not worth
//! an audio stack.
//!
//! # Why a worker thread rather than one thread per alert
//!
//! A repeating ring owns the speaker. If a second alert started its own player
//! the two would overlap, which sounds like a fault. One worker with a command
//! channel means a new alert replaces the ring in progress, which is the
//! behaviour a user expects: the newest thing that needs you wins.

use std::path::{Path, PathBuf};
use std::sync::mpsc::{self, Receiver, RecvTimeoutError, Sender};
use std::time::Duration;

/// One sound, played `plays` times, `interval` apart.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Ring {
    pub path: PathBuf,
    /// Total plays including the first. Comes from
    /// [`crate::store::RingSettings::play_count`], which is where the bound is
    /// enforced.
    pub plays: u32,
    pub interval: Duration,
}

/// Play a WAV file, blocking until it finishes.
///
/// The one `unsafe` block in the Skyboy core, and the reason the crate uses
/// `deny(unsafe_code)` rather than `forbid`. `PlaySoundW` is a plain C function
/// taking a NUL-terminated string and three flags; the alternative is an audio
/// decoding stack the installer would have to carry. See
/// `docs/architecture.md`.
#[cfg(windows)]
#[allow(unsafe_code)]
pub fn play_file(path: &Path) -> std::io::Result<()> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Media::Audio::{PlaySoundW, SND_FILENAME, SND_NODEFAULT, SND_SYNC};

    let wide: Vec<u16> = path
        .as_os_str()
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    // SAFETY: `wide` is NUL-terminated and outlives the call. With SND_SYNC the
    // sound is played before returning, so the buffer is not retained by the
    // system. `hmod` is unused when SND_FILENAME is set, and null is the
    // documented value for it.
    let played = unsafe {
        PlaySoundW(
            wide.as_ptr(),
            std::ptr::null_mut(),
            SND_FILENAME | SND_SYNC | SND_NODEFAULT,
        )
    };

    if played == 0 {
        Err(std::io::Error::last_os_error())
    } else {
        Ok(())
    }
}

/// Play a WAV file, blocking until it finishes.
#[cfg(not(windows))]
pub fn play_file(path: &Path) -> std::io::Result<()> {
    // `afplay` ships with macOS and blocks until the file has played, which is
    // exactly the contract this function needs. It is addressed by absolute
    // path rather than by name so that PATH cannot redirect it.
    let status = std::process::Command::new("/usr/bin/afplay")
        .arg(path)
        .status()?;
    if status.success() {
        Ok(())
    } else {
        Err(std::io::Error::other(format!(
            "afplay exited with {status}"
        )))
    }
}

enum Command {
    Play(Ring),
    Stop,
}

/// The handle the rest of the app holds. Dropping it stops the worker.
pub struct SoundPlayer {
    sender: Sender<Command>,
}

impl Default for SoundPlayer {
    fn default() -> Self {
        SoundPlayer::spawn()
    }
}

impl SoundPlayer {
    /// Start the worker thread.
    pub fn spawn() -> SoundPlayer {
        SoundPlayer::spawn_with(play_file)
    }

    /// Start the worker thread with a different player, for the tests.
    pub fn spawn_with<F>(play: F) -> SoundPlayer
    where
        F: Fn(&Path) -> std::io::Result<()> + Send + 'static,
    {
        let (sender, receiver) = mpsc::channel();
        std::thread::Builder::new()
            .name(String::from("skyboy-sound"))
            .spawn(move || run(receiver, play))
            // If the thread cannot start there is no audio, which is a
            // degraded app rather than a broken one: the desktop notification
            // still fires. Returning a player whose sends go nowhere keeps the
            // caller free of the distinction.
            .ok();
        SoundPlayer { sender }
    }

    /// Replace whatever is playing with this ring.
    pub fn ring(&self, ring: Ring) {
        let _ = self.sender.send(Command::Play(ring));
    }

    /// Stop ringing.
    pub fn stop(&self) {
        let _ = self.sender.send(Command::Stop);
    }
}

/// The worker loop.
///
/// Kept free of platform calls so the schedule and the cancellation behaviour
/// can be tested with a recording closure.
fn run<F>(receiver: Receiver<Command>, play: F)
where
    F: Fn(&Path) -> std::io::Result<()>,
{
    let mut pending: Option<Ring> = None;
    loop {
        let ring = match pending.take() {
            Some(ring) => ring,
            None => match receiver.recv() {
                Ok(Command::Play(ring)) => ring,
                Ok(Command::Stop) => continue,
                // The player was dropped: the app is shutting down.
                Err(_) => return,
            },
        };

        // The last `plays` value wins if a new ring arrives mid-schedule.
        let mut replaced_by: Option<Ring> = None;
        for index in 0..ring.plays {
            if index > 0 {
                match receiver.recv_timeout(ring.interval) {
                    Ok(Command::Play(newer)) => {
                        replaced_by = Some(newer);
                        break;
                    }
                    Ok(Command::Stop) => break,
                    Err(RecvTimeoutError::Timeout) => {}
                    Err(RecvTimeoutError::Disconnected) => return,
                }
            }

            // A sound that will not play is worth one line in the log and
            // nothing else: the desktop notification has already fired, and
            // failing the alert over a missing WAV would be worse than a quiet
            // one.
            if let Err(error) = play(&ring.path) {
                crate::logging::warn(format_args!(
                    "could not play {}: {error}",
                    ring.path.display()
                ));
            }

            // Check between plays so a stop is honoured promptly rather than
            // after the whole schedule.
            match receiver.try_recv() {
                Ok(Command::Stop) => break,
                Ok(Command::Play(newer)) => {
                    replaced_by = Some(newer);
                    break;
                }
                Err(_) => {}
            }
        }
        pending = replaced_by;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::Arc;
    use std::time::Instant;

    /// A player that counts calls instead of making noise.
    fn counting_player() -> (
        Arc<AtomicUsize>,
        impl Fn(&Path) -> std::io::Result<()> + Send + 'static,
    ) {
        let count = Arc::new(AtomicUsize::new(0));
        let handle = Arc::clone(&count);
        (count, move |_path: &Path| {
            handle.fetch_add(1, Ordering::SeqCst);
            Ok(())
        })
    }

    #[test]
    fn a_ring_plays_the_requested_number_of_times() {
        let (count, play) = counting_player();
        let player = SoundPlayer::spawn_with(play);
        player.ring(Ring {
            path: PathBuf::from("chime.wav"),
            plays: 3,
            interval: Duration::from_millis(10),
        });
        // Wait for the schedule to finish, with room for a slow runner.
        let deadline = Instant::now() + Duration::from_secs(5);
        while count.load(Ordering::SeqCst) < 3 && Instant::now() < deadline {
            std::thread::sleep(Duration::from_millis(5));
        }
        assert_eq!(count.load(Ordering::SeqCst), 3);
    }

    #[test]
    fn stop_ends_the_ring_early() {
        let (count, play) = counting_player();
        let player = SoundPlayer::spawn_with(play);
        player.ring(Ring {
            path: PathBuf::from("alarm.wav"),
            plays: 100,
            interval: Duration::from_millis(20),
        });
        // Let it start, then stop it.
        let deadline = Instant::now() + Duration::from_secs(5);
        while count.load(Ordering::SeqCst) < 1 && Instant::now() < deadline {
            std::thread::sleep(Duration::from_millis(2));
        }
        player.stop();
        std::thread::sleep(Duration::from_millis(150));
        let after_stop = count.load(Ordering::SeqCst);
        std::thread::sleep(Duration::from_millis(150));
        assert_eq!(
            count.load(Ordering::SeqCst),
            after_stop,
            "the ring kept playing after stop"
        );
        assert!(after_stop < 100, "the ring ran to completion");
    }

    #[test]
    fn a_newer_ring_replaces_the_one_in_progress() {
        let (count, play) = counting_player();
        let player = SoundPlayer::spawn_with(play);
        player.ring(Ring {
            path: PathBuf::from("chime.wav"),
            plays: 50,
            interval: Duration::from_millis(40),
        });
        std::thread::sleep(Duration::from_millis(30));
        player.ring(Ring {
            path: PathBuf::from("ping.wav"),
            plays: 1,
            interval: Duration::from_millis(40),
        });
        // Long enough for the first ring to have played many times if it had
        // not been replaced.
        std::thread::sleep(Duration::from_millis(300));
        let total = count.load(Ordering::SeqCst);
        assert!(total <= 4, "the replaced ring kept playing ({total} plays)");
    }

    #[test]
    fn dropping_the_player_ends_the_worker() {
        let (count, play) = counting_player();
        {
            let player = SoundPlayer::spawn_with(play);
            player.ring(Ring {
                path: PathBuf::from("chime.wav"),
                plays: 2,
                interval: Duration::from_millis(5),
            });
            std::thread::sleep(Duration::from_millis(100));
        }
        // No assertion on the count: the point is that nothing panics and the
        // worker exits rather than blocking the process from ending.
        assert!(count.load(Ordering::SeqCst) >= 1);
    }
}
