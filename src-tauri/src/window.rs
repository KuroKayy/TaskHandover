// Stub: real implementation comes from Pre-Spike Step 0.5 (Windows-only Win32 code).
// On macOS this is a no-op so the project compiles for testing.
pub fn set_no_activate(_window: &tauri::WebviewWindow) -> tauri::Result<()> {
    Ok(())
}
