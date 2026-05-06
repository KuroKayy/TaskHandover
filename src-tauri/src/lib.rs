mod window;
mod backup;

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
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:tasks.db", migrations)
                .build()
        )
        .plugin(tauri_plugin_tray_icon::init())
        .setup(|app| {
            let main_window = tauri::Manager::get_webview_window(app, "main").unwrap();
            window::set_no_activate(&main_window)?;
            backup::schedule_daily_backup(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
