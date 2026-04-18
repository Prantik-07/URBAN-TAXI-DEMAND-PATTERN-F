# Urban Taxi Demand Pattern Analysis & Prediction 🚕

## 📌 Project Overview
This project provides a comprehensive analysis and predictive modeling of **NYC Yellow and Green taxi demand**. It transitions from raw data processing to a real-time analytical dashboard and a machine learning-powered demand forecasting engine.

The platform helps urban planners and fleet operators understand *when*, *where*, and *how* taxi demand fluctuates across New York City.

---

## 🚀 Key Features

### 1. **Predictive Analytics (ML)**
- **Demand Forecasting**: Random Forest Regressor models (88%+ R²) trained on 20+ million trip records.
- **Zone Rebalancer**: Real-time scanning of high-traffic zones to identify supply gaps.
- **Confidence Intervals**: Statistical bounding for prediction reliability.

### 2. **Analytical Dashboard (React)**
- **Bento-Grid Layout**: Modern, high-performance UI built with React and Vite.
- **Dynamic Data**: Real-time KPI tracking (Trip Volume, Revenue, Avg Distance).
- **Interactive Visuals**: Recharts-based hourly curves and weekly heatmaps.

### 3. **Smart Pricing**
- **Fare Estimator**: Real-time calculation using official 2024 NYC TLC rate cards, including peak surcharges, night fees, and taxes.

---

## 🗂️ Project Structure

```
urban-taxi-demand/
├── react_responsive_website/    # Frontend & Backend
│   ├── dashboard-ui/            # React + Vite Dashboard
│   └── dashboard-backend/       # Node.js API Bridge
├── ml_model_training/           # ML Pipeline
│   ├── data/                    # Processed datasets (parquet excluded)
│   ├── notebooks/               # EDA & Training Jupyter Notebooks
│   ├── outputs/models/          # Persisted .pkl models
│   ├── generate_dynamic_data.py # Automated pre-computation script
│   └── train_prediction_model.py # Model training script
├── project_docs/                # Design Specs (HLD, LLD, DFD, CFD)
├── html_js_dashboard/           # Legacy/Experimental static dashboard
├── requirements.txt             # Python dependencies
└── README.md
```

---

## 🛠️ Tech Stack

| Component | technologies |
|---|---|
| **Frontend** | React, Vite, Recharts, Lucide Icons, CSS3 (Glassmorphism) |
| **Backend** | Node.js (Express), Python Bridge |
| **ML/Data** | Scikit-Learn, Pandas, NumPy, PyArrow |
| **Design** | Figma (Mockups), Mermaid (Architecture Diagrams) |
| **Storage** | Apache Parquet (Raw), JSON (Pre-computed) |

---

## ⚙️ Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/shivaansh0610-LUFFY/Urban-Taxi-Demand-Pattern.git
cd Urban-Taxi-Demand-Pattern
```

### 2. Start the Backend API
```bash
cd react_responsive_website/dashboard-backend
npm install
node server.js
```

### 3. Launch the Dashboard UI
```bash
cd react_responsive_website/dashboard-ui
npm install
npm run dev
```

### 4. Machine Learning Pipeline (Optional)
To retrain models or generate new dashboard data from raw TLC files:
```bash
pip install -r ml_model_training/requirements.txt
python ml_model_training/generate_dynamic_data.py
```

---

## 📐 Design Documentation

Detailed technical documentation lives in the `/project_docs` directory:
- [High-Level Design (HLD)](./project_docs/HLD.md)
- [Low-Level Design (LLD)](./project_docs/LLD.md)
- [Data Flow Diagram (DFD)](./project_docs/Data_Flow_Diagram.md)
- [Consumer Flow Diagram (CFD)](./project_docs/Consumer_Flow_Diagram.md)

---

## 📄 License
This project is part of the OJT 2026 programme. Data is sourced from the [NYC TLC Trip Record Data](https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page).
