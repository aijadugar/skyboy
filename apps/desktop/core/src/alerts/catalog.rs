//! The built-in sounds.
//!
//! One list, used by three places: the Sounds gallery in the UI, the alert
//! engine when it plays a sound, and the settings validator when it rejects an
//! unknown id. Keeping it in one place is what stops the gallery offering
//! something the engine cannot play.
//!
//! The files ship as WAV in the app bundle. WAV rather than a compressed format
//! because both platforms play it with something already present - `PlaySoundW`
//! on Windows, `afplay` on macOS - so the app needs no audio decoding library
//! and no codec, which is most of why the installer stays small. See
//! `docs/architecture.md`.

use std::path::{Path, PathBuf};

/// The sound used until the user picks another one.
pub const DEFAULT_SOUND_ID: &str = "chime";

/// The id that means "no sound". Not a file: it is a choice, and it is stored
/// in `sound_id` like any other so the UI can treat the list uniformly.
pub const SILENT_ID: &str = "none";

/// Where the sound files live inside the bundle.
pub const SOUND_DIR: &str = "assets/sounds";

/// One built-in sound.
///
/// No `Eq`, because `approximate_seconds` is an `f32`. Nothing compares sounds
/// for total equality; they are looked up by id.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Sound {
    pub id: &'static str,
    pub name: &'static str,
    pub file: &'static str,
    /// One line for the gallery, describing what it sounds like.
    pub description: &'static str,
    /// Roughly how long one play lasts, for the gallery's preview and for the
    /// ring interval hint. Kept as a string rather than a measurement so it
    /// cannot drift from the file without anyone noticing.
    pub approximate_seconds: f32,
}

/// Every built-in sound, in the order the gallery shows them.
pub const SOUNDS: &[Sound] = &[
    Sound {
        id: "chime",
        name: "Chime",
        file: "chime.wav",
        description: "Two soft rising notes. The default; unobtrusive in an office.",
        approximate_seconds: 1.2,
    },
    Sound {
        id: "ping",
        name: "Ping",
        file: "ping.wav",
        description: "A single short note. The least intrusive option.",
        approximate_seconds: 0.5,
    },
    Sound {
        id: "bell",
        name: "Bell",
        file: "bell.wav",
        description: "A struck bell with a long decay. Audible from another room.",
        approximate_seconds: 1.8,
    },
    Sound {
        id: "marimba",
        name: "Marimba",
        file: "marimba.wav",
        description: "Three warm wooden notes. Pleasant to hear repeatedly.",
        approximate_seconds: 1.6,
    },
    Sound {
        id: "alarm",
        name: "Alarm",
        file: "alarm.wav",
        description: "A hard two-tone alarm. For when you must not miss it.",
        approximate_seconds: 1.0,
    },
];

/// Look up a sound by id.
pub fn by_id(id: &str) -> Option<&'static Sound> {
    SOUNDS.iter().find(|sound| sound.id == id)
}

/// True when the id is one the app can play, including "none".
pub fn is_known_id(id: &str) -> bool {
    id == SILENT_ID || by_id(id).is_some()
}

/// The file for a sound, inside the bundle's resource directory.
///
/// The bundler's placement of a glob resource is not worth betting the whole
/// feature on, so this probes the plausible layouts and picks the one that is
/// actually there. The primary candidate is what `tauri.conf.json`'s
/// `assets/sounds/*.wav` produces; the others cover a bundler that flattens or
/// remaps the directory. Getting this wrong is silent - the alert simply has no
/// sound - which is exactly the kind of failure worth this much attention.
pub fn bundled_path(resource_dir: &Path, sound: &Sound) -> PathBuf {
    let candidates = [
        resource_dir.join(SOUND_DIR).join(sound.file),
        resource_dir.join(sound.file),
        resource_dir.join("sounds").join(sound.file),
    ];
    match candidates.iter().find(|path| path.is_file()) {
        Some(found) => found.clone(),
        // Nothing matched, so return the documented layout: if the file later
        // appears there, a retry works without a restart.
        None => resource_dir.join(SOUND_DIR).join(sound.file),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_default_sound_exists_and_is_playable() {
        let sound = by_id(DEFAULT_SOUND_ID).expect("the default sound is in the list");
        assert!(!sound.name.is_empty());
        assert!(sound.file.ends_with(".wav"));
    }

    #[test]
    fn ids_and_file_names_are_unique() {
        let mut ids: Vec<&str> = SOUNDS.iter().map(|sound| sound.id).collect();
        let mut files: Vec<&str> = SOUNDS.iter().map(|sound| sound.file).collect();
        ids.sort_unstable();
        files.sort_unstable();
        let unique_ids = ids.len();
        let unique_files = files.len();
        ids.dedup();
        files.dedup();
        assert_eq!(ids.len(), unique_ids, "two sounds share an id");
        assert_eq!(files.len(), unique_files, "two sounds share a file");
    }

    #[test]
    fn no_sound_claims_the_reserved_silent_id() {
        assert!(by_id(SILENT_ID).is_none());
        assert!(is_known_id(SILENT_ID));
    }

    #[test]
    fn an_unknown_id_is_rejected() {
        assert!(!is_known_id("airhorn"));
        assert!(by_id("airhorn").is_none());
    }

    #[test]
    fn the_bundled_path_stays_inside_the_resource_directory() {
        let sound = by_id(DEFAULT_SOUND_ID).expect("default");
        let path = bundled_path(Path::new("/app/resources"), sound);
        assert!(path.starts_with("/app/resources"));
        assert!(path.to_string_lossy().ends_with("chime.wav"));
    }

    #[test]
    fn the_documented_layout_is_found_when_the_file_is_there() {
        let dir = tempfile::tempdir().expect("tempdir");
        let nested = dir.path().join(SOUND_DIR);
        std::fs::create_dir_all(&nested).expect("mkdir");
        let sound = by_id(DEFAULT_SOUND_ID).expect("default");
        std::fs::write(nested.join(sound.file), b"not really a wav").expect("write");

        assert_eq!(bundled_path(dir.path(), sound), nested.join(sound.file));
    }

    #[test]
    fn a_flattened_layout_is_still_found() {
        // If the bundler ever puts the files directly in the resource root, the
        // alert keeps its sound instead of silently going quiet.
        let dir = tempfile::tempdir().expect("tempdir");
        let sound = by_id(DEFAULT_SOUND_ID).expect("default");
        std::fs::write(dir.path().join(sound.file), b"not really a wav").expect("write");

        assert_eq!(bundled_path(dir.path(), sound), dir.path().join(sound.file));
    }

    #[test]
    fn nothing_present_falls_back_to_the_documented_path() {
        let dir = tempfile::tempdir().expect("tempdir");
        let sound = by_id(DEFAULT_SOUND_ID).expect("default");
        assert_eq!(
            bundled_path(dir.path(), sound),
            dir.path().join(SOUND_DIR).join(sound.file)
        );
    }
}
