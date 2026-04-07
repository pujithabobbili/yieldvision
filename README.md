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
