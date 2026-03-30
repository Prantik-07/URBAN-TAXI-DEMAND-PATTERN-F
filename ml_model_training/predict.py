"""
predict.py
==========
CLI prediction script. Called by Node.js backend via child_process.

Usage:
    python3 predict.py <taxi_type> <zone_id> <hour> <dow> <month>

Arguments:
    taxi_type : "yellow" or "green"
    zone_id   : integer pickup zone ID (1-265)
    hour      : integer 0-23
    dow       : integer 0-6 (0=Monday, 6=Sunday)
    month     : integer 1-12

Output (stdout):
    JSON object e.g. {"predicted_demand": 142, "zone_id": 161, ...}
"""

import sys
import json
import joblib
import numpy as np
from pathlib import Path

BASE_DIR  = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "outputs" / "models"

DOW_NAMES   = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
MONTH_NAMES = ["","January","February","March","April","May","June",
               "July","August","September","October","November","December"]

def predict(taxi_type, zone_id, hour, dow, month):
    model_path = MODEL_DIR / f"{taxi_type}_demand_model.pkl"

    if not model_path.exists():
        return {"error": f"Model not found: {model_path}. Run train_prediction_model.py first."}

    try:
        model = joblib.load(model_path)
    except Exception as e:
        return {"error": f"Failed to load model: {e}"}

    # Feature vector must match training: [PULocationID, pickup_hour, pickup_dow, pickup_month]
    X = np.array([[zone_id, hour, dow, month]])

    try:
        raw_pred = model.predict(X)[0]
        predicted = max(0, round(float(raw_pred)))
    except Exception as e:
        return {"error": f"Prediction failed: {e}"}

    # Confidence interval: use model's tree variance as a rough spread
    try:
        tree_preds = np.array([tree.predict(X)[0] for tree in model.estimators_])
        std = float(np.std(tree_preds))
        low  = max(0, round(predicted - std))
        high = round(predicted + std)
    except Exception:
        low, high = max(0, predicted - 10), predicted + 10

    return {
        "taxi_type":        taxi_type,
        "zone_id":          zone_id,
        "hour":             hour,
        "day_of_week":      DOW_NAMES[dow],
        "month":            MONTH_NAMES[month],
        "predicted_demand": predicted,
        "confidence_low":   low,
        "confidence_high":  high,
    }


if __name__ == "__main__":
    if len(sys.argv) != 6:
        print(json.dumps({"error": "Usage: predict.py <taxi_type> <zone_id> <hour> <dow> <month>"}))
        sys.exit(1)

    try:
        taxi_type = sys.argv[1]
        zone_id   = int(sys.argv[2])
        hour      = int(sys.argv[3])
        dow       = int(sys.argv[4])
        month     = int(sys.argv[5])
    except ValueError as e:
        print(json.dumps({"error": f"Invalid argument: {e}"}))
        sys.exit(1)

    if taxi_type not in ("yellow", "green"):
        print(json.dumps({"error": "taxi_type must be 'yellow' or 'green'"}))
        sys.exit(1)

    result = predict(taxi_type, zone_id, hour, dow, month)
    print(json.dumps(result))
