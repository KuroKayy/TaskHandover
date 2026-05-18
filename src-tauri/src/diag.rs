// Diagnostic logging straight to the user's Desktop.
//
// A non-technical user can't be expected to dig through %APPDATA% for a log
// file. This writes `TaskHandover-启动日志.txt` to the Desktop and flushes
// every line immediately, so even a hard crash (process abort) leaves a
// complete trail the user can just attach.

use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;

/// Path to the desktop log file. Falls back to the working directory if no
/// home directory is found (should never happen on a normal Windows/macOS box).
pub fn log_path() -> PathBuf {
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_else(|_| String::from("."));
    PathBuf::from(home)
        .join("Desktop")
        .join("TaskHandover-启动日志.txt")
}

/// Append one timestamped line to the desktop log, flushed immediately.
pub fn log(msg: &str) {
    let ts = chrono::Local::now().format("%Y-%m-%d %H:%M:%S");
    let line = format!("[{ts}] {msg}\n");
    if let Ok(mut f) = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path())
    {
        let _ = f.write_all(line.as_bytes());
        let _ = f.flush();
    }
}

/// Truncate the log so each launch starts with a clean file.
pub fn reset() {
    let _ = std::fs::write(log_path(), b"");
}
