// DEBUG BUILD: console subsystem so panics are visible when launched from cmd.
// TODO: restore `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]`
// once we know the app starts cleanly on Windows.
fn main() {
    task_handover_lib::run();
}
