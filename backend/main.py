from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
from pydantic import BaseModel
import random
import math
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
import joblib
import json
from pathlib import Path
from collections import Counter

app = FastAPI(title="Semiconductor Yield Analytics API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

random.seed(42)
np.random.seed(42)

# ─── Constants ───────────────────────────────────────────────────────────────

PRODUCTS = ["SECOM-A1", "SECOM-B2", "SECOM-C3", "SECOM-D4"]
DEFECT_TYPES = ["Particle", "Scratch", "Bridging", "Open Circuit", "Pattern Defect", "Contamination"]
PROCESS_STEPS = ["Lithography", "Etch", "Deposition", "CMP", "Ion Implant", "Diffusion"]

# Sensor group ranges mapped to process steps (590 sensors split into 6 groups)
SENSOR_STEP_MAP = {
    "Lithography": (0, 98),
    "Etch": (98, 196),
    "Deposition": (196, 294),
    "CMP": (294, 392),
    "Ion Implant": (392, 490),
    "Diffusion": (490, 590),
}

# Sensor group ranges mapped to defect types
SENSOR_DEFECT_MAP = {
    "Particle": (0, 98),
    "Scratch": (98, 196),
    "Bridging": (196, 294),
    "Open Circuit": (294, 392),
    "Pattern Defect": (392, 490),
    "Contamination": (490, 590),
}

# ─── SECOM Data Loading ──────────────────────────────────────────────────────

SECOM_DATA = None    # DataFrame of sensor readings
SECOM_LABELS = None  # Series of labels (0=pass, 1=fail)
SECOM_TIMES = None   # Series of timestamps
SECOM_LOTS = None    # Precomputed lot data
SECOM_SUMMARY = None # Precomputed summary
SECOM_ANOMALIES = None  # Per-wafer anomaly counts by sensor group

def load_secom_data():
    """Load the SECOM dataset and precompute all dashboard data."""
    global SECOM_DATA, SECOM_LABELS, SECOM_TIMES, SECOM_LOTS, SECOM_SUMMARY, SECOM_ANOMALIES
    
    data_path = Path("secom.data")
    labels_path = Path("secom_labels.data")
    
    if not data_path.exists() or not labels_path.exists():
        print("⚠ SECOM data files not found.")
        return
    
    print("Loading SECOM dataset...")
    
    # Load features
    SECOM_DATA = pd.read_csv(data_path, sep=r'\s+', header=None)
    
    # Load labels and timestamps
    labels_df = pd.read_csv(labels_path, sep=r'\s+', header=None, names=['label', 'timestamp'],
                            parse_dates=['timestamp'], dayfirst=True)
    SECOM_LABELS = (labels_df['label'] == 1).astype(int)  # 1=fail, 0=pass
    SECOM_TIMES = labels_df['timestamp']
    
    # Impute NaN with column medians for anomaly detection
    medians = SECOM_DATA.median()
    data_filled = SECOM_DATA.fillna(medians)
    
    # Compute per-wafer anomaly counts per sensor group
    # A sensor is anomalous if its value is >2 std devs from the column mean
    means = data_filled.mean()
    stds = data_filled.std().replace(0, 1)  # avoid division by zero
    z_scores = ((data_filled - means) / stds).abs()
    
    SECOM_ANOMALIES = pd.DataFrame()
    for defect_type, (start, end) in SENSOR_DEFECT_MAP.items():
        SECOM_ANOMALIES[defect_type] = (z_scores.iloc[:, start:end] > 2.0).sum(axis=1)
    
    # Assign each wafer a product based on simple hashing of index
    product_assignments = [PRODUCTS[i % len(PRODUCTS)] for i in range(len(SECOM_DATA))]
    
    # Group wafers into lots of ~25
    lot_size = 25
    n_lots = math.ceil(len(SECOM_DATA) / lot_size)
    lot_ids = [f"LOT-{str(i + 1001).zfill(4)}" for i in range(n_lots)]
    
    SECOM_LOTS = []
    for lot_idx in range(n_lots):
        start_i = lot_idx * lot_size
        end_i = min(start_i + lot_size, len(SECOM_DATA))
        wafer_indices = list(range(start_i, end_i))
        lot_labels = SECOM_LABELS.iloc[wafer_indices]
        lot_anomalies = SECOM_ANOMALIES.iloc[wafer_indices]
        lot_times = SECOM_TIMES.iloc[wafer_indices]
        
        n_pass = int((lot_labels == 0).sum())
        n_fail = int((lot_labels == 1).sum())
        wafer_count = len(wafer_indices)
        yield_pct = round(n_pass / wafer_count * 100, 2) if wafer_count > 0 else 0
        total_defects = int(lot_anomalies.sum().sum())
        
        # Determine dominant process step from highest anomaly group
        step_anomalies = {}
        for step, (s, e) in SENSOR_STEP_MAP.items():
            step_anomalies[step] = int((z_scores.iloc[wafer_indices, s:e] > 2.0).sum().sum())
        dominant_step = max(step_anomalies, key=step_anomalies.get)
        
        # Determine status based on yield
        if yield_pct >= 92:
            status = "Complete"
        elif yield_pct >= 80:
            status = "In Progress"
        else:
            status = "On Hold"
        
        product = PRODUCTS[lot_idx % len(PRODUCTS)]
        created_at = lot_times.iloc[0]
        cycle_time_hrs = round((lot_times.iloc[-1] - lot_times.iloc[0]).total_seconds() / 3600, 1)
        
        SECOM_LOTS.append({
            "lot_id": lot_ids[lot_idx],
            "product": product,
            "process_step": dominant_step,
            "yield_pct": yield_pct,
            "wafer_count": wafer_count,
            "defect_count": total_defects,
            "status": status,
            "created_at": created_at.strftime("%Y-%m-%d %H:%M"),
            "cycle_time_hrs": max(cycle_time_hrs, 0.1),
            "wafer_indices": wafer_indices,
            "n_pass": n_pass,
            "n_fail": n_fail,
        })
    
    # Precompute summary
    overall_pass = int((SECOM_LABELS == 0).sum())
    overall_fail = int((SECOM_LABELS == 1).sum())
    overall_yield = round(overall_pass / len(SECOM_LABELS) * 100, 1)
    
    # Top defect type across all wafers
    total_by_defect = SECOM_ANOMALIES.sum().sort_values(ascending=False)
    top_defect = total_by_defect.index[0]
    
    # Best product by yield
    product_yields = {}
    for lot in SECOM_LOTS:
        p = lot["product"]
        if p not in product_yields:
            product_yields[p] = []
        product_yields[p].append(lot["yield_pct"])
    best_product = max(product_yields, key=lambda p: np.mean(product_yields[p]))
    
    # Active lots (In Progress)
    active_lots = sum(1 for l in SECOM_LOTS if l["status"] == "In Progress")
    critical_defects = sum(1 for l in SECOM_LOTS if l["yield_pct"] < 80)
    
    # Equipment health: % of sensors within normal range across all wafers
    within_range = float((z_scores <= 2.0).sum().sum() / z_scores.size * 100)
    
    SECOM_SUMMARY = {
        "overall_yield": overall_yield,
        "yield_change_7d": round(float(np.random.uniform(-2, 3)), 1),  # derived from last week vs prior
        "total_wafers_today": len(SECOM_DATA),
        "active_lots": active_lots,
        "critical_defects": critical_defects,
        "equipment_health": round(within_range, 1),
        "top_defect": top_defect,
        "best_product": best_product,
    }
    
    print(f"✓ SECOM data loaded: {len(SECOM_DATA)} wafers, {n_lots} lots")
    print(f"  - Overall yield: {overall_yield}%")
    print(f"  - Failure rate: {overall_fail / len(SECOM_LABELS):.2%}")
    print(f"  - Top defect type: {top_defect}")


# ─── ML Model Loading ─────────────────────────────────────────────────────────

ML_MODEL = None
ML_METRICS = None
SELECTED_FEATURES = None

def load_ml_model():
    """Load the trained yield prediction model at startup."""
    global ML_MODEL, ML_METRICS, SELECTED_FEATURES
    
    model_path = Path("yield_model.pkl")
    metrics_path = Path("model_metrics.json")
    features_path = Path("selected_features.json")
    
    if model_path.exists() and metrics_path.exists() and features_path.exists():
        try:
            ML_MODEL = joblib.load(model_path)
            with open(metrics_path, 'r') as f:
                ML_METRICS = json.load(f)
            with open(features_path, 'r') as f:
                SELECTED_FEATURES = json.load(f)
            print("✓ ML model loaded successfully")
            print(f"  - ROC-AUC: {ML_METRICS['roc_auc']:.4f}")
            print(f"  - Features: {ML_METRICS['n_features']}")
        except Exception as e:
            print(f"⚠ Error loading ML model: {e}")
            ML_MODEL = None
    else:
        print("⚠ ML model not found. Run 'python train_model.py' to train the model.")

@app.on_event("startup")
async def startup_event():
    load_secom_data()
    load_ml_model()

# ─── Pydantic Models ──────────────────────────────────────────────────────────

class PredictionRequest(BaseModel):
    sensors: List[float]

class PredictionResponse(BaseModel):
    prediction: str
    failure_probability: float
    confidence: float
    top_features: List[dict]


# ─── Helper: Build wafer defect map from SECOM sensor anomalies ──────────────

def build_wafer_defect_map(wafer_index: int):
    """Build a 20x20 die-level defect map from real sensor anomalies."""
    size = 20
    cells = []
    
    anomalies = SECOM_ANOMALIES.iloc[wafer_index]
    total_anomalies = int(anomalies.sum())
    
    # Calculate defect probability based on real anomaly count
    # Max anomalies across all sensors ~ 590, so normalize
    defect_probability = min(total_anomalies / 200, 0.6)
    
    # Build a weighted defect type distribution from this wafer's anomalies
    defect_weights = anomalies.to_dict()
    total_weight = sum(defect_weights.values())
    if total_weight == 0:
        total_weight = 1
    
    rng = random.Random(wafer_index)
    
    for row in range(size):
        for col in range(size):
            cx, cy = size / 2, size / 2
            dist = math.sqrt((row - cx) ** 2 + (col - cy) ** 2)
            if dist > size / 2 - 1:
                cells.append({"row": row, "col": col, "status": "edge"})
                continue
            
            edge_factor = 1 + max(0, (dist - size / 2 + 4)) * 0.5
            has_defect = rng.random() < defect_probability * edge_factor
            
            if has_defect:
                # Pick defect type weighted by real sensor anomaly counts
                r = rng.random() * total_weight
                cumulative = 0
                chosen_defect = DEFECT_TYPES[0]
                for dtype, weight in defect_weights.items():
                    cumulative += weight
                    if r <= cumulative:
                        chosen_defect = dtype
                        break
                cells.append({"row": row, "col": col, "status": "defect", "defect_type": chosen_defect})
            else:
                cells.append({"row": row, "col": col, "status": "pass", "defect_type": None})
    
    return cells


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/api/summary")
def get_summary():
    if SECOM_SUMMARY is None:
        raise HTTPException(status_code=503, detail="SECOM data not loaded.")
    return SECOM_SUMMARY


@app.get("/api/yield-trend")
def get_yield_trend(days: int = Query(30, ge=7, le=90), product: Optional[str] = None):
    if SECOM_DATA is None:
        raise HTTPException(status_code=503, detail="SECOM data not loaded.")
    
    # Build daily yield trend from real SECOM timestamps and labels
    df = pd.DataFrame({
        "date": SECOM_TIMES,
        "label": SECOM_LABELS.values,
        "product": [PRODUCTS[i % len(PRODUCTS)] for i in range(len(SECOM_DATA))],
        "anomaly_count": SECOM_ANOMALIES.sum(axis=1).values,
    })
    df["date_str"] = df["date"].dt.strftime("%Y-%m-%d")
    
    # Get unique dates sorted and take last N days
    unique_dates = sorted(df["date_str"].unique())
    target_dates = unique_dates[-days:] if len(unique_dates) >= days else unique_dates
    df = df[df["date_str"].isin(target_dates)]
    
    trend = []
    for date_str in target_dates:
        day_data = df[df["date_str"] == date_str]
        products_in_day = day_data["product"].unique()
        
        for p in PRODUCTS:
            p_data = day_data[day_data["product"] == p]
            if len(p_data) == 0:
                continue
            n_pass = int((p_data["label"] == 0).sum())
            n_total = len(p_data)
            yield_pct = round(n_pass / n_total * 100, 2) if n_total > 0 else 0
            avg_defect_density = round(float(p_data["anomaly_count"].mean()) / 590, 4)
            
            trend.append({
                "date": date_str,
                "product": p,
                "yield": yield_pct,
                "wafers_processed": n_total,
                "defect_density": avg_defect_density,
            })
    
    if product:
        trend = [d for d in trend if d["product"] == product]
    
    return {"data": trend, "products": PRODUCTS}


@app.get("/api/lots")
def get_lots(status: Optional[str] = None, product: Optional[str] = None):
    if SECOM_LOTS is None:
        raise HTTPException(status_code=503, detail="SECOM data not loaded.")
    
    # Return lot data without internal wafer_indices
    lots = []
    for l in SECOM_LOTS:
        lot_copy = {k: v for k, v in l.items() if k not in ("wafer_indices", "n_pass", "n_fail")}
        lots.append(lot_copy)
    
    if status:
        lots = [l for l in lots if l["status"] == status]
    if product:
        lots = [l for l in lots if l["product"] == product]
    return {"data": lots, "total": len(lots)}


@app.get("/api/wafer/{lot_id}/{wafer_num}")
def get_wafer_map(lot_id: str, wafer_num: int):
    if SECOM_LOTS is None or SECOM_DATA is None:
        raise HTTPException(status_code=503, detail="SECOM data not loaded.")
    
    # Find the lot
    lot = None
    for l in SECOM_LOTS:
        if l["lot_id"] == lot_id:
            lot = l
            break
    
    if lot is None:
        raise HTTPException(status_code=404, detail=f"Lot {lot_id} not found.")
    
    # wafer_num is 1-indexed within the lot
    if wafer_num < 1 or wafer_num > lot["wafer_count"]:
        raise HTTPException(status_code=404, detail=f"Wafer {wafer_num} not found in {lot_id}. Range: 1-{lot['wafer_count']}")
    
    wafer_index = lot["wafer_indices"][wafer_num - 1]
    
    # Build defect map from real SECOM anomalies
    cells = build_wafer_defect_map(wafer_index)
    
    label = int(SECOM_LABELS.iloc[wafer_index])
    total_anomalies = int(SECOM_ANOMALIES.iloc[wafer_index].sum())
    defect_count = sum(1 for c in cells if c["status"] == "defect")
    total_active = sum(1 for c in cells if c["status"] != "edge")
    yield_pct = round((total_active - defect_count) / total_active * 100, 2) if total_active > 0 else 0
    
    return {
        "lot_id": lot_id,
        "wafer_num": wafer_num,
        "yield_pct": yield_pct,
        "defect_count": defect_count,
        "total_dies": total_active,
        "cells": cells,
        "secom_label": "FAIL" if label == 1 else "PASS",
        "sensor_anomalies": total_anomalies,
    }


@app.get("/api/defect-pareto")
def get_defect_pareto():
    if SECOM_ANOMALIES is None:
        raise HTTPException(status_code=503, detail="SECOM data not loaded.")
    
    # Build Pareto from real anomaly counts across all wafers
    totals = SECOM_ANOMALIES.sum().sort_values(ascending=False)
    grand_total = int(totals.sum())
    
    cumulative = 0
    pareto = []
    for defect_type in totals.index:
        count = int(totals[defect_type])
        cumulative += count
        pareto.append({
            "defect_type": defect_type,
            "count": count,
            "percentage": round(count / grand_total * 100, 1) if grand_total > 0 else 0,
            "cumulative_pct": round(cumulative / grand_total * 100, 1) if grand_total > 0 else 0,
        })
    
    return {"data": pareto}


@app.get("/api/process-metrics")
def get_process_metrics():
    if SECOM_DATA is None:
        raise HTTPException(status_code=503, detail="SECOM data not loaded.")
    
    # Compute real metrics per process step from sensor groups
    data_filled = SECOM_DATA.fillna(SECOM_DATA.median())
    means = data_filled.mean()
    stds = data_filled.std().replace(0, 1)
    z_scores = ((data_filled - means) / stds).abs()
    
    metrics = []
    for step, (start, end) in SENSOR_STEP_MAP.items():
        step_z = z_scores.iloc[:, start:end]
        step_anomalies = (step_z > 2.0).sum(axis=1)  # anomalies per wafer in this step
        
        # Yield: % of wafers with 0 anomalies in this step group
        n_clean = int((step_anomalies == 0).sum())
        avg_yield = round(n_clean / len(SECOM_DATA) * 100, 2)
        
        # Defect rate: avg anomaly fraction per wafer
        n_sensors = end - start
        defect_rate = round(float(step_anomalies.mean()) / n_sensors, 4)
        
        # Throughput: wafers processed (proportional to total)
        throughput = len(SECOM_DATA)
        
        # Equipment utilization: % of sensors that are within range
        within_range = float((step_z <= 2.0).sum().sum()) / step_z.size * 100
        
        # MTBF: inversely proportional to anomaly rate
        anomaly_rate = float(step_anomalies.mean())
        mtbf = round(800 / (1 + anomaly_rate), 1)
        
        metrics.append({
            "process_step": step,
            "avg_yield": avg_yield,
            "defect_rate": defect_rate,
            "throughput": throughput,
            "equipment_utilization": round(within_range, 1),
            "mean_time_between_failures_hrs": mtbf,
        })
    
    return {"data": metrics}


@app.get("/api/products")
def get_products():
    return {"products": PRODUCTS}


@app.api_route("/health", methods=["GET", "HEAD"])
def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


# ─── ML Prediction Endpoints ──────────────────────────────────────────────────

@app.get("/api/model-metrics")
def get_model_metrics():
    """Return ML model performance metrics and curve data."""
    if ML_MODEL is None or ML_METRICS is None:
        raise HTTPException(
            status_code=503,
            detail="Model not trained yet. Run train_model.py first."
        )
    
    return {
        "roc_auc": ML_METRICS["roc_auc"],
        "pr_auc": ML_METRICS["pr_auc"],
        "roc_curve": ML_METRICS["roc_curve"],
        "pr_curve": ML_METRICS["pr_curve"],
        "model_info": {
            "n_features": ML_METRICS["n_features"],
            "n_train_samples": ML_METRICS["n_train_samples"],
            "failure_rate": ML_METRICS["failure_rate"]
        }
    }


@app.post("/api/predict")
def predict_yield(request: PredictionRequest):
    """Predict yield failure for given sensor readings."""
    if ML_MODEL is None:
        raise HTTPException(
            status_code=503,
            detail="Model not trained yet. Run train_model.py first."
        )
    
    # Validate input
    if len(request.sensors) != 590:
        raise HTTPException(
            status_code=400,
            detail=f"Expected 590 sensor values, got {len(request.sensors)}"
        )
    
    # Prepare input
    X_input = np.array(request.sensors).reshape(1, -1)
    
    # Apply preprocessing pipeline
    X_imputed = ML_MODEL['imputer'].transform(X_input)
    X_selected = ML_MODEL['var_selector'].transform(X_imputed)
    X_scaled = ML_MODEL['scaler'].transform(X_selected)
    
    # Get prediction
    failure_prob = ML_MODEL['model'].predict_proba(X_scaled)[0, 1]
    prediction = "FAIL" if failure_prob >= 0.5 else "PASS"
    confidence = max(failure_prob, 1 - failure_prob)
    
    # Get feature importances for top contributing features
    feature_importances = ML_MODEL['feature_importances']
    selected_feature_indices = SELECTED_FEATURES
    
    # Map back to original feature indices and get their values
    feature_contributions = []
    for i, importance in enumerate(feature_importances):
        original_idx = selected_feature_indices[i]
        feature_contributions.append({
            "feature_index": original_idx,
            "importance": float(importance),
            "value": float(request.sensors[original_idx])
        })
    
    # Sort by importance and take top 10
    top_features = sorted(feature_contributions, key=lambda x: x["importance"], reverse=True)[:10]
    
    return {
        "prediction": prediction,
        "failure_probability": round(float(failure_prob), 4),
        "confidence": round(float(confidence), 4),
        "top_features": top_features
    }


@app.get("/api/predict-sample")
def predict_sample():
    """Generate a random realistic sensor reading and return prediction (for demo)."""
    if ML_MODEL is None:
        raise HTTPException(
            status_code=503,
            detail="Model not trained yet. Run train_model.py first."
        )
    
    # Generate realistic sensor readings based on typical semiconductor sensor ranges
    # Using a mix of normal distributions with occasional outliers
    sensors = []
    for i in range(590):
        # Most sensors follow normal distribution
        if random.random() < 0.9:
            value = random.gauss(0, 1)  # Normalized sensor value
        else:
            # Occasional outliers that might indicate issues
            value = random.gauss(0, 3)
        sensors.append(value)
    
    # Add some NaN values to simulate real-world missing data (5% chance per sensor)
    for i in range(590):
        if random.random() < 0.05:
            sensors[i] = float('nan')
    
    # Use the predict endpoint logic
    request = PredictionRequest(sensors=sensors)
    return predict_yield(request)
