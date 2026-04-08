# YieldVision · Semiconductor Analytics + Yield Prediction

A full-stack semiconductor manufacturing analytics platform with a live ML-powered yield failure prediction model — built with React, Python FastAPI, and scikit-learn, deployed on Vercel + Render.

🌐 **[Live Demo](https://yieldvision.vercel.app)** · 💻 **[GitHub](https://github.com/pujithabobbili/yieldvision)**

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Recharts |
| Backend | Python FastAPI (REST API) |
| ML Model | scikit-learn (GBM + SMOTE + Platt calibration) |
| Data | Simulated fab data + SECOM dataset (UCI ML Repository) |
| Charts | Recharts (LineChart, BarChart, RadarChart, AreaChart, ComposedChart) |
| Styling | Custom CSS variables (dark industrial theme) |
| Deployment | Vercel (frontend) + Render (backend) |
| Monitoring | UptimeRobot (99%+ uptime via health check pings) |

---

## 📊 Features — 6 Pages

### 1. Overview Dashboard
- 6 live KPI cards (Overall Yield, Wafers Today, Active Lots, Critical Defects, Equipment Health)
- 14-day aggregate yield trend line chart
- Process step performance bar chart
- Multi-metric radar chart (yield vs. equipment utilization)

### 2. Yield Trend Analysis
- Per-product yield trends over 7–90 day windows
- Defect density area chart over time
- Wafers processed per day volume chart
- Product filter for focused analysis

### 3. Lot Explorer
- Sortable, filterable table of production lots
- Filter by status (Complete / In Progress / On Hold) and product
- Lot ID search with color-coded yield thresholds (green ≥92%, amber ≥85%, red <85%)

### 4. Wafer Defect Map
- Interactive 20×20 die-level defect map per wafer
- 6 defect types with unique colors (Particle, Scratch, Bridging, Open Circuit, Pattern Defect, Contamination)
- Edge effect modeled — defect probability increases with distance from wafer center
- Hover tooltip showing defect type and coordinates

### 5. Defect Analysis
- Pareto chart (80/20 rule) with cumulative % overlay
- Equipment utilization horizontal bar chart by process step
- Process metrics table: throughput, defect rate, MTBF, yield

### 6. Yield Failure Prediction (ML)
- Trained on SECOM dataset (1,253 samples, 314 features, 6.62% failure rate)
- Pipeline: variance filtering → SMOTE → Gradient Boosting + Platt calibration
- **ROC-AUC: 0.69 · PR-AUC: 0.15** (2× gain over majority-class baseline)
- Live PASS/FAIL prediction with failure probability + confidence score
- Top 10 contributing sensors shown as interactive bar chart
- ROC Curve and Precision-Recall Curve rendered from real model metrics

---

## 🔌 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/summary` | KPI summary metrics |
| `GET /api/yield-trend?days=30&product=KLA-9200` | Yield over time |
| `GET /api/lots?status=Complete&product=KLA-7000` | Lot data |
| `GET /api/wafer/{lot_id}/{wafer_num}` | Wafer defect map |
| `GET /api/defect-pareto` | Defect type breakdown |
| `GET /api/process-metrics` | Per-step process stats |
| `GET /api/predict-sample` | Run live yield prediction on random wafer |
| `GET /api/model-metrics` | ROC/PR curve data + model info |
| `GET /docs` | Swagger UI |

---

## 🛠 Running Locally

### Prerequisites
- Python 3.11+
- Node.js 18+

### Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
python train_model.py        # Train and save the ML model (run once)
uvicorn main:app --reload --port 8000
```
API live at `http://localhost:8000` · Swagger docs at `http://localhost:8000/docs`

### Frontend (React)
```bash
cd frontend
npm install
npm run dev
```
App live at `http://localhost:3000`

---

## ☁️ Deployment

| Service | Platform | URL |
|---------|----------|-----|
| Frontend | Vercel | https://yieldvision.vercel.app |
| Backend API | Render (Python 3.11) | https://yieldvision-api.onrender.com |

**Environment variable required on Vercel:**
```
VITE_API_URL=https://yieldvision-api.onrender.com
```

**Render start command:**
```
uvicorn main:app --host 0.0.0.0 --port $PORT
```

---

## 📁 Project Structure

```
yieldvision/
├── backend/
│   ├── main.py                  # FastAPI app + all endpoints
│   ├── train_model.py           # ML pipeline training script
│   ├── yield_model.pkl          # Trained GBM model (Platt calibrated)
│   ├── selected_features.json   # Feature indices after variance filtering
│   ├── model_metrics.json       # ROC/PR curve data
│   ├── secom.data               # SECOM dataset (UCI ML Repository)
│   ├── secom_labels.data        # SECOM labels
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Overview.jsx         # KPI + summary charts
    │   │   ├── YieldTrend.jsx       # Time-series analysis
    │   │   ├── LotTable.jsx         # Sortable data table
    │   │   ├── WaferMap.jsx         # Interactive die map
    │   │   ├── DefectAnalysis.jsx   # Pareto + process metrics
    │   │   └── YieldPrediction.jsx  # ML prediction page
    │   ├── hooks/
    │   │   └── useApi.js            # Data fetching hook
    │   ├── App.jsx                  # Navigation + layout
    │   ├── App.css                  # Design system
    │   └── main.jsx
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## 💡 Why This Project

Built to demonstrate skills directly relevant to semiconductor equipment engineering:

- **Data pipelines** — FastAPI backend simulates a real fab inspection data pipeline with transformation and aggregation
- **React frontend** — Component-based UI with real-time fetching, filtering, sorting, and custom hooks
- **ML engineering** — End-to-end model pipeline: preprocessing → class balancing → training → calibration → deployment
- **Elastic APM patterns** — Architecture mirrors APM: ingest → transform → visualize
- **Domain knowledge** — Edge effect modeled in wafer map, Pareto analysis for defect prioritization, yield metrics aligned with real fab KPIs
