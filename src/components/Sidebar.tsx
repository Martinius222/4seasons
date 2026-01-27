import { Asset } from "../types";

interface SidebarProps {
  selectedAsset: Asset;
  selectedYear: number;
  loading: boolean;
  cotLoading: boolean;
  dataStatus: string;
  error: string | null;
  assets: Asset[];
  appDataDir: string;
  onAssetChange: (asset: Asset) => void;
  onYearChange: (year: number) => void;
  onFetchData: () => void;
  onCalculate: () => void;
  onFetchCOT: () => void;
}

export function Sidebar({
  selectedAsset,
  selectedYear,
  loading,
  cotLoading,
  dataStatus,
  error,
  assets,
  appDataDir,
  onAssetChange,
  onYearChange,
  onFetchData,
  onCalculate,
  onFetchCOT,
}: SidebarProps) {
  return (
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
              const asset = assets.find((a) => a.id === e.target.value);
              if (asset) onAssetChange(asset);
            }}
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          >
            {assets.map((asset) => (
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
            onChange={(e) => onYearChange(parseInt(e.target.value))}
            min="2000"
            max={new Date().getFullYear()}
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onFetchData}
            disabled={loading}
            className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-500 hover:to-blue-400 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-blue-500/50"
          >
            {loading ? "Loading..." : "Update Data"}
          </button>
          <button
            onClick={onCalculate}
            disabled={loading}
            className="w-full px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-lg hover:from-emerald-500 hover:to-emerald-400 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-emerald-500/50"
          >
            Calculate
          </button>
          <button
            onClick={onFetchCOT}
            disabled={cotLoading || !appDataDir}
            className="w-full px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-lg hover:from-purple-500 hover:to-purple-400 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-purple-500/50"
          >
            {cotLoading ? "Loading..." : "Load COT Data"}
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
  );
}
