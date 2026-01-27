#!/usr/bin/env python3
"""
COT (Commitment of Traders) Data Processing Module
Handles fetching and processing CFTC COT data for commodity analysis
"""

import sys
import json
import argparse
from datetime import datetime, timedelta
from pathlib import Path
import pandas as pd
import warnings
warnings.filterwarnings('ignore')

# Import COT library
try:
    from cot_reports import cot_reports as cot
except ImportError:
    print(json.dumps({
        'success': False,
        'message': 'cot-reports library not installed'
    }))
    sys.exit(1)

# Yahoo Finance symbol to CFTC commodity name mapping
COT_MAPPING = {
    # Precious Metals
    "GC=F": "GOLD - COMMODITY EXCHANGE INC.",
    "SI=F": "SILVER - COMMODITY EXCHANGE INC.",
    "PL=F": "PLATINUM - NEW YORK MERCANTILE EXCHANGE",
    "PA=F": "PALLADIUM - NEW YORK MERCANTILE EXCHANGE",

    # Industrial Metals
    "HG=F": "COPPER- #1 - COMMODITY EXCHANGE INC.",

    # Energy
    "CL=F": "WTI FINANCIAL CRUDE OIL - NEW YORK MERCANTILE EXCHANGE",
    "NG=F": "HENRY HUB PENULTIMATE NAT GAS - NEW YORK MERCANTILE EXCHANGE",
    "HO=F": "GULF JET NY HEAT OIL SPR - NEW YORK MERCANTILE EXCHANGE",
    "RB=F": "GASOLINE RBOB - NEW YORK MERCANTILE EXCHANGE",

    # Agricultural - Grains
    "ZC=F": "CORN - CHICAGO BOARD OF TRADE",
    "ZW=F": "WHEAT-SRW - CHICAGO BOARD OF TRADE",
    "ZS=F": "SOYBEANS - CHICAGO BOARD OF TRADE",

    # Agricultural - Softs
    "KC=F": "COFFEE C - ICE FUTURES U.S.",
    "SB=F": "SUGAR NO. 11 - ICE FUTURES U.S.",
    "CT=F": "COTTON NO. 2 - ICE FUTURES U.S.",
}


def fetch_cot_data(symbol, file_path):
    """
    Fetch COT data for a symbol and save to CSV

    Args:
        symbol: Yahoo Finance symbol (e.g., 'GC=F')
        file_path: Path to save CSV file

    Returns:
        dict: Status with success, message, rows_added
    """
    try:
        # Check if symbol has COT data
        cot_name = COT_MAPPING.get(symbol)
        if not cot_name:
            return {
                'success': False,
                'message': f'COT data not available for {symbol}. Only available for physical commodity futures.'
            }

        file_path = Path(file_path)

        # Determine which years to fetch
        current_year = datetime.now().year
        years_to_fetch = [current_year, current_year - 1, current_year - 2, current_year - 3]

        # Check existing data
        if file_path.exists() and file_path.stat().st_size > 0:
            existing_df = pd.read_csv(file_path, parse_dates=['Date'])
            last_date = existing_df['Date'].max()

            # Check if data is current (COT is weekly, published Fridays)
            days_old = (datetime.now() - last_date).days
            if days_old < 7:
                return {
                    'success': True,
                    'message': 'COT data is current',
                    'rows_added': 0,
                    'last_date': last_date.strftime('%Y-%m-%d')
                }
        else:
            existing_df = None

        # Fetch data for the last 4 years
        all_data = []
        for year in years_to_fetch:
            try:
                year_df = cot.cot_year(
                    year=year,
                    cot_report_type='disaggregated_fut',
                    store_txt=False,
                    verbose=False
                )

                # Filter for our specific commodity
                commodity_df = year_df[year_df['Market_and_Exchange_Names'] == cot_name].copy()

                if not commodity_df.empty:
                    all_data.append(commodity_df)
            except Exception as e:
                # Skip years that fail (e.g., future years)
                continue

        if not all_data:
            return {
                'success': False,
                'message': f'No COT data found for {cot_name}'
            }

        # Combine all years
        cot_df = pd.concat(all_data, ignore_index=True)
        cot_df = cot_df.sort_values('Report_Date_as_YYYY-MM-DD')

        # Rename columns for consistency
        cot_df = cot_df.rename(columns={
            'Report_Date_as_YYYY-MM-DD': 'Date',
            'Open_Interest_All': 'Open_Interest',
            'M_Money_Positions_Long_All': 'NonComm_Long',
            'M_Money_Positions_Short_All': 'NonComm_Short',
            'Prod_Merc_Positions_Long_All': 'Comm_Long',
            'Prod_Merc_Positions_Short_All': 'Comm_Short',
        })

        # Calculate net positions
        cot_df['NonComm_Net'] = cot_df['NonComm_Long'] - cot_df['NonComm_Short']
        cot_df['Comm_Net'] = cot_df['Comm_Long'] - cot_df['Comm_Short']

        # Select columns to save
        cols_to_save = ['Date', 'Open_Interest', 'NonComm_Long', 'NonComm_Short',
                        'NonComm_Net', 'Comm_Long', 'Comm_Short', 'Comm_Net']
        cot_df = cot_df[cols_to_save]

        # Convert Date to datetime if it isn't already
        if not pd.api.types.is_datetime64_any_dtype(cot_df['Date']):
            cot_df['Date'] = pd.to_datetime(cot_df['Date'])

        # Filter out data we already have
        if existing_df is not None:
            last_date = existing_df['Date'].max()
            cot_df = cot_df[cot_df['Date'] > last_date]

            if cot_df.empty:
                return {
                    'success': True,
                    'message': 'No new data available',
                    'rows_added': 0,
                    'last_date': last_date.strftime('%Y-%m-%d')
                }

            # Append to existing file
            cot_df.to_csv(file_path, mode='a', header=False, index=False)
            rows_added = len(cot_df)
        else:
            # Save new file
            cot_df.to_csv(file_path, index=False)
            rows_added = len(cot_df)

        return {
            'success': True,
            'message': f'Successfully fetched COT data',
            'rows_added': rows_added,
            'last_date': cot_df['Date'].max().strftime('%Y-%m-%d')
        }

    except Exception as e:
        return {
            'success': False,
            'message': f'Error fetching COT data: {str(e)}',
            'rows_added': 0
        }


def calculate_cot_metrics(file_path, years=1):
    """
    Load and calculate COT metrics for visualization

    Args:
        file_path: Path to COT CSV file
        years: Number of years to show (1, 2, or 3)

    Returns:
        dict: JSON-serializable COT metrics
    """
    try:
        file_path = Path(file_path)

        if not file_path.exists():
            return {
                'success': False,
                'message': 'COT data file not found. Please fetch data first.'
            }

        df = pd.read_csv(file_path, parse_dates=['Date'])
        df = df.sort_values('Date')

        # Filter by date range based on years parameter
        start_date = datetime.now() - timedelta(days=365*years)
        df = df[df['Date'] >= start_date]

        if len(df) == 0:
            return {
                'success': False,
                'message': f'No data available for the last {years} year(s)'
            }

        # Calculate week-over-week changes
        df['NonComm_Net_Change'] = df['NonComm_Net'].diff() if 'NonComm_Net' in df.columns else None
        df['Comm_Net_Change'] = df['Comm_Net'].diff() if 'Comm_Net' in df.columns else None
        df['OI_Change'] = df['Open_Interest'].diff()

        # Convert NaN to None for JSON serialization
        def safe_list(series):
            if series is None or series.name not in df.columns:
                return []
            return [None if pd.isna(x) else x for x in series]

        # Prepare data for frontend
        data = {
            'success': True,
            'dates': df['Date'].dt.strftime('%Y-%m-%d').tolist(),
            'open_interest': safe_list(df['Open_Interest']),
            'noncomm_net': safe_list(df.get('NonComm_Net')),
            'comm_net': safe_list(df.get('Comm_Net')),
            'noncomm_long': safe_list(df.get('NonComm_Long')),
            'noncomm_short': safe_list(df.get('NonComm_Short')),
            'comm_long': safe_list(df.get('Comm_Long')),
            'comm_short': safe_list(df.get('Comm_Short')),
            'noncomm_net_change': safe_list(df.get('NonComm_Net_Change')),
            'comm_net_change': safe_list(df.get('Comm_Net_Change')),
            'oi_change': safe_list(df.get('OI_Change')),
        }

        return data

    except Exception as e:
        return {
            'success': False,
            'message': f'Error calculating COT metrics: {str(e)}'
        }


def main():
    """CLI entry point"""
    parser = argparse.ArgumentParser(description='COT Data Processing')
    subparsers = parser.add_subparsers(dest='command')

    # Fetch command
    fetch_parser = subparsers.add_parser('fetch', help='Fetch COT data')
    fetch_parser.add_argument('--symbol', required=True, help='Yahoo Finance symbol')
    fetch_parser.add_argument('--file', required=True, help='Output CSV file path')

    # Calculate command
    calc_parser = subparsers.add_parser('calculate', help='Calculate COT metrics')
    calc_parser.add_argument('--file', required=True, help='Input CSV file path')
    calc_parser.add_argument('--years', type=int, default=1, help='Number of years (1, 2, or 3)')

    args = parser.parse_args()

    if args.command == 'fetch':
        result = fetch_cot_data(args.symbol, args.file)
        print(json.dumps(result))
    elif args.command == 'calculate':
        result = calculate_cot_metrics(args.file, args.years)
        print(json.dumps(result))
    else:
        parser.print_help()


if __name__ == '__main__':
    main()
