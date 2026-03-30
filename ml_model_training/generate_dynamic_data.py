"""
generate_dynamic_data.py
========================
Downloads NYC TLC Yellow & Green taxi Parquet files for 2024–2026 (up to
whatever months exist), processes each file independently, and outputs a
single JSON file partitioned by "YYYY-MM" keys.

Output:
    react_responsive_website/dashboard-ui/public/data/dynamic_data.json

Structure:
{
  "available_months": ["2024-01", "2024-02", ...],
  "global": { kpis, zones },
  "2024-01": { kpis, hourly, weekly, zones },
  "2024-02": { ... },
  ...
}
"""

import requests
import pandas as pd
import numpy as np
from pathlib import Path
from time import sleep
import json
import sys

# ── Config ───────────────────────────────────────────────────────────────────
BASE_DIR    = Path(__file__).resolve().parent
DATA_RAW    = BASE_DIR / "data" / "raw"
REACT_DATA  = BASE_DIR.parent / "react_responsive_website" / "dashboard-ui" / "public" / "data"

TAXI_TYPES  = ["yellow", "green"]
START_YEAR, START_MONTH = 2024, 1
END_YEAR,   END_MONTH   = 2026, 12

CDN = "https://d37ci6vzurychx.cloudfront.net/trip-data"

MONTH_NAMES = {
    1:"Jan", 2:"Feb", 3:"Mar", 4:"Apr", 5:"May", 6:"Jun",
    7:"Jul", 8:"Aug", 9:"Sep", 10:"Oct", 11:"Nov", 12:"Dec"
}
DOW_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


# ── Download helpers ──────────────────────────────────────────────────────────
def build_url(taxi_type, year, month):
    return f"{CDN}/{taxi_type}_tripdata_{year}-{month:02d}.parquet"


def download_file(url, path, retries=3):
    """Download with retries. Returns True if successful."""
    if path.exists():
        print(f"    ✅ Cached: {path.name}")
        return True
    for attempt in range(1, retries + 1):
        try:
            print(f"    ⬇️  Downloading (attempt {attempt}): {path.name}")
            r = requests.get(url, stream=True, timeout=120)
            r.raise_for_status()
            with open(path, "wb") as f:
                for chunk in r.iter_content(chunk_size=131072):
                    f.write(chunk)
            mb = path.stat().st_size / 1e6
            print(f"    ✅ Saved ({mb:.1f} MB)")
            return True
        except Exception as e:
            print(f"    ⚠️  Failed: {e}")
            if path.exists():
                path.unlink()
            if attempt < retries:
                sleep(2 ** attempt)
    return False


# ── Data cleaning ─────────────────────────────────────────────────────────────
def clean_df(df, taxi_type, year, month):
    """Rename cols, drop invalid rows, add feature columns."""
    if taxi_type == "yellow":
        df = df.rename(columns={
            "tpep_pickup_datetime":  "pickup_datetime",
            "tpep_dropoff_datetime": "dropoff_datetime",
        })
    else:
        df = df.rename(columns={
            "lpep_pickup_datetime":  "pickup_datetime",
            "lpep_dropoff_datetime": "dropoff_datetime",
        })

    df["pickup_datetime"]  = pd.to_datetime(df["pickup_datetime"],  errors="coerce")
    df["dropoff_datetime"] = pd.to_datetime(df["dropoff_datetime"], errors="coerce")

    # Drop rows missing critical columns
    df = df.dropna(subset=["pickup_datetime", "dropoff_datetime", "PULocationID"])

    # Only keep rows that genuinely belong to this year-month
    date_min = pd.Timestamp(f"{year}-{month:02d}-01")
    date_max = date_min + pd.offsets.MonthEnd(1) + pd.Timedelta(days=1)
    df = df[(df["pickup_datetime"] >= date_min) & (df["pickup_datetime"] < date_max)]

    # Valid trip direction
    df = df[df["dropoff_datetime"] > df["pickup_datetime"]]

    # Duration filter (0 < dur < 3 hours)
    df["trip_duration_min"] = (
        (df["dropoff_datetime"] - df["pickup_datetime"]).dt.total_seconds() / 60
    )
    df = df[(df["trip_duration_min"] > 0) & (df["trip_duration_min"] <= 180)]

    # Positive distance & fare
    if "trip_distance" in df.columns:
        df = df[df["trip_distance"] > 0]
        lo, hi = df["trip_distance"].quantile(0.01), df["trip_distance"].quantile(0.99)
        df["trip_distance"] = df["trip_distance"].clip(lo, hi)
    if "fare_amount" in df.columns:
        df = df[df["fare_amount"] >= 0]

    # Time features
    df["pickup_hour"] = df["pickup_datetime"].dt.hour
    df["pickup_dow"]  = df["pickup_datetime"].dt.dayofweek
    df["pickup_date"] = df["pickup_datetime"].dt.strftime("%Y-%m-%d")

    return df


# ── Aggregation helpers ───────────────────────────────────────────────────────
def aggregate_month(df):
    """Return a compact dict of aggregates for one month's data."""
    n = len(df)
    if n == 0:
        return None

    # KPIs
    total_trips = n
    avg_dist = round(df["trip_distance"].mean(), 2) if "trip_distance" in df.columns else 0
    avg_fare = round(df["fare_amount"].mean(),   2) if "fare_amount"   in df.columns else 0
    avg_dur  = round(df["trip_duration_min"].mean(), 1)
    num_days = df["pickup_date"].nunique()
    avg_daily = round(total_trips / max(1, num_days))
    peak_hour = int(df.groupby("pickup_hour").size().idxmax())

    kpis = {
        "total_trips": total_trips,
        "avg_daily":   avg_daily,
        "peak_hour":   peak_hour,
        "avg_distance": avg_dist,
        "avg_fare":    avg_fare,
        "avg_duration": avg_dur,
    }

    # Hourly (average trips per day at each hour)
    hourly = []
    hourly_counts = df.groupby("pickup_hour").size()
    for h in range(24):
        cnt = int(hourly_counts.get(h, 0))
        hourly.append({"hour": h, "avg": round(cnt / max(1, num_days))})

    # Weekly (average trips per day-of-week)
    weekly = []
    dow_counts = df.groupby("pickup_dow").size()
    total_weeks = max(1, num_days / 7)
    for d in range(7):
        cnt = int(dow_counts.get(d, 0))
        weekly.append({"day": DOW_NAMES[d], "avg": round(cnt / total_weeks)})

    # Top 10 zones
    zone_groups = df.groupby("PULocationID").agg(
        trips=("pickup_hour", "count"),
        avg_dist=("trip_distance", "mean") if "trip_distance" in df.columns else ("pickup_hour", "count"),
        avg_fare=("fare_amount",   "mean") if "fare_amount"   in df.columns else ("pickup_hour", "count"),
    ).reset_index().sort_values("trips", ascending=False).head(10)

    zones = []
    for _, row in zone_groups.iterrows():
        zones.append({
            "id":       int(row["PULocationID"]),
            "trips":    int(row["trips"]),
            "avg_dist": round(float(row.get("avg_dist", 0)), 2),
            "avg_fare": round(float(row.get("avg_fare", 0)), 2),
        })

    return {"kpis": kpis, "hourly": hourly, "weekly": weekly, "zones": zones}


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    DATA_RAW.mkdir(parents=True, exist_ok=True)
    REACT_DATA.mkdir(parents=True, exist_ok=True)

    # Build schedule
    months_to_process = []
    for year in range(START_YEAR, END_YEAR + 1):
        for month in range(1, 13):
            if year == START_YEAR and month < START_MONTH:
                continue
            if year == END_YEAR and month > END_MONTH:
                continue
            months_to_process.append((year, month))

    result      = {}   # keyed by "YYYY-MM"
    global_zone = {}   # aggregated zone counts across all months

    total_combos = len(months_to_process) * len(TAXI_TYPES)
    print(f"🚕 TaxiPulse — Dynamic Data Pipeline")
    print(f"   {len(months_to_process)} months × {len(TAXI_TYPES)} types = {total_combos} files")
    print("=" * 60)

    counter = 0
    for year, month in months_to_process:
        key = f"{year}-{month:02d}"
        frames = []

        for taxi_type in TAXI_TYPES:
            counter += 1
            filename = f"{taxi_type}_tripdata_{year}-{month:02d}.parquet"
            url      = build_url(taxi_type, year, month)
            filepath = DATA_RAW / filename

            print(f"\n📦 [{counter}/{total_combos}] {filename}")

            if not download_file(url, filepath):
                print(f"    ⏭️  Skipping (not available yet)")
                continue

            try:
                df = pd.read_parquet(filepath)
                print(f"    📊 Raw rows: {len(df):,}")
                df = clean_df(df, taxi_type, year, month)
                print(f"    🧹 Clean rows: {len(df):,}")
                if len(df) > 0:
                    frames.append(df)
            except Exception as e:
                print(f"    ❌ Error: {e}")
                continue

        if frames:
            combined = pd.concat(frames, ignore_index=True)
            agg = aggregate_month(combined)
            if agg:
                result[key] = agg
                print(f"    ✅ Stored {key}: {agg['kpis']['total_trips']:,} trips")

                # Accumulate global zone counts
                for z in agg["zones"]:
                    zid = z["id"]
                    global_zone[zid] = global_zone.get(zid, 0) + z["trips"]

            del combined

    if not result:
        print("\n❌ No data processed — check your internet connection.")
        sys.exit(1)

    # Build global top zones
    top_global = sorted(global_zone.items(), key=lambda x: x[1], reverse=True)[:10]
    global_zones = [{"id": zid, "trips": trips} for zid, trips in top_global]

    # Build available_months list (sorted)
    available_months = sorted(result.keys())

    output = {
        "available_months": available_months,
        "global": {"zones": global_zones},
        **result
    }

    out_path = REACT_DATA / "dynamic_data.json"
    out_path.write_text(json.dumps(output, indent=2), encoding="utf-8")

    size_mb = out_path.stat().st_size / 1e6
    print(f"\n✅ Written: {out_path}")
    print(f"   Months processed: {len(available_months)}")
    print(f"   File size: {size_mb:.1f} MB")
    print("\n🎉 Pipeline complete! Restart your Vite dev server.")


if __name__ == "__main__":
    main()
