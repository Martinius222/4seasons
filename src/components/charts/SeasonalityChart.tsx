import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Asset, ChartDataPoint } from "../../types";

interface SeasonalityChartProps {
  selectedAsset: Asset;
  selectedYear: number;
  chartData: ChartDataPoint[];
  yAxisDomain: [number | 'auto', number | 'auto'];
  isDragging: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onDoubleClick: () => void;
}

export function SeasonalityChart({
  selectedAsset,
  selectedYear,
  chartData,
  yAxisDomain,
  isDragging,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onDoubleClick,
}: SeasonalityChartProps) {
  if (chartData.length === 0) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl shadow-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-100">
            {selectedAsset.name} - {selectedYear} Price Performance
          </h2>
          <p className="text-xs text-slate-400">Drag vertically to zoom • Double-click to reset</p>
        </div>
        <div className="flex items-center justify-center h-96 bg-slate-900/50 rounded-lg border-2 border-dashed border-slate-600">
          <div className="text-center">
            <p className="text-slate-400 mb-4 text-lg">No data to display</p>
            <p className="text-sm text-slate-500">
              Select an asset and click "Update Data" to fetch historical prices
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl shadow-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-100">
          {selectedAsset.name} - {selectedYear} Price Performance
        </h2>
        <p className="text-xs text-slate-400">Drag vertically to zoom • Double-click to reset</p>
      </div>

      <div
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onDoubleClick={onDoubleClick}
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
              tickFormatter={(value) => `${value.toFixed(0)}`}
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
    </div>
  );
}
