# YieldVision · Semiconductor Analytics Dashboard

A full-stack data visualization platform for semiconductor manufacturing analytics — built to demonstrate proficiency in React, Python FastAPI, data pipelines, and real-time monitoring (skills aligned with KLA's tech stack).

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Recharts |
| Backend | Python FastAPI (REST API) |
| Data Layer | Simulated semiconductor fab data |
| Charts | Recharts (LineChart, BarChart, RadarChart, AreaChart, ComposedChart) |
| Styling | Custom CSS with CSS variables (dark industrial theme) |

## 📊 Features

### 1. Overview Dashboard
- 6 real-time KPI cards (Overall Yield, Wafers Today, Active Lots, Critical Defects, Equipment Health)
- 14-day aggregate yield trend line chart
- Process step performance bar chart
- Multi-metric radar chart (yield vs. equipment utilization)

### 2. Yield Trend Analysis
- Per-product yield trends over 7–90 day windows
- Defect density area chart over time
- Wafers processed per day volume chart
- Product filter for focused analysis

### 3. Lot Explorer
- Full sortable, filterable data table of production lots
- Filter by status (Complete / In Progress / On Hold) and product
- Lot ID search
- Color-coded yield thresholds (green ≥92%, amber ≥85%, red <85%)
- Defect count highlighting

### 4. Wafer Defect Map
- Interactive 20×20 die-level defect map per wafer
- 6 defect types with unique colors (Particle, Scratch, Bridging, Open Circuit, Pattern Defect, Contamination)
- Hover tooltip showing defect type and coordinates
- Defect breakdown bar chart per wafer
- Select by Lot ID and Wafer Number

### 5. Defect Analysis
- Pareto chart (80/20 rule) with cumulative % line
- Equipment utilization horizontal bar chart by process step
- Process metrics table: throughput, defect rate, MTBF, yield bar

---

## 🛠 Running Locally

### Prerequisites
- Python 3.9+
- Node.js 18+

### Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
API will be live at `http://localhost:8000`
Swagger docs: `http://localhost:8000/docs`

### Frontend (React)
```bash
cd frontend
npm install
npm run dev
```
App will be live at `http://localhost:3000`

---

## ☁️ Deployment Options

### Option A: Render (Free, Recommended for Demo)

**Backend:**
1. Push to GitHub
2. Create new Web Service on [render.com](https://render.com)
3. Set Build Command: `pip install -r requirements.txt`
4. Set Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

**Frontend:**
1. Create new Static Site on Render
2. Build Command: `npm install && npm run build`
3. Publish Directory: `dist`
4. Set env var: `VITE_API_URL=https://your-backend.onrender.com`

### Option B: Railway
```bash
# Install Railway CLI
npm install -g @railway/cli
railway login
railway up
```

### Option C: Vercel (Frontend) + Railway (Backend)
- Frontend → Vercel (zero config for Vite/React)
- Backend → Railway (auto-detects Python/FastAPI)

---

## 📁 Project Structure

```
semiconductor-dashboard/
├── backend/
│   ├── main.py          # FastAPI app + all endpoints
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Overview.jsx      # KPI + summary charts
    │   │   ├── YieldTrend.jsx    # Time-series analysis
    │   │   ├── LotTable.jsx      # Sortable data table
    │   │   ├── WaferMap.jsx      # Interactive die map
    │   │   └── DefectAnalysis.jsx # Pareto + process metrics
    │   ├── hooks/
    │   │   └── useApi.js         # Data fetching hook
    │   ├── App.jsx               # Navigation + layout
    │   ├── App.css               # Design system
    │   └── main.jsx
    ├── index.html
    ├── vite.config.js
    └── package.json
```

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
| `GET /docs` | Swagger UI |

---

## 💡 Why This Project

This dashboard demonstrates skills directly relevant to KLA's engineering work:

- **Data ingestion & pipelines** — FastAPI backend simulates a data pipeline ingesting wafer inspection results
- **React frontend** — Component-based UI with real-time data fetching, filtering, and sorting
- **Analytics/visualization** — Pareto analysis, defect mapping, yield trending (core to KLA's product)
- **Elastic APM patterns** — The architecture mirrors how Elastic APM works: ingest → transform → visualize
- **Instrumenting code** — Custom `useApi` hook with error handling, loading states, and re-fetch support
