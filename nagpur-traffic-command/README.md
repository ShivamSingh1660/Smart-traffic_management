# AI-Based Traffic Risk Heatmap and Police Deployment Decision Support for Nagpur City

> **⚠️ SIMULATED DATA NOTICE:** This is a hackathon prototype. All traffic features, incidents, and risk scores are generated from synthetic data. No real police, CCTV, or live sensor data is used.

## Problem Statement
The Nagpur Traffic Police operate with limited personnel to monitor numerous junctions across the city. Traffic risks fluctuate dynamically throughout the day due to congestion, accidents, and localized events. Currently, there is no centralized system to identify which high-risk locations are critically unmanned, nor is there a data-driven way to optimally deploy limited officers and clearly explain the reasoning behind those assignments.

## What This Prototype Does
- **Risk Scoring:** An ML model predicts real-time traffic risk scores (0-100) and risk levels (Low, Medium, High, Critical) with explainability for top contributing factors.
- **Interactive Map:** A live React-Leaflet map displaying color-coded junctions, real-time risk layers, and explicit flags for high-risk unmanned locations.
- **Ranking & Location Detail:** A ranked feed of all monitored junctions with historical incident logs and detailed risk breakdown.
- **Deployment Recommendation:** A proportional + minimum-guarantee allocation algorithm that intelligently distributes available officers based on risk tiers and active incidents.
- **Dynamic Incident Simulation & Resolution:** A tool to inject simulated incidents (accidents, congestion, etc.) to watch the system dynamically recalculate risk and deployment needs in real-time. Incidents can be "Resolved" to mathematically reverse their risk impact and restore the baseline ML score.
- **Dynamic Force Size:** Total police force size can be dynamically set by the operator on the fly, flowing seamlessly into deployment math without artificial hard caps.
- **Emergency Dispatch:** An urgent dispatch system that pulls officers from a dedicated reserve pool first, falls back to borrowing from Low-risk locations if necessary, and automatically returns them to their original sources once the emergency is resolved.
- **Manual Override:** Allows operators to explicitly Accept, Modify, or Reject AI recommendations with an auditable log.

## System Architecture

```text
  ┌───────────────────────┐         ┌─────────────────────────┐
  │                       │  HTTP   │                         │
  │  Frontend (React)     │ ◄─────► │  Backend (FastAPI)      │
  │  UI / Leaflet Map     │         │  SQLite Database        │
  │                       │         │                         │
  └───────────────────────┘         └─────┬──────────────┬────┘
                                          │              │
                                          ▼              ▼
                               ┌─────────────────┐ ┌─────────────────┐
                               │                 │ │                 │
                               │  Risk Engine    │ │  Deployment     │
                               │  (ML Model)     │ │  Engine (Rules) │
                               │                 │ │                 │
                               └─────────────────┘ └─────────────────┘
```
**Important:** The system explicitly separates the ML model (which *only* predicts risk) from the Deployment Algorithm (which allocates resources based on strict, explainable rules). This ensures operational decisions are transparent and not obscured by a "black box" ML model.

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React (19.2.8), Vite (8.2.0), TailwindCSS (4.3.3) |
| **Map & Charts**| React-Leaflet (5.0.0), Recharts (3.10.1), Lucide-React |
| **Backend** | FastAPI, Uvicorn, Pydantic |
| **Database** | SQLite (via SQLAlchemy ORM) |
| **Machine Learning**| scikit-learn (RandomForestRegressor), pandas, numpy, joblib |

## How the ML Model Works
- **Model Type:** Random Forest Regressor (100 estimators, scikit-learn).
- **Features:** It predicts risk scores using inputs like time of day, congestion level, average speed, traffic volume, recent accidents, weather, and more.
- **Training Strategy:** Trained on synthetic time-series data. To prevent data leakage and simulate real forecasting, the data is split chronologically (Days 1-4 for training, Day 5 for testing).
- **Performance:** 
  - Test MAE: **1.55**
  - Test R²: **0.991**
- **Feature Importances (Top 3):**
  1. Recent Accidents (91.28%)
  2. Congestion Level (5.10%)
  3. Average Speed (1.54%)
- **Explainability:** For every location, the model's global feature importances are combined with the current feature values to produce a contribution breakdown per prediction, removing the "black box" effect.

## How the Deployment Algorithm Works
This is a **transparent, rule-based algorithm**, not an ML model. It works in the following steps:
1. **Minimum Coverage Guarantee:** Prioritizes giving at least 1 officer to every unmanned Critical/High risk location.
2. **Proportional Distribution:** Remaining officers are distributed across eligible locations (Medium/High/Critical) using the Hamilton apportionment (largest-remainder method) in proportion to their share of the total risk pool.
3. **Tier Caps:** Locations are capped at a maximum number of officers based on their tier (e.g., Critical max 5, Low max 1) to prevent over-allocation.
4. **Safety Check:** Ensures higher-tier risk locations strictly receive equal or more officers than lower-tier locations.

## How Emergency Dispatch Works
Unlike the global deployment recommendation, the emergency dispatch handles urgent, point-in-time requests:
- **Reserve Pool:** Always attempts to draw officers from the `TOTAL_FORCE_SIZE` unallocated reserve pool first.
- **Low-Risk Borrowing:** If the reserve pool is depleted, it dynamically borrows officers from the safest (Low-risk) locations one by one.
- **Auto-Returns:** Every time the location data is polled, the backend evaluates the current risk of the emergency target. If the risk has dropped to Medium or Low, the system automatically returns the borrowed officers to their original sources (whether that is the reserve pool or a specific junction) and alerts the dashboard.

## Project Structure
```text
nagpur-traffic-command/
├── backend/      # FastAPI server, SQLAlchemy models, and engine logic
├── frontend/     # React + Vite UI, Tailwind styling, and Leaflet maps
├── ml/           # Scripts to generate synthetic data and train the ML model
├── docs/         # API contracts, requirements, and demo scripts
└── README.md     # This file
```

## How to Run Locally

**1. Clone the repository**
```bash
git clone <repository-url>
cd nagpur-traffic-command
```

**2. Start the Backend**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
*(The SQLite database and tables will be created automatically on the first run, and the pre-trained ML model is already included in `backend/ml_artifacts/`)*

**3. Start the Frontend**
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
Visit `http://localhost:5173` in your browser.

## Cloud Deployment

This project is configured for easy deployment on free-tier cloud providers:
- **Frontend (Vercel):** The `frontend/vercel.json` file automatically rewrites all routes to `index.html` to perfectly support React Router's client-side routing on Vercel.
- **Backend (Render):** Because Render's free tier uses an ephemeral filesystem that wipes SQLite databases on every restart, `backend/main.py` includes a custom `@app.on_event("startup")` hook that automatically checks for an empty database and self-seeds the initial 18 locations, features, and incidents, ensuring seamless continuous deployments.

## Team & Contributions

| Name | Role / Area |
|---|---|
| [Name 1] | ML Model & Data Generation |
| [Name 2] | Backend & API |
| [Name 3] | Frontend & Map Integration |
| [Name 4] | Deployment & Dispatch Algorithms |
| [Name 5] | Integration, Testing & Demo |

## Known Limitations / Future Work
- **Simulated Data Dependency:** The current ML model and risk factors rely entirely on synthetic data. **Future Work:** Connect to real traffic sensor APIs (e.g., TomTom, Google Maps) and Nagpur city's CCTV feeds for live feature extraction.
- **Greedy Emergency Dispatch:** The fallback logic borrows from Low-risk locations based solely on risk score ascending. **Future Work:** Introduce geospatial awareness (e.g., routing algorithms) to borrow from the *closest* low-risk location to minimize officer transit time.
- **Historical Trends:** Currently, only real-time snapshots are analyzed. **Future Work:** Add a historical analytics dashboard to track predictive accuracy and incident trends over weeks/months.

---

**License / Disclaimer:**
*This is a hackathon prototype built for demonstration purposes only, using simulated data. Not intended for operational police use without further validation, real data integration, and safety review.*
