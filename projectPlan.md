# Project Specification: Commodity Seasonality Desktop App

## 1. Executive Summary
The goal is to build a cross-platform desktop application (Windows/Mac/Linux) that visualizes seasonal price trends for commodities, currencies, and cryptocurrencies. 

The app will allow traders to:
1.  **Maintain a local database** of daily price history (CSV format) for various assets.
2.  **Update data automatically** using free sources (Yahoo Finance).
3.  **Visualize Seasonal Trends:** Overlay the current year's price action against the average price movement of the last 2, 5, and 10 years.
4.  **Backtest:** Select any historical year to see how seasonal projections would have looked at that specific time in the past.

## 2. Technology Stack
* **Frontend:** React, Tailwind CSS, Recharts.
* **Application Framework:** Tauri (Rust).
* **Data Processing Engine:** Python (compiled via PyInstaller).
    * **Libraries:** `pandas`, `numpy`, `yfinance`.
* **Data Storage:** Local File System (JSON config + CSV data files).

---

## 3. System Architecture

### 3.1 The "Sidecar" Pattern
The application uses the **Tauri Sidecar** pattern to offload heavy data processing and network fetching to a standalone Python executable.
1.  **React UI** sends a command (e.g., "Analyze Gold for 2023").
2.  **Tauri** spawns the Python binary with arguments.
3.  **Python** reads the local CSV, processes the data, and prints JSON to `stdout`.
4.  **Tauri** captures the JSON and sends it back to the React UI for rendering.

### 3.2 File Structure & Persistence
Data must be persistent and survive application restarts.
* **Location:** The OS-specific "App Data" directory (e.g., `%AppData%` on Windows).
* **Directory Structure:**
    ```text
    /AppData/Local/com.seasonality.app/
    ├── inventory.json         # Config file listing tracked assets
    └── data/                  # Folder containing historical data
        ├── gold_daily.csv
        ├── oil_daily.csv
        └── btc_daily.csv
    ```

---

## 4. Functional Requirements

### 4.1 Data Management Module (Python)
**Objective:** Create and maintain a local history of daily OHLC (Open, High, Low, Close) prices.

* **Input:** Asset Symbol (Yahoo Finance format, e.g., `GC=F`, `BTC-USD`) and Target File Path.
* **Logic:**
    1.  Check if the target CSV file exists.
    2.  If it exists: Read the last date recorded. Set `fetch_start_date = last_date + 1 day`.
    3.  If it does not exist: Set `fetch_start_date = "2000-01-01"`.
    4.  Fetch daily data from Yahoo Finance using `yfinance` library.
    5.  **Append** new rows to the existing CSV (do not overwrite history).
    6.  Save the file.

### 4.2 Seasonality Calculation Engine (Python)
**Objective:** Generate normalized percentage-change indices for visualization.

* **Input:** File Path (CSV) and Target Year (Integer).
* **Logic:**
    1.  **Filter:** Load data. Isolate the "Historical Window" (all data strictly *before* Jan 1 of the Target Year).
    2.  **Period Grouping:** Create three subsets based on the Historical Window:
        * Last 2 Years.
        * Last 5 Years.
        * Last 10 Years.
    3.  **Normalization (Crucial):**
        * For every individual year in a subset, calculate the cumulative percentage change starting from `Day 1 = 0%`.
        * *Formula:* `(Price_Day_N / Price_Day_1) - 1`.
    4.  **Averaging:**
        * Group all normalized years by `Day of Year` (1-365).
        * Calculate the Mean % Change for each day.
    5.  **Target Year Data:**
        * Extract the actual movement of the Target Year (if available) normalized to its own start.
* **Output:** JSON object.
    ```json
    {
      "avg_2yr": [0.0, 0.15, 0.12, ...], // Array of 365 floats
      "avg_5yr": [...],
      "avg_10yr": [...],
      "actual": [...]
    }
    ```

### 4.3 User Interface (Frontend)
**Objective:** Clean, interactive dashboard.

* **Asset Selector:**
    * Dropdown or Sidebar listing assets defined in `inventory.json`.
    * Status Indicator: Show if local data is "Available" or "Missing/Empty".
    * **Action:** "Update/Download" button to trigger the Python fetcher.
* **Year Selector (Backtesting):**
    * Dropdown to select the "Analysis Year" (Defaults to Current Year).
    * Changing this triggers a re-calculation.
* **Main Chart:**
    * **Library:** Recharts.
    * **X-Axis:** Jan - Dec.
    * **Y-Axis:** Percentage (%).
    * **Visuals:**
        * `Target Year`: Bold, distinct color (e.g., Red).
        * `10-Year Avg`: Dotted or light color (Baseline).
        * `5-Year Avg`: Solid line (Primary Trend).
        * `2-Year Avg`: Dashed line (Recent Momentum).
    * **Tooltip:** Hovering shows the exact % values for all lines on that specific day.

---

## 5. Development Roadmap

### Phase 1: Python Backend
1.  Create `seasonality.py`.
2.  Implement `fetch_data(symbol, file)` using `yfinance`.
3.  Implement `calculate_metrics(file, year)` using `pandas`.
4.  Implement `main` entry point to handle CLI arguments (e.g., `seasonality.exe calculate --file "gold.csv" --year 2023`).
5.  Compile using `pyinstaller --onefile`.

### Phase 2: Tauri Core
1.  Initialize Tauri project.
2.  Configure `tauri.conf.json` to allow execution of the Python binary.
3.  Configure FileSystem (`fs`) allowlist to read/write to AppData.

### Phase 3: React Frontend
1.  Build the layout (Sidebar for assets, Main area for chart).
2.  Implement the `inventory` system (reading config file).
3.  Connect the "Update" button to the Tauri Command (Sidecar).
4.  Connect the Chart to the Analysis Command.

## 6. Reference Data Sources (Yahoo Finance)
* **Gold:** `GC=F`
* **Silver:** `SI=F`
* **Crude Oil:** `CL=F`
* **Bitcoin:** `BTC-USD`
* **Euro/USD:** `EURUSD=X`
* **S&P 500:** `^GSPC`