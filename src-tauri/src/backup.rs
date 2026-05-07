use chrono::{Local, NaiveTime, Timelike};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use tokio::time::{sleep, Duration};

pub fn schedule_daily_backup(app: AppHandle) {
    tokio::spawn(async move {
        loop {
            let now = Local::now();
            let target = NaiveTime::from_hms_opt(18, 0, 0).unwrap();
            let now_time = now.time();
            let wait_secs = if now_time < target {
                (target.num_seconds_from_midnight() - now_time.num_seconds_from_midnight()) as u64
            } else {
                (24 * 3600) - (now_time.num_seconds_from_midnight() - target.num_seconds_from_midnight()) as u64
            };
            sleep(Duration::from_secs(wait_secs)).await;
            if let Err(e) = run_backup(&app).await {
                eprintln!("backup failed: {e}");
            }
        }
    });
}

async fn run_backup(app: &AppHandle) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let app_data_dir: PathBuf = app.path().app_data_dir()?;
    let db_path = app_data_dir.join("tasks.db");
    if !db_path.exists() { return Ok(()); }

    let date = Local::now().format("%Y-%m-%d").to_string();
    let backup_dir = app_data_dir.join("backups").join(&date);
    tokio::fs::create_dir_all(&backup_dir).await?;
    let dest = backup_dir.join("tasks.db.bak");
    tokio::fs::copy(&db_path, &dest).await?;
    Ok(())
}
