import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Asset, SeasonalityData, ChartDataPoint } from '../types';

export function useSeasonality(appDataDir: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [dataStatus, setDataStatus] = useState<string>("Not loaded");
  const [show10yr, setShow10yr] = useState(true);
  const [show6yr, setShow6yr] = useState(true);
  const [show5yr, setShow5yr] = useState(true);
  const [show2yr, setShow2yr] = useState(true);
  const [yAxisDomain, setYAxisDomain] = useState<[number | 'auto', number | 'auto']>(['auto', 'auto']);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ y: number; domain: [number, number] } | null>(null);

  const handleFetchData = async (selectedAsset: Asset) => {
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

  const handleCalculate = async (selectedAsset: Asset, selectedYear: number) => {
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
        const transformed: ChartDataPoint[] = [];
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        for (let day = 0; day < 365; day++) {
          const monthIndex = Math.floor(day / 30.4);
          const monthLabel = months[Math.min(monthIndex, 11)];

          transformed.push({
            day: day + 1,
            month: monthLabel,
            "10-Year Avg": result.avg_10yr?.[day] || null,
            "6-Year Avg": result.avg_6yr?.[day] || null,
            "5-Year Avg": result.avg_5yr?.[day] || null,
            "2-Year Avg": result.avg_2yr?.[day] || null,
            [`${selectedYear}`]: result.actual?.[day] || null,
          });
        }

        setChartData(transformed);
        setYAxisDomain(['auto', 'auto']);
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

  const handleChartMouseDown = (e: React.MouseEvent, selectedYear: number) => {
    if (!chartData.length) return;

    const actualData = chartData.map(d => d[`${selectedYear}`]).filter(v => v !== null && v !== undefined) as number[];
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
    const scale = range / 400;
    const adjustment = deltaY * scale * 0.5;

    const newMin = dragStart.domain[0] - adjustment;
    const newMax = dragStart.domain[1] + adjustment;

    setYAxisDomain([newMin, newMax]);
  };

  const handleChartMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  const handleChartDoubleClick = () => {
    setYAxisDomain(['auto', 'auto']);
  };

  return {
    loading,
    error,
    chartData,
    dataStatus,
    show10yr,
    show6yr,
    show5yr,
    show2yr,
    yAxisDomain,
    isDragging,
    setShow10yr,
    setShow6yr,
    setShow5yr,
    setShow2yr,
    handleFetchData,
    handleCalculate,
    handleChartMouseDown,
    handleChartMouseMove,
    handleChartMouseUp,
    handleChartDoubleClick,
  };
}
