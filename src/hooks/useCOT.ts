import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Asset, COTData } from '../types';

export function useCOT(appDataDir: string) {
  const [cotData, setCotData] = useState<COTData | null>(null);
  const [cotLoading, setCotLoading] = useState(false);
  const [cotPeriod, setCotPeriod] = useState<1 | 2 | 3>(1);
  const [cotError, setCotError] = useState<string | null>(null);

  const handleFetchCOT = async (selectedAsset: Asset) => {
    setCotLoading(true);
    setCotError(null);

    try {
      const filePath = `${appDataDir}/data/${selectedAsset.id}_cot.csv`;

      const fetchResult = await invoke<COTData>('fetch_cot_data', {
        symbol: selectedAsset.symbol,
        filePath
      });

      if (!fetchResult.success) {
        setCotError(fetchResult.message || 'Failed to fetch COT data');
        setCotData(null);
        setCotLoading(false);
        return;
      }

      const calcResult = await invoke<COTData>('calculate_cot_metrics', {
        filePath,
        years: cotPeriod
      });

      if (calcResult.success) {
        setCotData(calcResult);
      } else {
        setCotError(calcResult.message || 'Failed to calculate COT metrics');
        setCotData(null);
      }
    } catch (err) {
      setCotError(`Error: ${err}`);
      setCotData(null);
      console.error(err);
    } finally {
      setCotLoading(false);
    }
  };

  const handleCOTPeriodChange = async (period: 1 | 2 | 3, selectedAsset: Asset) => {
    setCotPeriod(period);

    if (!cotData) return;

    setCotLoading(true);
    try {
      const filePath = `${appDataDir}/data/${selectedAsset.id}_cot.csv`;
      const calcResult = await invoke<COTData>('calculate_cot_metrics', {
        filePath,
        years: period
      });

      if (calcResult.success) {
        setCotData(calcResult);
      } else {
        setCotError(calcResult.message || 'Failed to calculate COT metrics');
      }
    } catch (err) {
      setCotError(`Error: ${err}`);
      console.error(err);
    } finally {
      setCotLoading(false);
    }
  };

  return {
    cotData,
    cotLoading,
    cotPeriod,
    cotError,
    handleFetchCOT,
    handleCOTPeriodChange,
  };
}
