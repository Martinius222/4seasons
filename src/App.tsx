import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Asset {
  id: string;
  name: string;
  symbol: string;
}

interface SeasonalityData {
  success: boolean;
  message?: string;
  rows_added?: number;
  last_date?: string;
  avg_2yr?: (number | null)[];
  avg_5yr?: (number | null)[];
  avg_10yr?: (number | null)[];
  actual?: (number | null)[];
  target_year?: number;
}

const ASSETS: Asset[] = [
  // Precious Metals
  { id: "gold", name: "Gold", symbol: "GC=F" },
  { id: "silver", name: "Silver", symbol: "SI=F" },
  { id: "platinum", name: "Platinum", symbol: "PL=F" },
  { id: "palladium", name: "Palladium", symbol: "PA=F" },

  // Industrial Metals
  { id: "copper", name: "Copper", symbol: "HG=F" },

  // Energy
  { id: "oil", name: "Crude Oil", symbol: "CL=F" },
  { id: "natgas", name: "Natural Gas", symbol: "NG=F" },
  { id: "heating_oil", name: "Heating Oil", symbol: "HO=F" },
  { id: "gasoline", name: "Gasoline", symbol: "RB=F" },

  // Agricultural
  { id: "corn", name: "Corn", symbol: "ZC=F" },
  { id: "wheat", name: "Wheat", symbol: "ZW=F" },
  { id: "soybeans", name: "Soybeans", symbol: "ZS=F" },
  { id: "coffee", name: "Coffee", symbol: "KC=F" },
  { id: "sugar", name: "Sugar", symbol: "SB=F" },
  { id: "cotton", name: "Cotton", symbol: "CT=F" },

  // Crypto & Indices
  { id: "bitcoin", name: "Bitcoin", symbol: "BTC-USD" },
  { id: "sp500", name: "S&P 500", symbol: "^GSPC" },
  { id: "eurusd", name: "EUR/USD", symbol: "EURUSD=X" },
];

function App() {
  const [selectedAsset, setSelectedAsset] = useState<Asset>(ASSETS[0]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [appDataDir, setAppDataDir] = useState<string>("");
  const [dataStatus, setDataStatus] = useState<string>("Not loaded");
  const [show10yr, setShow10yr] = useState(true);
  const [show5yr, setShow5yr] = useState(true);
  const [show2yr, setShow2yr] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      const dir = await invoke<string>("get_app_data_dir");
      setAppDataDir(dir);
      console.log("App data directory:", dir);
    } catch (err) {
      setError(`Failed to initialize: ${err}`);
      console.error(err);
    }
  };

  const handleFetchData = async () => {
    if (!appDataDir) {
      setError("App not initialized");
      return;
    }

    setLoading(true);
    setError(null);
    setDataStatus("Fetching data...");

    try {
      const filePath = `${appDataDir}/data/${selectedAsset.id}_daily.csv`;

      const result = await invoke<SeasonalityData>("fetch_data", {
        symbol: selectedAsset.symbol,
        filePath,
      });

      if (result.success) {
        setDataStatus(`✓ Downloaded ${result.rows_added || 0} rows. Last date: ${result.last_date || 'N/A'}`);
      } else {
        setError(result.message || "Failed to fetch data");
        setDataStatus("Error fetching data");
      }
    } catch (err) {
      setError(`Error: ${err}`);
      setDataStatus("Error fetching data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async () => {
    if (!appDataDir) {
      setError("App not initialized");
      return;
    }

    setLoading(true);
    setError(null);
    setDataStatus("Calculating seasonality...");

    try {
      const filePath = `${appDataDir}/data/${selectedAsset.id}_daily.csv`;

      const result = await invoke<SeasonalityData>("calculate_seasonality", {
        filePath,
        year: selectedYear,
      });

      if (result.success) {
        // Transform data for Recharts
        const transformed = [];
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        for (let day = 0; day < 365; day++) {
          const monthIndex = Math.floor(day / 30.4);
          const monthLabel = months[Math.min(monthIndex, 11)];

          transformed.push({
            day: day + 1,
            month: monthLabel,
            "10-Year Avg": result.avg_10yr?.[day] || null,
            "5-Year Avg": result.avg_5yr?.[day] || null,
            "2-Year Avg": result.avg_2yr?.[day] || null,
            [`${selectedYear}`]: result.actual?.[day] || null,
          });
        }

        setChartData(transformed);
        setDataStatus(`✓ Data calculated for ${selectedYear}`);
      } else {
        setError(result.message || "Failed to calculate seasonality");
        setDataStatus("Error calculating");
      }
    } catch (err) {
      setError(`Error: ${err}`);
      setDataStatus("Error calculating");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">4Seasons</h1>
          <p className="text-gray-600">Commodity Seasonality Analysis</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Asset Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Asset
              </label>
              <select
                value={selectedAsset.id}
                onChange={(e) => {
                  const asset = ASSETS.find((a) => a.id === e.target.value);
                  if (asset) setSelectedAsset(asset);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ASSETS.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Analysis Year
              </label>
              <input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                min="2000"
                max={new Date().getFullYear()}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-end gap-2">
              <button
                onClick={handleFetchData}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Loading..." : "Update Data"}
              </button>
              <button
                onClick={handleCalculate}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Calculate
              </button>
            </div>

            {/* Status */}
            <div className="flex items-end">
              <p className="text-sm text-gray-600">{dataStatus}</p>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Chart - Actual Year */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {selectedAsset.name} - {selectedYear} Price Performance
          </h2>

          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData} syncId="charts">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  ticks={[1, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335]}
                  tickFormatter={(day) => {
                    const monthIndex = Math.floor((day - 1) / 30.4);
                    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    return months[Math.min(monthIndex, 11)];
                  }}
                />
                <YAxis
                  label={{ value: 'Change (%)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  formatter={(value: any) => value !== null ? `${value?.toFixed(2)}%` : 'N/A'}
                  labelFormatter={(day) => `Day ${day}`}
                />
                <Legend align="left" />
                <Line
                  type="monotone"
                  dataKey={`${selectedYear}`}
                  stroke="#ef4444"
                  strokeWidth={3}
                  dot={false}
                  name={`${selectedYear} Actual`}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center">
                <p className="text-gray-500 mb-4">No data to display</p>
                <p className="text-sm text-gray-400">
                  Select an asset and click "Update Data" to fetch historical prices
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Chart - Historical Averages */}
        {chartData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Historical Seasonal Patterns
              </h2>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={show10yr}
                    onChange={(e) => setShow10yr(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">10-Year Avg</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={show5yr}
                    onChange={(e) => setShow5yr(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">5-Year Avg</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={show2yr}
                    onChange={(e) => setShow2yr(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">2-Year Avg</span>
                </label>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData} syncId="charts">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  ticks={[1, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335]}
                  tickFormatter={(day) => {
                    const monthIndex = Math.floor((day - 1) / 30.4);
                    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    return months[Math.min(monthIndex, 11)];
                  }}
                />
                <YAxis
                  label={{ value: 'Change (%)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  formatter={(value: any) => value !== null ? `${value?.toFixed(2)}%` : 'N/A'}
                  labelFormatter={(day) => `Day ${day}`}
                />
                <Legend align="left" />
                {show10yr && (
                  <Line
                    type="monotone"
                    dataKey="10-Year Avg"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="5 5"
                    connectNulls={true}
                  />
                )}
                {show5yr && (
                  <Line
                    type="monotone"
                    dataKey="5-Year Avg"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    dot={false}
                    connectNulls={true}
                  />
                )}
                {show2yr && (
                  <Line
                    type="monotone"
                    dataKey="2-Year Avg"
                    stroke="#8b5cf6"
                    strokeWidth={2.5}
                    dot={false}
                    strokeDasharray="3 3"
                    connectNulls={true}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
