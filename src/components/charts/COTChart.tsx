import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { COTData } from "../../types";

interface COTChartProps {
  cotData: COTData | null;
  cotError: string | null;
  cotLoading: boolean;
  cotPeriod: 1 | 2 | 3;
  onPeriodChange: (period: 1 | 2 | 3) => void;
}

export function COTChart({
  cotData,
  cotError,
  cotLoading,
  cotPeriod,
  onPeriodChange,
}: COTChartProps) {
  if (cotError) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm border border-red-500/50 rounded-xl shadow-2xl p-6 mt-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-red-400 mb-1">COT Data Not Available</h3>
            <p className="text-sm text-slate-300">{cotError}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!cotData || !cotData.dates || cotData.dates.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl shadow-2xl p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-100 mb-2">
            Commitment of Traders (COT) Report
          </h2>
          <p className="text-xs text-slate-400">
            Weekly positioning data from CFTC • Speculators (Non-Commercial) vs Commercials
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onPeriodChange(1)}
            disabled={cotLoading}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              cotPeriod === 1
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            1Y
          </button>
          <button
            onClick={() => onPeriodChange(2)}
            disabled={cotLoading}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              cotPeriod === 2
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            2Y
          </button>
          <button
            onClick={() => onPeriodChange(3)}
            disabled={cotLoading}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              cotPeriod === 3
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            3Y
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart
          data={cotData.dates.map((date, i) => ({
            date: new Date(date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
            fullDate: date,
            speculators: cotData.noncomm_net?.[i],
            commercials: cotData.comm_net?.[i],
            openInterest: cotData.open_interest?.[i]
          }))}
          syncId="charts"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis
            dataKey="date"
            stroke="#64748b"
            style={{ fontSize: '11px', fill: '#94a3b8' }}
            angle={-45}
            textAnchor="end"
            height={80}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="left"
            label={{ value: 'Net Positions (Contracts)', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8' } }}
            stroke="#64748b"
            style={{ fontSize: '12px', fill: '#94a3b8' }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            width={70}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            label={{ value: 'Open Interest', angle: 90, position: 'insideRight', style: { fill: '#94a3b8' } }}
            stroke="#64748b"
            style={{ fontSize: '12px', fill: '#94a3b8' }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            width={70}
          />
          <Tooltip
            formatter={(value: any, name: string | undefined): [string, string] => {
              if (value === null || value === undefined) return ['N/A', name || ''];
              const formatted = Math.round(value).toLocaleString();
              return [formatted, name || ''];
            }}
            labelFormatter={(label, payload) => {
              if (payload && payload[0]?.payload?.fullDate) {
                return `Week of ${new Date(payload[0].payload.fullDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
              }
              return label;
            }}
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #475569',
              borderRadius: '8px',
              color: '#e2e8f0'
            }}
            labelStyle={{ color: '#94a3b8' }}
          />
          <Legend align="left" wrapperStyle={{ color: '#cbd5e1' }} />
          <ReferenceLine yAxisId="left" y={0} stroke="#64748b" strokeDasharray="3 3" />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="speculators"
            stroke="#3b82f6"
            strokeWidth={2.5}
            dot={false}
            name="Speculators Net"
            connectNulls={true}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="commercials"
            stroke="#ef4444"
            strokeWidth={2.5}
            dot={false}
            name="Commercials Net"
            connectNulls={true}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="openInterest"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            name="Open Interest"
            connectNulls={true}
            strokeDasharray="5 5"
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="mt-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
        <p className="text-xs text-slate-400 leading-relaxed">
          <span className="font-semibold text-slate-300">Speculators (Non-Commercial)</span> are large traders like hedge funds seeking profit.
          <span className="font-semibold text-slate-300 ml-3">Commercials</span> are producers/consumers hedging risk.
          Net positions show long contracts minus short contracts. Positive = net long, Negative = net short.
        </p>
      </div>
    </div>
  );
}
