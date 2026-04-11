import sys
import os
import json
import pandas as pd

def main():
    target_type = sys.argv[1] if len(sys.argv) > 1 else 'yellow'
    
    base_dir = os.path.join(os.path.dirname(__file__), '..', 'docs', 'data', 'raw')
    
    results = []

    def fetch_data(color, file_name, time_col):
        path = os.path.join(base_dir, file_name)
        if not os.path.exists(path):
            return []
        
        # We only really need a slice, so taking the head is fast.
        # But read_parquet reads whole file unless filters are used.
        # We'll just read and take 20 rows.
        try:
            df = pd.read_parquet(path, columns=[time_col, 'PULocationID', 'DOLocationID', 'trip_distance', 'total_amount'])
            
            # Sub-sample random 20 rows
            df_sampled = df.sample(n=min(20, len(df)), random_state=42)
            
            records = []
            for i, row in df_sampled.iterrows():
                # Formatting time safely
                t = row[time_col]
                time_str = t.strftime("%I:%M %p") if pd.notnull(t) else "00:00 AM"

                records.append({
                    "id": f"TLC_{len(results) + len(records)}",
                    "type": color.capitalize(),
                    "pu": f"Zone {row['PULocationID']}",
                    "do": f"Zone {row['DOLocationID']}",
                    "dist": float(row['trip_distance']) if pd.notnull(row['trip_distance']) else 0.0,
                    "fare": float(row['total_amount']) if pd.notnull(row['total_amount']) else 0.0,
                    "time": time_str
                })
            return records
        except Exception as e:
            return [{"error": str(e)}]

    if target_type in ['yellow', 'all']:
        results.extend(fetch_data("yellow", "yellow_tripdata_2024-01.parquet", "tpep_pickup_datetime"))
    
    if target_type in ['green', 'all']:
        results.extend(fetch_data("green", "green_tripdata_2024-01.parquet", "lpep_pickup_datetime"))

    # Return as JSON
    print(json.dumps(results))

if __name__ == "__main__":
    main()
