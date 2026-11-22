// Prevents an extra console window on Windows in release builds.
//
// This is not cosmetic: a tray-only app that flashes a console window when it
// starts looks broken, and the window would be visible in Task Manager as a
// second entry.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    skyboy_core::run()
}
