"""
train_prediction_model.py
===========================
Trains separate machine learning models (Random Forest) for Yellow and Green taxis.
These models predict hourly demand (trip count) for a given pickup zone based on
time features (hour, day of week, month).

Usage:
    python train_prediction_model.py
"""

import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
import joblib
import warnings
warnings.filterwarnings('ignore')

BASE_DIR = Path(__file__).resolve().parent
DATA_RAW = BASE_DIR / "data" / "raw"
OUTPUT_DIR = BASE_DIR / "outputs" / "models"

def prepare_data(taxi_type, sample_files=6):
    """
    Reads the first `sample_files` for the given taxi_type from data/raw/
    and aggregates demand by (PULocationID, pickup_date, pickup_hour).
    """
    files = list(DATA_RAW.glob(f"{taxi_type}_tripdata_*.parquet"))
    if not files:
        return None
    
    # Use a sample of files to ensure memory stability and fast training
    # For a full production run, increase this, or train incrementally
    files = files[:sample_files]
    print(f"[{taxi_type.upper()}] Loading data from {len(files)} files...")
    
    dfs = []
    for f in files:
        try:
            # Column names differ slightly between yellow and green prior to cleaning
            col_pickup = "tpep_pickup_datetime" if taxi_type == "yellow" else "lpep_pickup_datetime"
            
            df = pd.read_parquet(f, columns=[col_pickup, "PULocationID"])
            df.columns = ["pickup_datetime", "PULocationID"]
            
            df["pickup_datetime"] = pd.to_datetime(df["pickup_datetime"], errors="coerce")
            df = df.dropna()
            
            # Post-COVID filter to match dashboard
            df = df[df["pickup_datetime"].dt.year >= 2022]
            
            # Extract features
            df["pickup_hour"] = df["pickup_datetime"].dt.hour
            df["pickup_dow"] = df["pickup_datetime"].dt.dayofweek
            df["pickup_month"] = df["pickup_datetime"].dt.month
            df["pickup_date"] = df["pickup_datetime"].dt.date
            
            # Aggregate to hourly demand per zone
            agg = df.groupby(["PULocationID", "pickup_date", "pickup_hour", "pickup_dow", "pickup_month"]).size().reset_index(name="demand")
            dfs.append(agg)
        except Exception as e:
            print(f"[{taxi_type.upper()}] Error reading {f.name}: {e}")
        
    if not dfs:
        return None
        
    final_df = pd.concat(dfs, ignore_index=True)
    # Further grouping across concatenated files (in case they span same days)
    final_df = final_df.groupby(["PULocationID", "pickup_hour", "pickup_dow", "pickup_month"])["demand"].mean().reset_index()
    return final_df

def train_model(taxi_type):
    print(f"--- Starting Pipeline for {taxi_type.upper()} Taxi ---")
    df = prepare_data(taxi_type)
    if df is None or len(df) == 0:
        print(f"[{taxi_type.upper()}] No data found in data/raw/. Please run generate_dashboard_data.py first.")
        print("-" * 50)
        return
        
    print(f"[{taxi_type.upper()}] Training set consists of {len(df):,} aggregated hourly records.")
    
    X = df[["PULocationID", "pickup_hour", "pickup_dow", "pickup_month"]]
    y = df["demand"]
    
    # 80-20 Train Test Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Train Model (Using subset of features, a deeper tree is fine)
    model = RandomForestRegressor(n_estimators=100, max_depth=15, min_samples_leaf=5, random_state=42, n_jobs=-1)
    
    print(f"[{taxi_type.upper()}] Fitting RandomForestRegressor...")
    model.fit(X_train, y_train)
    
    # Evaluation
    preds = model.predict(X_test)
    r2 = r2_score(y_test, preds)
    rmse = np.sqrt(mean_squared_error(y_test, preds))
    
    print(f"[{taxi_type.upper()}] Model Performance Metrics:")
    print(f"   ► R² Score: {r2:.4f} (1.0 is perfect)")
    print(f"   ► RMSE:     {rmse:.4f} trips/hour")
    
    # Save Model Artifact
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    model_path = OUTPUT_DIR / f"{taxi_type}_demand_model.pkl"
    joblib.dump(model, model_path)
    print(f"[{taxi_type.upper()}] ✅ Model saved to {model_path.relative_to(BASE_DIR)}")
    print("-" * 50 + "\n")

if __name__ == "__main__":
    print("\n🚕 Urban Taxi Demand - ML Prediction Model Training\n" + "="*50)
    train_model("yellow")
    train_model("green")
