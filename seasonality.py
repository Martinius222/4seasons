#!/usr/bin/env python3
"""
Seasonality Data Processing Engine
Handles data fetching from Yahoo Finance and seasonality calculations
"""

import sys
import json
import argparse
import warnings
from datetime import datetime, timedelta
from pathlib import Path

# Suppress all warnings to ensure clean JSON output
warnings.filterwarnings('ignore')

import pandas as pd
import numpy as np
import yfinance as yf


def fetch_data(symbol, file_path):
    """
    Fetch and append historical price data from Yahoo Finance.

    Args:
        symbol: Yahoo Finance ticker symbol (e.g., 'GC=F', 'BTC-USD')
        file_path: Path to the CSV file for storage

    Returns:
        dict: Status information with 'success', 'message', and 'rows_added' keys
    """
    try:
        file_path = Path(file_path)

        # Determine start date
        if file_path.exists() and file_path.stat().st_size > 0:
            # Read existing data to find the last date
            existing_df = pd.read_csv(file_path, parse_dates=['Date'])
            last_date = existing_df['Date'].max()
            fetch_start_date = (last_date + timedelta(days=1)).strftime('%Y-%m-%d')

            # If last date is today or in the future, no update needed
            if last_date.date() >= datetime.now().date():
                return {
                    'success': True,
                    'message': 'Data is already up to date',
                    'rows_added': 0,
                    'last_date': last_date.strftime('%Y-%m-%d')
                }
        else:
            # No existing data, fetch from 2000
            fetch_start_date = '2000-01-01'
            existing_df = None

        # Fetch data from Yahoo Finance
        today = datetime.now().strftime('%Y-%m-%d')
        ticker = yf.Ticker(symbol)
        new_data = ticker.history(start=fetch_start_date, end=today, interval='1d')

        if new_data.empty:
            return {
                'success': True,
                'message': 'No new data available',
                'rows_added': 0
            }

        # Prepare dataframe for saving
        new_data = new_data.reset_index()
        new_data = new_data[['Date', 'Open', 'High', 'Low', 'Close', 'Volume']]
        new_data['Date'] = pd.to_datetime(new_data['Date']).dt.date

        # Save or append to CSV
        if existing_df is None:
            # Create new file
            new_data.to_csv(file_path, index=False)
            rows_added = len(new_data)
        else:
            # Append new data
            new_data.to_csv(file_path, mode='a', header=False, index=False)
            rows_added = len(new_data)

        last_date = new_data['Date'].max().strftime('%Y-%m-%d')

        return {
            'success': True,
            'message': f'Successfully updated {symbol}',
            'rows_added': rows_added,
            'last_date': last_date
        }

    except Exception as e:
        return {
            'success': False,
            'message': f'Error fetching data: {str(e)}',
            'rows_added': 0
        }


def calculate_metrics(file_path, target_year):
    """
    Calculate seasonality metrics based on historical data.

    Args:
        file_path: Path to the CSV file containing price history
        target_year: The year to analyze (int)

    Returns:
        dict: JSON-serializable dictionary with avg_2yr, avg_5yr, avg_10yr, and actual arrays
    """
    try:
        file_path = Path(file_path)

        if not file_path.exists():
            return {
                'success': False,
                'message': 'Data file not found. Please fetch data first.'
            }

        # Load data
        df = pd.read_csv(file_path, parse_dates=['Date'])
        df = df.sort_values('Date')

        # Filter to historical window (all data before target year)
        historical_cutoff = pd.Timestamp(f'{target_year}-01-01')
        historical_df = df[df['Date'] < historical_cutoff].copy()

        if len(historical_df) == 0:
            return {
                'success': False,
                'message': f'No historical data available before {target_year}'
            }

        # Extract year and day of year
        historical_df['Year'] = historical_df['Date'].dt.year
        historical_df['DayOfYear'] = historical_df['Date'].dt.dayofyear

        # Get the last N years of data
        latest_year = historical_df['Year'].max()

        # Calculate normalized percentage changes for each period
        def normalize_years(years_back):
            """Normalize each year's data to percentage change from Day 1"""
            start_year = latest_year - years_back + 1
            period_df = historical_df[historical_df['Year'] >= start_year].copy()

            normalized_data = []

            for year in period_df['Year'].unique():
                year_data = period_df[period_df['Year'] == year].copy()
                year_data = year_data.sort_values('DayOfYear')

                if len(year_data) == 0:
                    continue

                # Calculate cumulative percentage change from first day
                first_close = year_data.iloc[0]['Close']
                year_data['PctChange'] = (year_data['Close'] / first_close - 1) * 100

                normalized_data.append(year_data[['DayOfYear', 'PctChange']])

            if not normalized_data:
                return []

            # Combine all years and average by day of year
            combined = pd.concat(normalized_data)
            avg_by_day = combined.groupby('DayOfYear')['PctChange'].mean()

            # Create full 365-day array, filling missing days with interpolation
            full_days = pd.Series(index=range(1, 366), dtype=float)
            full_days.update(avg_by_day)
            full_days = full_days.interpolate(method='linear').fillna(0)

            # Apply 7-day rolling average to smooth the seasonal pattern
            full_days = full_days.rolling(window=7, center=True, min_periods=1).mean()

            return full_days.tolist()

        # Calculate averages for different periods
        avg_2yr = normalize_years(2) if latest_year >= (target_year - 2) else []
        avg_5yr = normalize_years(5) if latest_year >= (target_year - 5) else []
        avg_10yr = normalize_years(10) if latest_year >= (target_year - 10) else []

        # Get actual data for target year
        target_df = df[df['Date'].dt.year == target_year].copy()
        actual = []

        if len(target_df) > 0:
            target_df = target_df.sort_values('Date')
            target_df['DayOfYear'] = target_df['Date'].dt.dayofyear
            first_close = target_df.iloc[0]['Close']
            target_df['PctChange'] = (target_df['Close'] / first_close - 1) * 100

            # Create full 365-day array for actual data - NO interpolation into future
            actual_by_day = target_df.set_index('DayOfYear')['PctChange']
            full_actual = pd.Series(index=range(1, 366), dtype=float)
            full_actual.update(actual_by_day)
            # Only interpolate between existing data points, not into future
            full_actual = full_actual.interpolate(method='linear', limit_area='inside')
            actual = full_actual.tolist()

        # Convert NaN to None for valid JSON
        return {
            'success': True,
            'avg_2yr': [None if pd.isna(x) else x for x in avg_2yr],
            'avg_5yr': [None if pd.isna(x) else x for x in avg_5yr],
            'avg_10yr': [None if pd.isna(x) else x for x in avg_10yr],
            'actual': [None if pd.isna(x) else x for x in actual],
            'target_year': target_year
        }

    except Exception as e:
        return {
            'success': False,
            'message': f'Error calculating metrics: {str(e)}'
        }


def main():
    """CLI entry point"""
    parser = argparse.ArgumentParser(description='Seasonality Data Processing Engine')
    subparsers = parser.add_subparsers(dest='command', help='Command to execute')

    # Fetch command
    fetch_parser = subparsers.add_parser('fetch', help='Fetch data from Yahoo Finance')
    fetch_parser.add_argument('--symbol', required=True, help='Yahoo Finance ticker symbol')
    fetch_parser.add_argument('--file', required=True, help='Path to CSV file')

    # Calculate command
    calc_parser = subparsers.add_parser('calculate', help='Calculate seasonality metrics')
    calc_parser.add_argument('--file', required=True, help='Path to CSV file')
    calc_parser.add_argument('--year', required=True, type=int, help='Target year for analysis')

    args = parser.parse_args()

    if args.command == 'fetch':
        result = fetch_data(args.symbol, args.file)
        print(json.dumps(result))
    elif args.command == 'calculate':
        result = calculate_metrics(args.file, args.year)
        print(json.dumps(result))
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == '__main__':
    main()
