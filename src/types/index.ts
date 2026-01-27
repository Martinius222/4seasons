export interface Asset {
  id: string;
  name: string;
  symbol: string;
}

export interface SeasonalityData {
  success: boolean;
  message?: string;
  rows_added?: number;
  last_date?: string;
  avg_2yr?: (number | null)[];
  avg_5yr?: (number | null)[];
  avg_6yr?: (number | null)[];
  avg_10yr?: (number | null)[];
  actual?: (number | null)[];
  target_year?: number;
}

export interface COTData {
  success: boolean;
  message?: string;
  rows_added?: number;
  last_date?: string;
  dates?: string[];
  open_interest?: (number | null)[];
  noncomm_net?: (number | null)[];
  comm_net?: (number | null)[];
  noncomm_long?: (number | null)[];
  noncomm_short?: (number | null)[];
  comm_long?: (number | null)[];
  comm_short?: (number | null)[];
  noncomm_net_change?: (number | null)[];
  comm_net_change?: (number | null)[];
  oi_change?: (number | null)[];
}

export interface ChartDataPoint {
  day: number;
  month: string;
  "10-Year Avg": number | null;
  "6-Year Avg": number | null;
  "5-Year Avg": number | null;
  "2-Year Avg": number | null;
  [year: string]: number | string | null;
}
