use chrono::{Local, NaiveTime, Timelike};
use std::path::PathBuf;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Manager};

/// Spawns a background OS thread that copies the SQLite DB to a daily backup
/// folder at 18:00 local time, every day.
///
/// Why std::thread instead of tokio: Tauri 2 does NOT install a tokio runtime
/// in the main thread by default — it uses wry/tao for the event loop. Calling
/// `tokio::spawn` from `setup()` panics with "there is no reactor running".
/// A sleeping OS thread costs ~8KB; we don't need async for one file copy/day.
pub fn schedule_daily_backup(app: AppHandle) {
    thread::spawn(move || loop {
        let now = Local::now();
        let target = NaiveTime::from_hms_opt(18, 0, 0).unwrap();
        let now_time = now.time();
        let wait_secs = if now_time < target {
            (target.num_seconds_from_midnight() - now_time.num_seconds_from_midnight()) as u64
        } else {
            (24 * 3600) - (now_time.num_seconds_from_midnight() - target.num_seconds_from_midnight()) as u64
        };
        thread::sleep(Duration::from_secs(wait_secs));
        if let Err(e) = run_backup(&app) {
            log::error!("backup failed: {e}");
        } else {
            log::info!("daily backup completed");
        }
    });
}

fn run_backup(app: &AppHandle) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let app_data_dir: PathBuf = app.path().app_data_dir()?;
    let db_path = app_data_dir.join("tasks.db");
    if !db_path.exists() {
        return Ok(());
    }

    let date = Local::now().format("%Y-%m-%d").to_string();
    let backup_dir = app_data_dir.join("backups").join(&date);
    std::fs::create_dir_all(&backup_dir)?;
    let dest = backup_dir.join("tasks.db.bak");
    std::fs::copy(&db_path, &dest)?;
    Ok(())
}
