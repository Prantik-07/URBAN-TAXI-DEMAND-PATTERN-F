"""
generate_dashboard_data.py
===========================
Downloads NYC TLC taxi trip data (post-COVID: 2022–2025), processes each file
one at a time for memory efficiency, and outputs aggregated data as a
JavaScript file that the dashboard reads directly.

Usage:
    python generate_dashboard_data.py

Output:
    dashboard_data.js  — embedded data for dashboard.html
"""

import requests
import pandas as pd
import numpy as np
from scipy import stats as sp_stats
from pathlib import Path
from time import sleep
import json
import sys

# ── Config ────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
DATA_RAW = BASE_DIR / "data" / "raw"
OUTPUT_DIR = BASE_DIR.parent / "html_js_dashboard"

TAXI_TYPES = ["yellow", "green"]
START_YEAR, START_MONTH = 2024, 1   # Exclude COVID-era data, start 2024
END_YEAR, END_MONTH = 2026, 12     # Will auto-skip months that aren't available

CDN = "https://d37ci6vzurychx.cloudfront.net/trip-data"

# ── Accumulators ──────────────────────────────────────────────────────────────
hourly_acc = {}        # {hour: trip_count}
daily_acc = {}         # {date_str: {trips, dist_sum, fare_sum, rev_sum, dur_sum}}
monthly_acc = {}       # {(year,month): {trips, dist_sum, fare_sum, rev_sum, dur_sum}}
zone_acc = {}          # {zone_id: {trips, dist_sum, fare_sum, rev_sum, dur_sum}}
weekly_acc = {}        # {dow: trip_count}  (0=Mon)
all_distances = []     # sampled distances for stats
all_durations = []     # sampled durations
all_fares = []         # sampled fares
all_totals = []        # sampled totals
all_speeds = []        # sampled speeds

total_raw = 0
total_clean = 0
files_processed = 0


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


def clean_df(df, taxi_type):
    """Minimal cleaning: rename cols, drop invalid, add features."""
    global total_raw, total_clean

    total_raw += len(df)

    # Standardise datetime columns
    if taxi_type == "yellow":
        df = df.rename(columns={
            "tpep_pickup_datetime": "pickup_datetime",
            "tpep_dropoff_datetime": "dropoff_datetime",
        })
    else:
        df = df.rename(columns={
            "lpep_pickup_datetime": "pickup_datetime",
            "lpep_dropoff_datetime": "dropoff_datetime",
        })

    # Ensure datetime
    df["pickup_datetime"] = pd.to_datetime(df["pickup_datetime"], errors="coerce")
    df["dropoff_datetime"] = pd.to_datetime(df["dropoff_datetime"], errors="coerce")

    # Key columns
    key_cols = ["pickup_datetime", "dropoff_datetime", "PULocationID", "DOLocationID"]
    df = df.dropna(subset=key_cols)

    # Valid timestamps
    df = df[df["dropoff_datetime"] > df["pickup_datetime"]]

    # ── Strict date bounds: only keep post-COVID data (2022-01-01 to 2026-01-01) ──
    date_min = pd.Timestamp("2022-01-01")
    date_max = pd.Timestamp("2026-01-01")
    df = df[(df["pickup_datetime"] >= date_min) & (df["pickup_datetime"] < date_max)]

    # Positive distance & fare
    if "trip_distance" in df.columns:
        df = df[df["trip_distance"] > 0]
    if "fare_amount" in df.columns:
        df = df[df["fare_amount"] >= 0]

    # Passenger count
    if "passenger_count" in df.columns:
        df = df[(df["passenger_count"] >= 1) & (df["passenger_count"] <= 6)]

    # Duration
    df["trip_duration_min"] = (
        (df["dropoff_datetime"] - df["pickup_datetime"]).dt.total_seconds() / 60
    )
    df = df[(df["trip_duration_min"] > 0) & (df["trip_duration_min"] <= 180)]

    # Speed
    if "trip_distance" in df.columns:
        df["speed_mph"] = np.where(
            df["trip_duration_min"] > 0,
            df["trip_distance"] / (df["trip_duration_min"] / 60),
            np.nan,
        )
        df = df[(df["speed_mph"].isna()) | (df["speed_mph"] <= 100)]

    # Winsorise distance & fare
    for col in ["trip_distance", "fare_amount", "total_amount"]:
        if col in df.columns:
            lo, hi = df[col].quantile(0.01), df[col].quantile(0.99)
            df[col] = df[col].clip(lo, hi)

    # Time features
    df["pickup_hour"] = df["pickup_datetime"].dt.hour
    df["pickup_dow"] = df["pickup_datetime"].dt.dayofweek
    df["pickup_date"] = df["pickup_datetime"].dt.strftime("%Y-%m-%d")
    df["pickup_month"] = df["pickup_datetime"].dt.month
    df["pickup_year"] = df["pickup_datetime"].dt.year

    df["taxi_type"] = taxi_type
    total_clean += len(df)
    return df


def accumulate(df):
    """Add this chunk's data to the running aggregates."""
    global all_distances, all_durations, all_fares, all_totals, all_speeds

    # Hourly
    for hour, count in df.groupby("pickup_hour").size().items():
        hourly_acc[hour] = hourly_acc.get(hour, 0) + count

    # Daily
    for date_str, grp in df.groupby("pickup_date"):
        if date_str not in daily_acc:
            daily_acc[date_str] = {"trips": 0, "dist": 0, "fare": 0, "rev": 0, "dur": 0}
        daily_acc[date_str]["trips"] += len(grp)
        if "trip_distance" in grp.columns:
            daily_acc[date_str]["dist"] += grp["trip_distance"].sum()
        if "fare_amount" in grp.columns:
            daily_acc[date_str]["fare"] += grp["fare_amount"].sum()
        if "total_amount" in grp.columns:
            daily_acc[date_str]["rev"] += grp["total_amount"].sum()
        daily_acc[date_str]["dur"] += grp["trip_duration_min"].sum()

    # Monthly
    for (y, m), grp in df.groupby(["pickup_year", "pickup_month"]):
        key = f"{y}-{m:02d}"
        if key not in monthly_acc:
            monthly_acc[key] = {"trips": 0, "dist": 0, "fare": 0, "rev": 0, "dur": 0}
        monthly_acc[key]["trips"] += len(grp)
        if "trip_distance" in grp.columns:
            monthly_acc[key]["dist"] += grp["trip_distance"].sum()
        if "fare_amount" in grp.columns:
            monthly_acc[key]["fare"] += grp["fare_amount"].sum()
        if "total_amount" in grp.columns:
            monthly_acc[key]["rev"] += grp["total_amount"].sum()
        monthly_acc[key]["dur"] += grp["trip_duration_min"].sum()

    # Zone
    for zone_id, grp in df.groupby("PULocationID"):
        zid = int(zone_id)
        if zid not in zone_acc:
            zone_acc[zid] = {"trips": 0, "dist": 0, "fare": 0, "rev": 0, "dur": 0}
        zone_acc[zid]["trips"] += len(grp)
        if "trip_distance" in grp.columns:
            zone_acc[zid]["dist"] += grp["trip_distance"].sum()
        if "fare_amount" in grp.columns:
            zone_acc[zid]["fare"] += grp["fare_amount"].sum()
        if "total_amount" in grp.columns:
            zone_acc[zid]["rev"] += grp["total_amount"].sum()
        zone_acc[zid]["dur"] += grp["trip_duration_min"].sum()

    # Weekly (day of week)
    for dow, count in df.groupby("pickup_dow").size().items():
        weekly_acc[dow] = weekly_acc.get(dow, 0) + count

    # Sample for stats (keep max 200k samples total to avoid memory issues)
    max_sample = min(5000, len(df))
    sample = df.sample(max_sample, random_state=42)
    if "trip_distance" in sample.columns:
        all_distances.extend(sample["trip_distance"].dropna().tolist())
    all_durations.extend(sample["trip_duration_min"].dropna().tolist())
    if "fare_amount" in sample.columns:
        all_fares.extend(sample["fare_amount"].dropna().tolist())
    if "total_amount" in sample.columns:
        all_totals.extend(sample["total_amount"].dropna().tolist())
    if "speed_mph" in sample.columns:
        all_speeds.extend(sample["speed_mph"].dropna().tolist())


def compute_stats():
    """Compute final statistical summaries."""
    results = []
    for name, data_list in [
        ("trip_distance", all_distances),
        ("trip_duration_min", all_durations),
        ("fare_amount", all_fares),
        ("total_amount", all_totals),
        ("speed_mph", all_speeds),
    ]:
        if not data_list:
            continue
        arr = np.array(data_list)
        arr = arr[np.isfinite(arr)]
        if len(arr) < 100:
            continue

        # Basic stats
        entry = {
            "feature": name,
            "mean": round(float(np.mean(arr)), 2),
            "median": round(float(np.median(arr)), 2),
            "std": round(float(np.std(arr)), 2),
            "skewness": round(float(sp_stats.skew(arr)), 3),
            "kurtosis": round(float(sp_stats.kurtosis(arr)), 2),
        }

        # Distribution fitting
        sample = arr[np.random.choice(len(arr), min(20000, len(arr)), replace=False)]
        best_dist, best_p = "unknown", 0
        for dist_name, dist_obj in [
            ("normal", sp_stats.norm),
            ("lognormal", sp_stats.lognorm),
            ("exponential", sp_stats.expon),
        ]:
            try:
                params = dist_obj.fit(sample)
                _, p = sp_stats.kstest(sample, dist_name, args=params)
                if p > best_p:
                    best_p, best_dist = p, dist_name
            except Exception:
                pass

        entry["best_fit_dist"] = best_dist
        entry["ks_pvalue"] = round(best_p, 4)
        results.append(entry)

    return results


def generate_js():
    """Write the final dashboard_data.js file."""
    # Hourly (averaged per day count)
    num_days = len(daily_acc)
    hourly_list = []
    for h in range(24):
        total = hourly_acc.get(h, 0)
        avg = round(total / max(1, num_days))
        hourly_list.append({"hour": h, "total": total, "avg": avg})

    # Daily sorted
    daily_sorted = sorted(daily_acc.items())
    daily_list = []
    for date_str, d in daily_sorted:
        n = d["trips"]
        daily_list.append({
            "date": date_str,
            "trips": n,
            "avg_dist": round(d["dist"] / max(1, n), 2),
            "avg_fare": round(d["fare"] / max(1, n), 2),
            "avg_dur": round(d["dur"] / max(1, n), 1),
            "revenue": round(d["rev"], 0),
        })

    # Monthly sorted
    monthly_sorted = sorted(monthly_acc.items())
    monthly_list = []
    month_names = {1:"Jan",2:"Feb",3:"Mar",4:"Apr",5:"May",6:"Jun",
                   7:"Jul",8:"Aug",9:"Sep",10:"Oct",11:"Nov",12:"Dec"}
    for key, d in monthly_sorted:
        y, m = int(key.split("-")[0]), int(key.split("-")[1])
        n = d["trips"]
        monthly_list.append({
            "key": key,
            "label": f"{month_names[m]} {y}",
            "trips": n,
            "avg_dist": round(d["dist"] / max(1, n), 2),
            "avg_fare": round(d["fare"] / max(1, n), 2),
            "revenue": round(d["rev"], 0),
        })

    # Zones sorted by trips
    zone_list = []
    for zid, d in sorted(zone_acc.items(), key=lambda x: x[1]["trips"], reverse=True):
        n = d["trips"]
        zone_list.append({
            "id": zid,
            "trips": n,
            "avg_dist": round(d["dist"] / max(1, n), 2),
            "avg_fare": round(d["fare"] / max(1, n), 2),
            "revenue": round(d["rev"], 0),
        })

    # Weekly
    dow_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    weekly_list = []
    for dow in range(7):
        total = weekly_acc.get(dow, 0)
        # Average per week
        num_weeks = max(1, num_days / 7)
        weekly_list.append({
            "day": dow_names[dow],
            "total": total,
            "avg": round(total / num_weeks),
        })

    # KPIs
    total_trips = sum(d["trips"] for d in daily_acc.values())
    avg_daily = round(total_trips / max(1, num_days))
    peak_hour = max(range(24), key=lambda h: hourly_acc.get(h, 0))
    total_rev = sum(d["rev"] for d in daily_acc.values())
    total_dist = sum(d["dist"] for d in daily_acc.values())
    total_fare = sum(d["fare"] for d in daily_acc.values())
    total_dur = sum(d["dur"] for d in daily_acc.values())

    kpis = {
        "total_trips": total_trips,
        "avg_daily": avg_daily,
        "peak_hour": peak_hour,
        "avg_distance": round(total_dist / max(1, total_trips), 2),
        "avg_fare": round(total_fare / max(1, total_trips), 2),
        "total_revenue": round(total_rev),
        "top_zone_id": zone_list[0]["id"] if zone_list else 0,
        "total_raw": total_raw,
        "total_clean": total_clean,
        "files_processed": files_processed,
        "date_range": f"{daily_sorted[0][0]} to {daily_sorted[-1][0]}" if daily_sorted else "",
    }

    # Stats
    stats_list = compute_stats()

    data = {
        "kpis": kpis,
        "hourly": hourly_list,
        "daily": daily_list,
        "monthly": monthly_list,
        "zones": zone_list,
        "weekly": weekly_list,
        "stats": stats_list,
    }

    js_content = f"// Auto-generated by generate_dashboard_data.py\nconst DASHBOARD_DATA = {json.dumps(data, indent=2)};\n"
    out_path = OUTPUT_DIR / "dashboard_data.js"
    out_path.write_text(js_content, encoding="utf-8")
    print(f"\n✅ Dashboard data saved to: {out_path}")
    print(f"   Total trips: {total_trips:,}")
    print(f"   Files processed: {files_processed}")
    print(f"   Date range: {kpis['date_range']}")


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    global files_processed

    DATA_RAW.mkdir(parents=True, exist_ok=True)

    # Build list of (year, month) to process
    months_to_process = []
    for year in range(START_YEAR, END_YEAR + 1):
        for month in range(1, 13):
            if year == START_YEAR and month < START_MONTH:
                continue
            if year == END_YEAR and month > END_MONTH:
                continue
            months_to_process.append((year, month))

    total_files = len(months_to_process) * len(TAXI_TYPES)
    print(f"🚕 Urban Taxi Demand — Data Pipeline")
    print(f"   Processing {len(months_to_process)} months × {len(TAXI_TYPES)} types = {total_files} files")
    print(f"   Range: {START_YEAR}-{START_MONTH:02d} → {END_YEAR}-{END_MONTH:02d}")
    print("=" * 60)

    for year, month in months_to_process:
        for taxi_type in TAXI_TYPES:
            filename = f"{taxi_type}_tripdata_{year}-{month:02d}.parquet"
            url = build_url(taxi_type, year, month)
            filepath = DATA_RAW / filename

            print(f"\n📦 [{files_processed+1}/{total_files}] {filename}")

            # Download
            if not download_file(url, filepath):
                print(f"    ⏭️  Skipping (download failed)")
                continue

            # Read & clean
            try:
                df = pd.read_parquet(filepath)
                print(f"    📊 Raw: {len(df):,} rows")
                df = clean_df(df, taxi_type)
                print(f"    🧹 Clean: {len(df):,} rows")

                if len(df) > 0:
                    accumulate(df)
                    files_processed += 1

                del df  # Free memory

            except Exception as e:
                print(f"    ❌ Error processing: {e}")
                continue

            # Periodically save progress (every 6 files)
            if files_processed > 0 and files_processed % 6 == 0:
                print(f"\n💾 Saving intermediate progress ({files_processed} files)...")
                generate_js()

    # Final output
    if files_processed > 0:
        generate_js()
    else:
        print("\n❌ No files were processed!")

    print("\n🎉 Pipeline complete!")


if __name__ == "__main__":
    main()
