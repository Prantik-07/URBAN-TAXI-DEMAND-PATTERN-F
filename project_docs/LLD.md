# Low-Level Design (LLD)
## Urban Taxi Demand Pattern Analysis

**Project:** Urban Taxi Demand Pattern &nbsp;|&nbsp; **Dataset:** NYC TLC Trip Records

---

## 1. How the Pipeline Is Organised

Rather than dumping everything into one giant script, we split the work across **five focused Jupyter Notebooks** and a small **shared utilities file**. Each notebook has a single job, which makes it easy to re-run just one stage if something goes wrong without touching the rest.

| Notebook | What It Does | Libraries |
|---|---|---|
| `01_data_ingestion.ipynb` | Downloads and loads raw Parquet files | `requests`, `pyarrow` |
| `02_data_cleaning.ipynb` | Cleans, validates, and engineers new features | `pandas`, `numpy` |
| `03_eda.ipynb` | Explores the data and creates charts | `pandas`, `matplotlib`, `seaborn` |
| `04_statistical_analysis.ipynb` | Fits distributions and flags outliers | `scipy`, `numpy` |
| `05_dashboard_export.ipynb` | Aggregates the data and exports CSVs for Tableau | `pandas` |
| `utils.py` | Shared helper functions used across all notebooks | `pandas`, `pathlib` |

---

## 2. Notebook 1 – Pulling the Data (`01_data_ingestion.ipynb`)

### What goes in, what comes out

```
Input:  Monthly Parquet file URLs from the NYC TLC CDN
Output: Raw .parquet files saved to /data/raw/
```

### Functions

| Function | Signature | What It Does |
|---|---|---|
| `build_url` | `(taxi_type: str, year: int, month: int) → str` | Builds the correct CDN download URL for a given month |
| `download_file` | `(url: str, save_path: Path) → None` | Downloads the file with up to 3 retry attempts |
| `load_parquet` | `(file_path: Path) → pd.DataFrame` | Reads a Parquet file into a Pandas DataFrame |
| `validate_schema` | `(df: pd.DataFrame, taxi_type: str) → bool` | Checks that the expected columns are all present |

### URL patterns we use

```
Yellow: https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_{YYYY}-{MM}.parquet
Green:  https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_{YYYY}-{MM}.parquet
```

### What the raw data looks like (Yellow Taxi)

| Column | Type | What It Means |
|---|---|---|
| `VendorID` | int | Which tech provider submitted the record |
| `tpep_pickup_datetime` | datetime | When the trip started |
| `tpep_dropoff_datetime` | datetime | When the trip ended |
| `passenger_count` | float | Number of passengers on board |
| `trip_distance` | float | Distance travelled (in miles) |
| `PULocationID` | int | Pickup zone (one of 265 TLC zones) |
| `DOLocationID` | int | Drop-off zone |
| `fare_amount` | float | The base fare before extras |
| `total_amount` | float | Everything included — fare, tips, tolls |

> **Green Taxi note:** The schema is identical, just with `lpep_pickup_datetime` and `lpep_dropoff_datetime` instead.

---

## 3. Notebook 2 – Cleaning It Up (`02_data_cleaning.ipynb`)

### What goes in, what comes out

```
Input:  Raw DataFrames from Notebook 1
Output: Cleaned Parquet files → /data/processed/cleaned_{type}_{YYYY}-{MM}.parquet
```

### The cleaning pipeline runs in this order

```mermaid
flowchart LR
    A[Load Raw DF] --> B[Drop Nulls on Key Cols]
    B --> C[Filter Invalid Timestamps]
    C --> D[Remove Negative Fares/Distances]
    D --> E[Cap Outliers – IQR Method]
    E --> F[Add Derived Columns]
    F --> G[Normalize Column Names]
    G --> H[Save Cleaned Parquet]
```

### What we check and why

| Check | Rule We Apply | What Happens |
|---|---|---|
| Missing values | Drop any row where pickup/dropoff time or zone IDs are null | `dropna(subset=[...])` |
| Impossible timestamps | If drop-off is before or equal to pickup, that trip can't be real | Drop it |
| Negative fares | A fare below zero isn't valid | Drop it |
| Zero distance with a fare | Likely a system glitch — flagged for investigation | Flag & review |
| Extreme distances | Anything beyond Q3 + 3×IQR is an outlier | Winsorise or drop |
| Very long trips | Trips over 3 hours are almost certainly errors | Drop them |
| Passenger count | Zero passengers or more than 6 don't make sense | Drop them |

### New columns we create (feature engineering)

| New Column | How It's Calculated | Type |
|---|---|---|
| `trip_duration_min` | `(dropoff − pickup).total_seconds() / 60` | float |
| `pickup_hour` | Hour of day extracted from pickup timestamp | int (0–23) |
| `pickup_day_of_week` | Day of week (0 = Monday) | int |
| `pickup_date` | Just the date portion | date |
| `pickup_month` | Month number | int (1–12) |
| `speed_mph` | `trip_distance / (trip_duration_min / 60)` | float |
| `taxi_type` | Whether the record came from Yellow or Green | str |

---

## 4. Notebook 3 – Exploring the Data (`03_eda.ipynb`)

### What goes in, what comes out

```
Input:  Cleaned Parquet files
Output: Charts saved as PNGs → /outputs/eda/
```

### The questions we're trying to answer

| Question | Chart Type | Key Insight We're After |
|---|---|---|
| When is demand highest? | Hourly line chart | Morning and evening rush peaks |
| Does demand change by day? | Bar chart | Weekday vs. weekend behaviour |
| Are there seasonal patterns? | Monthly line chart or heatmap | Summer vs. winter demand |
| How far do people typically travel? | Histogram + KDE | Most common trip lengths |
| Are there unusually long rides? | Box plot | Outliers in trip duration |
| Which zones get the most pickups? | Choropleth / bar chart | Top 10 demand hotspots |
| Where is the fare revenue concentrated? | Histogram | High-value vs. short-haul split |

### Functions in this notebook

| Function | What It Produces |
|---|---|
| `plot_hourly_demand(df)` | A 24-hour demand line chart |
| `plot_weekly_heatmap(df)` | Hour × day-of-week intensity heatmap |
| `plot_top_zones(df, n=10)` | Bar chart of the top n pickup zones |
| `distribution_summary(df, col)` | Mean, median, standard deviation, skew, kurtosis |

---

## 5. Notebook 4 – Statistical Analysis (`04_statistical_analysis.ipynb`)

### What goes in, what comes out

```
Input:  Cleaned DataFrames
Output: Distribution parameters, test results, outlier flag tables
```

### Tests we run

| Test | Library | What We Apply It To |
|---|---|---|
| Skewness & Kurtosis | `scipy.stats` | Trip distance, duration, and fare — to understand how "lumpy" the data is |
| Distribution Fitting | `scipy.stats.fit` | We try normal, log-normal, and Poisson fits on demand counts |
| Goodness-of-Fit (KS test) | `scipy.stats.kstest` | Checks whether the fitted distribution actually describes the data well |
| Outlier Detection | IQR + Z-score | Every numeric column — flags extreme values |
| Pearson Correlation | `pandas.corr()` | Does distance predict fare? Does duration predict speed? |
| Time-Series Aggregation | `resample()` | Rolls data up to daily and weekly demand totals |

### What the results table looks like

| Field | Type | Example |
|---|---|---|
| `feature` | str | `"trip_distance"` |
| `mean` | float | `3.21` miles |
| `median` | float | `2.40` miles |
| `std` | float | `2.88` |
| `skewness` | float | `4.12` (right-skewed, as expected) |
| `kurtosis` | float | `28.4` (heavy tails) |
| `best_fit_dist` | str | `"lognormal"` |
| `ks_pvalue` | float | `0.087` (above 0.05 = acceptable fit) |

---

## 6. Notebook 5 – Exporting for Tableau (`05_dashboard_export.ipynb`)

### What goes in, what comes out

```
Input:  Cleaned + analysed DataFrames
Output: Aggregated CSVs → /outputs/tableau/
```

### CSVs we produce and what Tableau does with them

| File | How It's Aggregated | Used For |
|---|---|---|
| `demand_hourly.csv` | Trips per hour per day | Hourly demand line chart |
| `demand_daily.csv` | Trips per date | Calendar heatmap |
| `demand_zone.csv` | Trips per taxi zone | Zone-level demand map |
| `stats_summary.csv` | Distribution stats per feature | KPI summary cards |
| `demand_monthly.csv` | Trips per month | Seasonal trend chart |

---

## 7. Shared Helpers (`utils.py`)

These functions are used across notebooks so we don't repeat code:

```python
def load_cleaned(taxi_type: str, year: int, month: int) -> pd.DataFrame:
    """Load a cleaned parquet file for a given taxi type and time period."""

def log_row_counts(before: int, after: int, step: str) -> None:
    """Print before/after row counts so nothing disappears silently."""

def save_figure(fig, name: str, folder: str = "outputs/eda") -> None:
    """Save a Matplotlib figure as a timestamped PNG."""

def winsorize_col(df: pd.DataFrame, col: str, lower=0.01, upper=0.99) -> pd.DataFrame:
    """Clip a column to its 1st–99th percentile range to reduce outlier impact."""
```

---

## 8. Folder Structure

```
urban-taxi-demand/
├── data/
│   ├── raw/                    # Untouched .parquet files from TLC
│   └── processed/              # Cleaned, feature-engineered .parquet files
├── notebooks/
│   ├── 01_data_ingestion.ipynb
│   ├── 02_data_cleaning.ipynb
│   ├── 03_eda.ipynb
│   ├── 04_statistical_analysis.ipynb
│   └── 05_dashboard_export.ipynb
├── outputs/
│   ├── eda/                    # Saved chart PNGs
│   └── tableau/                # CSV files for Tableau import
├── utils.py
├── requirements.txt
└── README.md
```

---

## 9. Error Handling

We don't want silent failures. Here's how we handle the most likely problems:

| Problem | Our Response |
|---|---|
| Network fails during download | Retry up to 3 times with exponential backoff before giving up |
| A required column is missing | Raise a clear `KeyError`, log the filename, and skip that file |
| All rows get dropped during cleaning | Raise a `ValueError` — something has gone seriously wrong, halt the pipeline |
| File too large for memory | Read in chunks using `pd.read_parquet(chunksize=...)` |
| Division by zero when computing speed | Replace `inf` values with `NaN` and exclude from speed-related analysis |
