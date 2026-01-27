import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Asset } from "./types";
import { ASSETS } from "./constants/assets";
import { useSeasonality } from "./hooks/useSeasonality";
import { useCOT } from "./hooks/useCOT";
import { Sidebar } from "./components/Sidebar";
import { SeasonalityChart } from "./components/charts/SeasonalityChart";
import { HistoricalChart } from "./components/charts/HistoricalChart";
import { COTChart } from "./components/charts/COTChart";

function App() {
  const [selectedAsset, setSelectedAsset] = useState<Asset>(ASSETS[0]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [appDataDir, setAppDataDir] = useState<string>("");

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const dir = await invoke<string>("get_app_data_dir");
        setAppDataDir(dir);
        console.log("App data directory:", dir);
      } catch (err) {
        console.error("Failed to initialize:", err);
      }
    };
    initializeApp();
  }, []);

  // Custom hooks for data management
  const seasonality = useSeasonality(appDataDir);
  const cot = useCOT(appDataDir);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="flex h-screen">
        {/* Sidebar */}
        <Sidebar
          selectedAsset={selectedAsset}
          selectedYear={selectedYear}
          loading={seasonality.loading}
          cotLoading={cot.cotLoading}
          dataStatus={seasonality.dataStatus}
          error={seasonality.error}
          assets={ASSETS}
          appDataDir={appDataDir}
          onAssetChange={setSelectedAsset}
          onYearChange={setSelectedYear}
          onFetchData={() => seasonality.handleFetchData(selectedAsset)}
          onCalculate={() => seasonality.handleCalculate(selectedAsset, selectedYear)}
          onFetchCOT={() => cot.handleFetchCOT(selectedAsset)}
        />

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Seasonality Chart - Actual Year */}
          <SeasonalityChart
            selectedAsset={selectedAsset}
            selectedYear={selectedYear}
            chartData={seasonality.chartData}
            yAxisDomain={seasonality.yAxisDomain}
            isDragging={seasonality.isDragging}
            onMouseDown={(e) => seasonality.handleChartMouseDown(e, selectedYear)}
            onMouseMove={seasonality.handleChartMouseMove}
            onMouseUp={seasonality.handleChartMouseUp}
            onDoubleClick={seasonality.handleChartDoubleClick}
          />

          {/* Historical Seasonal Patterns Chart */}
          <HistoricalChart
            chartData={seasonality.chartData}
            show10yr={seasonality.show10yr}
            show6yr={seasonality.show6yr}
            show5yr={seasonality.show5yr}
            show2yr={seasonality.show2yr}
            onToggle10yr={seasonality.setShow10yr}
            onToggle6yr={seasonality.setShow6yr}
            onToggle5yr={seasonality.setShow5yr}
            onToggle2yr={seasonality.setShow2yr}
          />

          {/* COT Chart */}
          <COTChart
            cotData={cot.cotData}
            cotError={cot.cotError}
            cotLoading={cot.cotLoading}
            cotPeriod={cot.cotPeriod}
            onPeriodChange={(period) => cot.handleCOTPeriodChange(period, selectedAsset)}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
