# 🚕 Urban Taxi Demand Pattern Analysis

**Team:** Shivaansh Pandey & Prantik  
**Mentor:** Navneet Nautiyal  
**Dataset:** [NYC TLC Trip Records](https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page)

---

## 📌 Overview

This project analyses **Yellow and Green taxi demand patterns** across New York City using the NYC Taxi & Limousine Commission (TLC) trip records. We uncover *when*, *where*, and *how often* people hail cabs — and package the insights into a **Tableau dashboard** and a **final report** for stakeholders.

The entire pipeline is **batch-based**, reproducible, and runs on a standard laptop.

---

## 🗂️ Project Structure

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
├── readme/                     # Design documents (HLD, LLD, DFD, CFD)
├── utils.py                    # Shared helper functions
├── requirements.txt
└── README.md
```

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/urban-taxi-demand.git
cd urban-taxi-demand
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Run the pipeline
Execute the notebooks **in order**:
```
01_data_ingestion.ipynb   →  Downloads raw .parquet files
02_data_cleaning.ipynb    →  Cleans data & engineers features
03_eda.ipynb              →  Generates EDA charts
04_statistical_analysis   →  Fits distributions & detects outliers
05_dashboard_export.ipynb →  Exports aggregated CSVs for Tableau
```

---

## 🛠️ Tech Stack

| Category | Tools |
|---|---|
| Language | Python 3.10+ |
| Data Wrangling | Pandas, NumPy |
| Statistics | SciPy |
| Visualisation | Matplotlib, Seaborn |
| Dashboard | Tableau Public |
| Data Format | Apache Parquet |
| Version Control | Git + GitHub |

---

## 📊 Key Analyses

- **Hourly demand peaks** — Morning and evening rush patterns
- **Day-of-week trends** — Weekday vs. weekend behaviour
- **Seasonal variation** — Monthly demand across the year
- **Zone-level hotspots** — Top pickup locations in NYC
- **Distribution fitting** — Normal, Log-Normal, Poisson fits with KS tests
- **Outlier detection** — IQR and Z-score methods

---

## 📄 Design Documents

| Document | Description |
|---|---|
| [HLD](readme/HLD.md) | High-Level Design — the big-picture architecture |
| [LLD](readme/LLD.md) | Low-Level Design — modules, functions, schemas |
| [Consumer Flow](readme/Consumer_Flow_Diagram.md) | Who uses this system and how |
| [Data Flow](readme/Data_Flow_Diagram.md) | The journey every row of data takes |

---

## 📝 License

This project is for academic purposes as part of the OJT programme.
