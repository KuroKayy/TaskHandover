mod window;
mod backup;
mod diag;

use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Desktop diagnostic log — first thing we do, before anything can fail.
    diag::reset();
    diag::log("=== TaskHandover 启动 ===");
    diag::log(&format!("os={} version=0.1.0", std::env::consts::OS));

    // Panic hook: any panic (even an abort) writes to the desktop log first.
    std::panic::set_hook(Box::new(|info| {
        diag::log(&format!("!!! 程序崩溃 (panic): {info}"));
    }));

    let migrations = vec![Migration {
        version: 1,
        description: "create_tasks_and_events",
        sql: include_str!("../migrations/001_initial.sql"),
        kind: MigrationKind::Up,
    }];
    diag::log("数据库迁移定义完成");

    diag::log("开始构建 Tauri 应用");
    let build_result = tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:tasks.db", migrations)
                .build(),
        )
        .setup(|app| {
            diag::log("setup: 开始");
            match app.get_webview_window("main") {
                Some(w) => {
                    diag::log("setup: 主窗口已获取");
                    if let Err(e) = window::set_no_activate(&w) {
                        diag::log(&format!("setup: set_no_activate 失败(非致命): {e}"));
                    } else {
                        diag::log("setup: set_no_activate 完成");
                    }
                }
                None => diag::log("setup: 错误 — 找不到 label=main 的窗口"),
            }
            backup::schedule_daily_backup(app.handle().clone());
            diag::log("setup: 每日备份线程已启动");
            diag::log("setup: 完成");
            Ok(())
        })
        .build(tauri::generate_context!());

    match build_result {
        Ok(app) => {
            diag::log("Tauri 应用构建成功，进入事件循环（窗口应已显示）");
            app.run(|_handle, _event| {});
            diag::log("应用正常退出");
        }
        Err(e) => {
            diag::log(&format!("!!! Tauri 应用构建失败: {e}"));
        }
    }
}
