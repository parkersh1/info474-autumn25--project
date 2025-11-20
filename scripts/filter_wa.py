#!/usr/bin/env python3
"""
Filter a large CSV for rows where the `State` column equals a given state (default WA).
Reads in chunks to handle very large files.

Usage:
  python3 scripts/filter_wa.py -i /path/to/US_Accidents_March23.csv -o /path/to/US_Accidents_March23_WA.csv -s WA --chunksize 500000
"""

import argparse
import os
import sys

try:
    import pandas as pd
except Exception:
    print("pandas is required. Install with: python3 -m pip install --user pandas")
    raise


def parse_args():
    p = argparse.ArgumentParser(description="Filter CSV rows by State column (chunked).")
    p.add_argument("-i", "--input", required=True, help="Path to input CSV file")
    p.add_argument("-o", "--output", default=None, help="Path to output CSV file (default: input without extension + _<STATE>.csv)")
    p.add_argument("-s", "--state", default="WA", help="State value to filter for (default WA)")
    p.add_argument("--chunksize", type=int, default=500000, help="Number of rows per chunk to read (default 500000)")
    return p.parse_args()


def main():
    args = parse_args()
    infile = args.input
    if not os.path.isfile(infile):
        print(f"Input file not found: {infile}")
        sys.exit(2)

    out = args.output
    if out is None:
        base, ext = os.path.splitext(infile)
        out = f"{base}_{args.state}.csv"

    state_val = args.state
    chunksize = args.chunksize

    print(f"Reading {infile} in chunks of {chunksize} rows, filtering State == '{state_val}', writing to {out}")

    matched = 0
    processed = 0
    wrote_header = False

    try:
        for chunk in pd.read_csv(infile, chunksize=chunksize, low_memory=False):
            processed += len(chunk)
            # Ensure 'State' exists
            if 'State' not in chunk.columns:
                print("Input file does not contain a 'State' column. Available columns:", ",".join(chunk.columns))
                sys.exit(3)

            # Compare after casting to string and stripping whitespace; uppercase for robust match
            filtered = chunk[chunk['State'].astype(str).str.strip().str.upper() == state_val.upper()]
            if not filtered.empty:
                filtered.to_csv(out, mode='a', header=not wrote_header, index=False)
                wrote_header = True
                matched += len(filtered)
            print(f"Processed {processed:,} rows, matched so far {matched:,}", end='\r')

    except KeyboardInterrupt:
        print('\nInterrupted by user')
        sys.exit(1)
    except pd.errors.EmptyDataError:
        print('\nNo data in input file')
        sys.exit(4)
    except Exception as e:
        print('\nError while processing:', e)
        raise

    print(f"\nDone. Processed {processed:,} rows. Matched {matched:,} rows. Output: {out}")


if __name__ == '__main__':
    main()
