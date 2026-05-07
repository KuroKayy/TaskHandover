mod window;
mod backup;

use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_tasks_and_events",
            sql: include_str!("../migrations/001_initial.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        // Logging plugin first — captures everything from here on into a file
        // at %APPDATA%\com.taskhandover.widget\logs\TaskHandover.log on Windows.
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:tasks.db", migrations)
                .build()
        )
        .setup(|app| {
            log::info!("setup: starting");

            let main_window = match app.get_webview_window("main") {
                Some(w) => w,
                None => {
                    log::error!("setup: main window with label 'main' not found");
                    return Ok(());
                }
            };
            log::info!("setup: main window acquired");

            if let Err(e) = window::set_no_activate(&main_window) {
                log::error!("setup: set_no_activate failed: {e}");
                // Don't return Err — we want the window to still appear even if this fails
            } else {
                log::info!("setup: set_no_activate ok");
            }

            backup::schedule_daily_backup(app.handle().clone());
            log::info!("setup: daily backup scheduled");

            log::info!("setup: complete");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
