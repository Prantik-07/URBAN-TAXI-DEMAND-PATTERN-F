"""
export_to_tableau.py
======================
Converts the aggregated post-COVID taxi data (dashboard_data.js) 
into clean, ready-to-import CSV files for Tableau.
"""

import json
import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
JS_FILE = BASE_DIR / "dashboard_data.js"
TABLEAU_DIR = BASE_DIR / "outputs" / "tableau"

def main():
    print("🚕 Exporting data for Tableau...")
    TABLEAU_DIR.mkdir(parents=True, exist_ok=True)
    
    if not JS_FILE.exists():
        print(f"❌ Could not find {JS_FILE.name}! Run generate_dashboard_data.py first.")
        return

    # Read the JS file and extract the JSON part
    content = JS_FILE.read_text(encoding="utf-8")
    
    # Strip the JavaScript variable declaration
    prefix = "const DASHBOARD_DATA = "
    json_start = content.find(prefix)
    if json_start != -1:
        json_str = content[json_start + len(prefix):].strip()
        if json_str.endswith(";"):
            json_str = json_str[:-1]
    else:
        print("❌ Could not parse dashboard_data.js formatting.")
        return

    try:
        data = json.loads(json_str)
    except Exception as e:
        print(f"❌ JSON Parsing error: {e}")
        return

    # 1. Hourly Data
    if "hourly" in data:
        df_hourly = pd.DataFrame(data["hourly"])
        out_path = TABLEAU_DIR / "01_hourly_demand.csv"
        df_hourly.to_csv(out_path, index=False)
        print(f"✅ Saved Hourly Data: {out_path.name}")

    # 2. Daily Data
    if "daily" in data:
        df_daily = pd.DataFrame(data["daily"])
        out_path = TABLEAU_DIR / "02_daily_demand.csv"
        df_daily.to_csv(out_path, index=False)
        print(f"✅ Saved Daily Data: {out_path.name}")

    # 3. Monthly Volume & Revenue
    if "monthly" in data:
        df_monthly = pd.DataFrame(data["monthly"])
        # Split year and month for Tableau date parsing
        df_monthly[['year', 'month']] = df_monthly['key'].str.split('-', expand=True)
        out_path = TABLEAU_DIR / "03_monthly_volume_revenue.csv"
        df_monthly.to_csv(out_path, index=False)
        print(f"✅ Saved Monthly Data: {out_path.name}")

    # 4. Top Zones
    if "zones" in data:
        df_zones = pd.DataFrame(data["zones"])
        out_path = TABLEAU_DIR / "04_top_pickup_zones.csv"
        df_zones.to_csv(out_path, index=False)
        print(f"✅ Saved Zone Data: {out_path.name}")

    # 5. Weekly Data
    if "weekly" in data:
        df_weekly = pd.DataFrame(data["weekly"])
        out_path = TABLEAU_DIR / "05_day_of_week_demand.csv"
        df_weekly.to_csv(out_path, index=False)
        print(f"✅ Saved Weekly Data: {out_path.name}")
        
    # 6. Stats Summary
    if "stats" in data:
        df_stats = pd.DataFrame(data["stats"])
        out_path = TABLEAU_DIR / "06_statistical_distribution.csv"
        df_stats.to_csv(out_path, index=False)
        print(f"✅ Saved Statistical Data: {out_path.name}")

    print(f"\n🎉 Success! All Tableau CSV files are ready in: {TABLEAU_DIR.relative_to(BASE_DIR)}")
    print("👉 Simply drag these CSV files into Tableau to create your charts.")

if __name__ == "__main__":
    main()
