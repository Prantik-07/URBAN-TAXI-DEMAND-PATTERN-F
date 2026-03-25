# Consumer Flow Diagram
## Urban Taxi Demand Pattern Analysis

**Project:** Urban Taxi Demand Pattern &nbsp;|&nbsp; **Dataset:** NYC TLC Trip Records

---

## 1. Who Uses This System?

Not everyone interacts with the project the same way. A policy maker doesn't need to run a Jupyter Notebook — they just want the key findings on a slide. A taxi operations manager cares about peak hours, not statistical skewness. We've mapped five distinct personas who all consume the outputs of this pipeline in different ways.

| Consumer | Their Role | How They Primarily Interact |
|---|---|---|
| **Data Analyst** (Shivaansh / Prantik) | Builds and runs the full pipeline | Jupyter Notebooks + GitHub |
| **City Mobility Planner** | Looks at zone-level demand to guide infrastructure decisions | Tableau Dashboard |
| **Taxi Operations Team** | Uses demand data to optimise driver allocation and shift planning | Dashboard – Hourly Demand View |
| **Policy Maker** | Makes high-level transport decisions based on summarised insights | Final Report / Presentation |
| **Mentor / Reviewer** | Validates the methodology and assesses the project quality | GitHub Repo + Executive Summary |

---

## 2. The Big Picture — How Everyone Connects

```mermaid
flowchart TD
    subgraph Consumers
        A1["👨‍💻 Data Analyst"]
        A2["🏙️ City Planner"]
        A3["🚕 Taxi Ops Team"]
        A4["📋 Policy Maker"]
        A5["🎓 Mentor / Reviewer"]
    end

    subgraph System
        B1["Jupyter Notebooks\n(Pipeline)"]
        B2["Tableau Dashboard"]
        B3["Final Report / Slides"]
        B4["GitHub Repository"]
    end

    A1 -->|Runs pipeline| B1
    A1 -->|Commits code| B4
    B1 -->|Exports CSVs| B2
    B1 -->|Generates charts| B3
    A2 -->|Filters by zone/borough| B2
    A3 -->|Views hourly demand| B2
    A4 -->|Reviews insights| B3
    A5 -->|Validates code & logic| B4
    A5 -->|Reviews final output| B3
```

---

## 3. Individual Journeys

### 3.1 The Data Analyst (That's Us)

This is the most involved flow. We start from scratch — downloading the data, running every notebook, building the dashboard, and finally publishing the results.

```mermaid
flowchart LR
    S1["🌐 Visit NYC TLC Page"] --> S2["📥 Download Parquet Files\n(Yellow + Green)"]
    S2 --> S3["▶️ Run 01_data_ingestion.ipynb"]
    S3 --> S4["▶️ Run 02_data_cleaning.ipynb"]
    S4 --> S5["▶️ Run 03_eda.ipynb\n(Review EDA charts)"]
    S5 --> S6["▶️ Run 04_statistical_analysis.ipynb\n(Review distributions)"]
    S6 --> S7["▶️ Run 05_dashboard_export.ipynb"]
    S7 --> S8["📊 Open Tableau\nImport CSV exports"]
    S8 --> S9["🎨 Build Dashboard Views\n(Hourly, Zone, Monthly)"]
    S9 --> S10["📤 Publish Dashboard\n+ Push to GitHub"]
```

---

### 3.2 The City Mobility Planner

They arrive at a shareable Tableau link, apply filters relevant to their borough or time period of interest, and walk away with a zone-level insight they can use in urban planning conversations.

```mermaid
flowchart LR
    P1["🔗 Access Tableau\nDashboard Link"] --> P2["Select Borough\n& Date Range Filter"]
    P2 --> P3["View Zone-Level\nDemand Map"]
    P3 --> P4{"High-demand\nzone identified?"}
    P4 -->|Yes| P5["Export zone report\n(PDF / CSV)"]
    P4 -->|No| P6["Adjust filters\n(time/season)"]
    P6 --> P3
    P5 --> P7["Use in urban\nplanning decisions"]
```

---

### 3.3 The Taxi Operations Team

They're focused on a practical question: when and where should drivers be deployed? They use the hourly demand chart and zone rankings to fine-tune shift schedules.

```mermaid
flowchart LR
    O1["🔗 Access Dashboard"] --> O2["Select Date Range\n(last 30 days)"]
    O2 --> O3["View Hourly\nDemand Chart"]
    O3 --> O4["Identify AM/PM\nPeak Hours"]
    O4 --> O5["Cross-reference\nTop Pickup Zones"]
    O5 --> O6["Adjust Driver\nShift Schedule"]
    O6 --> O7["Monitor next period\nfor demand change"]
```

---

### 3.4 The Policy Maker

They're unlikely to open Tableau themselves. They receive the executive summary, review the key findings, and either move forward with a policy decision or ask the analyst team for a deeper dive on a specific question.

```mermaid
flowchart LR
    PM1["📄 Receive Executive\nSummary Document"] --> PM2["Review Key Findings\n(demand peaks, zones)"]
    PM2 --> PM3["View Presentation\nSlides"]
    PM3 --> PM4{"Need deeper\nanalysis?"}
    PM4 -->|Yes| PM5["Request specific\nTableau view from analyst"]
    PM4 -->|No| PM6["Proceed to\npolicy decisions"]
    PM5 --> PM2
```

---

### 3.5 The Mentor / Reviewer

They approach the project like a technical audit — cloning the repo, checking the structure, running the notebooks, and validating that the methodology is sound. If something's off, they raise feedback and the cycle repeats.

```mermaid
flowchart LR
    M1["🔗 Open GitHub Repo"] --> M2["Review README\n& folder structure"]
    M2 --> M3["Run notebooks\nin order (01→05)"]
    M3 --> M4{"Does it all\nwork correctly?"}
    M4 -->|Yes| M5["Approve submission"]
    M4 -->|No| M6["File GitHub Issue\nor comment feedback"]
    M6 --> M7["Analyst addresses\nfeedback"]
    M7 --> M3
```

---

## 4. Quick Reference — Who Goes Where

| Consumer | Entry Point | What They Do | What They Walk Away With |
|---|---|---|---|
| Data Analyst | TLC website / GitHub | Runs the full pipeline end-to-end | A published dashboard and clean codebase |
| City Planner | Tableau link | Filters by zone and date | A zonal insight for infrastructure planning |
| Taxi Ops Team | Tableau link | Views the hourly demand chart | An optimised driver shift schedule |
| Policy Maker | Emailed PDF / slides | Reads the summary findings | A data-backed basis for transport decisions |
| Mentor | GitHub repo link | Reviews code and reruns notebooks | Project approval or actionable feedback |
