import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartDataPoint } from "../../types";

interface HistoricalChartProps {
  chartData: ChartDataPoint[];
  show10yr: boolean;
  show6yr: boolean;
  show5yr: boolean;
  show2yr: boolean;
  onToggle10yr: (checked: boolean) => void;
  onToggle6yr: (checked: boolean) => void;
  onToggle5yr: (checked: boolean) => void;
  onToggle2yr: (checked: boolean) => void;
}

export function HistoricalChart({
  chartData,
  show10yr,
  show6yr,
  show5yr,
  show2yr,
  onToggle10yr,
  onToggle6yr,
  onToggle5yr,
  onToggle2yr,
}: HistoricalChartProps) {
  if (chartData.length === 0) {
    return null;
  }

  return (
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
              onChange={(e) => onToggle10yr(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-slate-800"
            />
            <span className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors">10-Year Avg</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={show6yr}
              onChange={(e) => onToggle6yr(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-slate-800"
            />
            <span className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors">6-Year Avg</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={show5yr}
              onChange={(e) => onToggle5yr(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-slate-800"
            />
            <span className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors">5-Year Avg</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={show2yr}
              onChange={(e) => onToggle2yr(e.target.checked)}
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
          {show6yr && (
            <Line
              type="monotone"
              dataKey="6-Year Avg"
              stroke="#fbbf24"
              strokeWidth={2.5}
              dot={false}
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
  );
}
