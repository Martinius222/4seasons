use tauri::{command, AppHandle, Manager};
use serde::{Deserialize, Serialize};
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

#[derive(Debug, Serialize, Deserialize)]
struct SeasonalityResult {
    success: bool,
    message: Option<String>,
    rows_added: Option<i32>,
    last_date: Option<String>,
    avg_2yr: Option<Vec<Option<f64>>>,
    avg_5yr: Option<Vec<Option<f64>>>,
    avg_6yr: Option<Vec<Option<f64>>>,
    avg_10yr: Option<Vec<Option<f64>>>,
    actual: Option<Vec<Option<f64>>>,
    target_year: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
struct COTResult {
    success: bool,
    message: Option<String>,
    rows_added: Option<i32>,
    last_date: Option<String>,
    dates: Option<Vec<String>>,
    open_interest: Option<Vec<Option<f64>>>,
    noncomm_net: Option<Vec<Option<f64>>>,
    comm_net: Option<Vec<Option<f64>>>,
    noncomm_long: Option<Vec<Option<f64>>>,
    noncomm_short: Option<Vec<Option<f64>>>,
    comm_long: Option<Vec<Option<f64>>>,
    comm_short: Option<Vec<Option<f64>>>,
    noncomm_net_change: Option<Vec<Option<f64>>>,
    comm_net_change: Option<Vec<Option<f64>>>,
    oi_change: Option<Vec<Option<f64>>>,
}

// Get the app data directory path
#[command]
async fn get_app_data_dir(app: AppHandle) -> Result<String, String> {
    let data_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    // Create directory if it doesn't exist
    std::fs::create_dir_all(&data_dir)
        .map_err(|e| format!("Failed to create app data dir: {}", e))?;

    Ok(data_dir.to_string_lossy().to_string())
}

// Fetch data using the Python sidecar
#[command]
async fn fetch_data(
    app: AppHandle,
    symbol: String,
    file_path: String,
) -> Result<SeasonalityResult, String> {
    // Create parent directory if it doesn't exist
    let path = std::path::Path::new(&file_path);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create data directory: {}", e))?;
    }

    let sidecar_command = app.shell().sidecar("seasonality")
        .map_err(|e| format!("Failed to create sidecar command: {}", e))?
        .args(&["fetch", "--symbol", &symbol, "--file", &file_path]);

    let (mut rx, _child) = sidecar_command.spawn()
        .map_err(|e| format!("Failed to spawn sidecar: {}", e))?;

    let mut output = String::new();
    let mut stderr_output = String::new();
    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line) => {
                output.push_str(&String::from_utf8_lossy(&line));
            }
            CommandEvent::Stderr(line) => {
                stderr_output.push_str(&String::from_utf8_lossy(&line));
            }
            _ => {}
        }
    }

    if !stderr_output.is_empty() {
        eprintln!("Python stderr: {}", stderr_output);
    }

    serde_json::from_str(&output.trim())
        .map_err(|e| format!("Failed to parse JSON: {} (output length: {}, stderr: {})", e, output.len(), stderr_output))
}

// Calculate seasonality metrics using the Python sidecar
#[command]
async fn calculate_seasonality(
    app: AppHandle,
    file_path: String,
    year: i32,
) -> Result<SeasonalityResult, String> {
    let sidecar_command = app.shell().sidecar("seasonality")
        .map_err(|e| format!("Failed to create sidecar command: {}", e))?
        .args(&["calculate", "--file", &file_path, "--year", &year.to_string()]);

    let (mut rx, _child) = sidecar_command.spawn()
        .map_err(|e| format!("Failed to spawn sidecar: {}", e))?;

    let mut output = String::new();
    let mut stderr_output = String::new();
    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line) => {
                output.push_str(&String::from_utf8_lossy(&line));
            }
            CommandEvent::Stderr(line) => {
                stderr_output.push_str(&String::from_utf8_lossy(&line));
            }
            _ => {}
        }
    }

    if !stderr_output.is_empty() {
        eprintln!("Python stderr: {}", stderr_output);
    }

    // Debug: save output to file for inspection
    if output.len() > 20000 {
        std::fs::write("/tmp/tauri_calculate_output.txt", &output)
            .unwrap_or_else(|e| eprintln!("Failed to write debug file: {}", e));
    }

    serde_json::from_str(&output.trim())
        .map_err(|e| format!("Failed to parse JSON: {} (output length: {}, stderr: {})", e, output.len(), stderr_output))
}

// Fetch COT data using the Python sidecar
#[command]
async fn fetch_cot_data(
    app: AppHandle,
    symbol: String,
    file_path: String,
) -> Result<COTResult, String> {
    // Create parent directory if it doesn't exist
    let path = std::path::Path::new(&file_path);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create data directory: {}", e))?;
    }

    let sidecar_command = app.shell().sidecar("cot_data")
        .map_err(|e| format!("Failed to create sidecar command: {}", e))?
        .args(&["fetch", "--symbol", &symbol, "--file", &file_path]);

    let (mut rx, _child) = sidecar_command.spawn()
        .map_err(|e| format!("Failed to spawn sidecar: {}", e))?;

    let mut output = String::new();
    let mut stderr_output = String::new();
    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line) => {
                output.push_str(&String::from_utf8_lossy(&line));
            }
            CommandEvent::Stderr(line) => {
                stderr_output.push_str(&String::from_utf8_lossy(&line));
            }
            _ => {}
        }
    }

    if !stderr_output.is_empty() {
        eprintln!("Python stderr: {}", stderr_output);
    }

    serde_json::from_str(&output.trim())
        .map_err(|e| format!("Failed to parse JSON: {} (stderr: {})", e, stderr_output))
}

// Calculate COT metrics using the Python sidecar
#[command]
async fn calculate_cot_metrics(
    app: AppHandle,
    file_path: String,
    years: i32,
) -> Result<COTResult, String> {
    let sidecar_command = app.shell().sidecar("cot_data")
        .map_err(|e| format!("Failed to create sidecar command: {}", e))?
        .args(&["calculate", "--file", &file_path, "--years", &years.to_string()]);

    let (mut rx, _child) = sidecar_command.spawn()
        .map_err(|e| format!("Failed to spawn sidecar: {}", e))?;

    let mut output = String::new();
    let mut stderr_output = String::new();
    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line) => {
                output.push_str(&String::from_utf8_lossy(&line));
            }
            CommandEvent::Stderr(line) => {
                stderr_output.push_str(&String::from_utf8_lossy(&line));
            }
            _ => {}
        }
    }

    if !stderr_output.is_empty() {
        eprintln!("Python stderr: {}", stderr_output);
    }

    serde_json::from_str(&output.trim())
        .map_err(|e| format!("Failed to parse JSON: {} (stderr: {})", e, stderr_output))
}

// Read inventory file
#[command]
async fn read_inventory(app: AppHandle) -> Result<String, String> {
    let data_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let inventory_path = data_dir.join("inventory.json");

    if !inventory_path.exists() {
        // Return default inventory
        return Ok(r#"{"assets":[]}"#.to_string());
    }

    std::fs::read_to_string(&inventory_path)
        .map_err(|e| format!("Failed to read inventory: {}", e))
}

// Write inventory file
#[command]
async fn write_inventory(app: AppHandle, content: String) -> Result<(), String> {
    let data_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    std::fs::create_dir_all(&data_dir)
        .map_err(|e| format!("Failed to create app data dir: {}", e))?;

    let inventory_path = data_dir.join("inventory.json");

    std::fs::write(&inventory_path, content)
        .map_err(|e| format!("Failed to write inventory: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
        get_app_data_dir,
        fetch_data,
        calculate_seasonality,
        fetch_cot_data,
        calculate_cot_metrics,
        read_inventory,
        write_inventory
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
