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
  const [yAxisDomain, setYAxisDomain] = useState<[number | 'auto', number | 'auto']>(['auto', 'auto']);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ y: number; domain: [number, number] } | null>(null);

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
        setYAxisDomain(['auto', 'auto']); // Reset Y-axis scale when new data is loaded
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

  const handleChartMouseDown = (e: React.MouseEvent) => {
    if (!chartData.length) return;

    // Get current domain values
    const actualData = chartData.map(d => d[`${selectedYear}`]).filter(v => v !== null && v !== undefined);
    if (actualData.length === 0) return;

    const currentMin = yAxisDomain[0] === 'auto' ? Math.min(...actualData) : yAxisDomain[0];
    const currentMax = yAxisDomain[1] === 'auto' ? Math.max(...actualData) : yAxisDomain[1];

    setIsDragging(true);
    setDragStart({ y: e.clientY, domain: [currentMin, currentMax] });
  };

  const handleChartMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart) return;

    const deltaY = e.clientY - dragStart.y;
    const range = dragStart.domain[1] - dragStart.domain[0];
    const scale = range / 400; // 400px chart height
    const adjustment = deltaY * scale * 0.5; // Scale factor for sensitivity

    const newMin = dragStart.domain[0] - adjustment;
    const newMax = dragStart.domain[1] + adjustment;

    setYAxisDomain([newMin, newMax]);
  };

  const handleChartMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  const handleChartDoubleClick = () => {
    setYAxisDomain(['auto', 'auto']); // Reset to auto scale
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-80 bg-slate-800/50 backdrop-blur-sm border-r border-slate-700/50 p-6 flex flex-col">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
              4Seasons
            </h1>
            <p className="text-slate-400 text-sm">Professional Commodity Seasonality Analysis</p>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-6 flex-1">
            {/* Asset Selector */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Asset
              </label>
              <select
                value={selectedAsset.id}
                onChange={(e) => {
                  const asset = ASSETS.find((a) => a.id === e.target.value);
                  if (asset) setSelectedAsset(asset);
                }}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Analysis Year
              </label>
              <input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                min="2000"
                max={new Date().getFullYear()}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleFetchData}
                disabled={loading}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-500 hover:to-blue-400 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-blue-500/50"
              >
                {loading ? "Loading..." : "Update Data"}
              </button>
              <button
                onClick={handleCalculate}
                disabled={loading}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-lg hover:from-emerald-500 hover:to-emerald-400 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-emerald-500/50"
              >
                Calculate
              </button>
            </div>

            {/* Status */}
            <div className="pt-4 border-t border-slate-700/50">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-2">Status</p>
              <p className="text-sm text-slate-300">{dataStatus}</p>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Chart - Actual Year */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl shadow-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-100">
                {selectedAsset.name} - {selectedYear} Price Performance
              </h2>
              <p className="text-xs text-slate-400">Drag vertically to zoom • Double-click to reset</p>
            </div>

            {chartData.length > 0 ? (
              <div
                onMouseDown={handleChartMouseDown}
                onMouseMove={handleChartMouseMove}
                onMouseUp={handleChartMouseUp}
                onMouseLeave={handleChartMouseUp}
                onDoubleClick={handleChartDoubleClick}
                style={{ cursor: isDragging ? 'ns-resize' : 'default' }}
              >
                <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData} syncId="charts">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis
                    dataKey="day"
                    ticks={[1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335]}
                    tickFormatter={(day) => {
                      const monthStarts = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
                      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                      const monthIndex = monthStarts.findIndex(start => start === day);
                      return monthIndex >= 0 ? months[monthIndex] : "";
                    }}
                    stroke="#64748b"
                    style={{ fontSize: '12px', fill: '#94a3b8' }}
                  />
                  <YAxis
                    domain={yAxisDomain}
                    label={{ value: 'Change (%)', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8' } }}
                    stroke="#64748b"
                    style={{ fontSize: '12px', fill: '#94a3b8' }}
                    tickFormatter={(value) => `${value.toFixed(1)}%`}
                    width={60}
                  />
                <Tooltip
                  formatter={(value: any) => value !== null ? `${value?.toFixed(2)}%` : 'N/A'}
                  labelFormatter={(day) => `Day ${day}`}
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    color: '#e2e8f0'
                  }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Legend align="left" wrapperStyle={{ color: '#cbd5e1' }} />
                <Line
                  type="monotone"
                  dataKey={`${selectedYear}`}
                  stroke="#f43f5e"
                  strokeWidth={3}
                  dot={false}
                  name={`${selectedYear} Actual`}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
              </div>
          ) : (
            <div className="flex items-center justify-center h-96 bg-slate-900/50 rounded-lg border-2 border-dashed border-slate-600">
              <div className="text-center">
                <p className="text-slate-400 mb-4 text-lg">No data to display</p>
                <p className="text-sm text-slate-500">
                  Select an asset and click "Update Data" to fetch historical prices
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Chart - Historical Averages */}
        {chartData.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl shadow-2xl p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-100">
                Historical Seasonal Patterns
              </h2>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={show10yr}
                    onChange={(e) => setShow10yr(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-slate-800"
                  />
                  <span className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors">10-Year Avg</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={show5yr}
                    onChange={(e) => setShow5yr(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-slate-800"
                  />
                  <span className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors">5-Year Avg</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={show2yr}
                    onChange={(e) => setShow2yr(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-slate-800"
                  />
                  <span className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors">2-Year Avg</span>
                </label>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData} syncId="charts">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis
                  dataKey="day"
                  ticks={[1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335]}
                  tickFormatter={(day) => {
                    const monthStarts = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
                    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    const monthIndex = monthStarts.findIndex(start => start === day);
                    return monthIndex >= 0 ? months[monthIndex] : "";
                  }}
                  stroke="#64748b"
                  style={{ fontSize: '12px', fill: '#94a3b8' }}
                />
                <YAxis
                  label={{ value: 'Change (%)', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8' } }}
                  stroke="#64748b"
                  style={{ fontSize: '12px', fill: '#94a3b8' }}
                />
                <Tooltip
                  formatter={(value: any) => value !== null ? `${value?.toFixed(2)}%` : 'N/A'}
                  labelFormatter={(day) => `Day ${day}`}
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    color: '#e2e8f0'
                  }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Legend align="left" wrapperStyle={{ color: '#cbd5e1' }} />
                {show10yr && (
                  <Line
                    type="monotone"
                    dataKey="10-Year Avg"
                    stroke="#60a5fa"
                    strokeWidth={2.5}
                    dot={false}
                    strokeDasharray="5 5"
                    connectNulls={true}
                  />
                )}
                {show5yr && (
                  <Line
                    type="monotone"
                    dataKey="5-Year Avg"
                    stroke="#34d399"
                    strokeWidth={2.5}
                    dot={false}
                    connectNulls={true}
                  />
                )}
                {show2yr && (
                  <Line
                    type="monotone"
                    dataKey="2-Year Avg"
                    stroke="#a78bfa"
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
    </div>
  );
}

export default App;
