"""
utils.py — Shared Helpers for Urban Taxi Demand Pattern Analysis
================================================================
Functions used across all notebooks so we don't repeat code.
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path
from datetime import datetime


# ── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
DATA_RAW = BASE_DIR / "data" / "raw"
DATA_PROCESSED = BASE_DIR / "data" / "processed"
OUTPUT_EDA = BASE_DIR / "outputs" / "eda"
OUTPUT_TABLEAU = BASE_DIR / "outputs" / "tableau"


# ── Data Loading ─────────────────────────────────────────────────────────────
def load_raw(taxi_type: str, year: int, month: int) -> pd.DataFrame:
    """Load a raw parquet file for a given taxi type and time period.

    Parameters
    ----------
    taxi_type : str
        'yellow' or 'green'
    year : int
        Four-digit year (e.g. 2024)
    month : int
        Month number (1-12)

    Returns
    -------
    pd.DataFrame
    """
    filename = f"{taxi_type}_tripdata_{year}-{month:02d}.parquet"
    path = DATA_RAW / filename
    if not path.exists():
        raise FileNotFoundError(f"Raw file not found: {path}")
    return pd.read_parquet(path)


def load_cleaned(taxi_type: str, year: int, month: int) -> pd.DataFrame:
    """Load a cleaned parquet file for a given taxi type and time period.

    Parameters
    ----------
    taxi_type : str
        'yellow' or 'green'
    year : int
        Four-digit year (e.g. 2024)
    month : int
        Month number (1-12)

    Returns
    -------
    pd.DataFrame
    """
    filename = f"cleaned_{taxi_type}_{year}-{month:02d}.parquet"
    path = DATA_PROCESSED / filename
    if not path.exists():
        raise FileNotFoundError(f"Cleaned file not found: {path}")
    return pd.read_parquet(path)


# ── Logging ──────────────────────────────────────────────────────────────────
def log_row_counts(before: int, after: int, step: str) -> None:
    """Print before/after row counts so nothing disappears silently.

    Parameters
    ----------
    before : int
        Row count before the operation.
    after : int
        Row count after the operation.
    step : str
        Name of the cleaning step.
    """
    dropped = before - after
    pct = (dropped / before * 100) if before > 0 else 0.0
    print(f"  [{step}] Before: {before:,}  →  After: {after:,}  "
          f"(Dropped {dropped:,} rows, {pct:.2f}%)")


# ── Figure Saving ────────────────────────────────────────────────────────────
def save_figure(fig, name: str, folder: str = "outputs/eda") -> Path:
    """Save a Matplotlib figure as a timestamped PNG.

    Parameters
    ----------
    fig : matplotlib.figure.Figure
        The figure object to save.
    name : str
        Descriptive filename (without extension).
    folder : str
        Relative path from project root.

    Returns
    -------
    Path
        Absolute path to the saved file.
    """
    out_dir = BASE_DIR / folder
    out_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filepath = out_dir / f"{name}_{timestamp}.png"
    fig.savefig(filepath, dpi=150, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    print(f"  💾 Saved: {filepath.name}")
    return filepath


# ── Outlier Handling ─────────────────────────────────────────────────────────
def winsorize_col(
    df: pd.DataFrame,
    col: str,
    lower: float = 0.01,
    upper: float = 0.99,
) -> pd.DataFrame:
    """Clip a column to its lower–upper percentile range to reduce outlier
    impact.

    Parameters
    ----------
    df : pd.DataFrame
        Input DataFrame (not modified in-place).
    col : str
        Name of the column to winsorize.
    lower : float
        Lower quantile boundary (default 1st percentile).
    upper : float
        Upper quantile boundary (default 99th percentile).

    Returns
    -------
    pd.DataFrame
        A copy with the column clipped.
    """
    df = df.copy()
    lo = df[col].quantile(lower)
    hi = df[col].quantile(upper)
    df[col] = df[col].clip(lo, hi)
    return df


# ── Convenience ──────────────────────────────────────────────────────────────
def build_tlc_url(taxi_type: str, year: int, month: int) -> str:
    """Build the NYC TLC CDN download URL for a given month.

    Parameters
    ----------
    taxi_type : str
        'yellow' or 'green'
    year : int
        Four-digit year
    month : int
        Month number (1-12)

    Returns
    -------
    str
        Full CDN URL.
    """
    base = "https://d37ci6vzurychx.cloudfront.net/trip-data"
    return f"{base}/{taxi_type}_tripdata_{year}-{month:02d}.parquet"
