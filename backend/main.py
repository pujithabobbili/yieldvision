from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
import random
import math
from datetime import datetime, timedelta
import numpy as np

app = FastAPI(title="Semiconductor Yield Analytics API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

random.seed(42)

PRODUCTS = ["KLA-7000", "KLA-9200", "KLA-X1", "KLA-EDGE"]
LOTS = [f"LOT-{str(i).zfill(4)}" for i in range(1001, 1025)]
DEFECT_TYPES = ["Particle", "Scratch", "Bridging", "Open Circuit", "Pattern Defect", "Contamination"]
PROCESS_STEPS = ["Lithography", "Etch", "Deposition", "CMP", "Ion Implant", "Diffusion"]


def generate_wafer_defect_map(wafer_id: int, yield_pct: float):
    """Generate a 20x20 defect map for a wafer."""
    size = 20
    cells = []
    defect_probability = (1 - yield_pct / 100) * 0.4

    for row in range(size):
        for col in range(size):
            # Circular wafer mask
            cx, cy = size / 2, size / 2
            dist = math.sqrt((row - cx) ** 2 + (col - cy) ** 2)
            if dist > size / 2 - 1:
                cells.append({"row": row, "col": col, "status": "edge"})
                continue

            # Edge ring more defects
            edge_factor = 1 + max(0, (dist - size / 2 + 4)) * 0.5
            has_defect = random.random() < defect_probability * edge_factor
            cells.append({
                "row": row,
                "col": col,
                "status": "defect" if has_defect else "pass",
                "defect_type": random.choice(DEFECT_TYPES) if has_defect else None
            })
    return cells


def generate_yield_trend(days: int = 30):
    """Generate yield trend over time."""
    base_yield = 88.0
    trend = []
    current_date = datetime.now() - timedelta(days=days)

    for i in range(days):
        date = current_date + timedelta(days=i)
        # Simulate yield variation with slight upward trend
        noise = random.gauss(0, 1.5)
        drift = i * 0.05
        yield_val = min(99.5, max(70, base_yield + drift + noise))

        for product in PRODUCTS:
            product_offset = PRODUCTS.index(product) * 1.5
            p_yield = min(99.5, max(70, yield_val + product_offset + random.gauss(0, 0.8)))
            trend.append({
                "date": date.strftime("%Y-%m-%d"),
                "product": product,
                "yield": round(p_yield, 2),
                "wafers_processed": random.randint(20, 50),
                "defect_density": round(random.uniform(0.02, 0.15), 4)
            })
    return trend


def generate_lots():
    lots = []
    for lot_id in LOTS:
        product = random.choice(PRODUCTS)
        base_yield = random.uniform(82, 97)
        step = random.choice(PROCESS_STEPS)
        lots.append({
            "lot_id": lot_id,
            "product": product,
            "process_step": step,
            "yield_pct": round(base_yield, 2),
            "wafer_count": random.randint(20, 25),
            "defect_count": random.randint(5, 80),
            "status": random.choice(["Complete", "Complete", "Complete", "In Progress", "On Hold"]),
            "created_at": (datetime.now() - timedelta(days=random.randint(1, 30))).strftime("%Y-%m-%d %H:%M"),
            "cycle_time_hrs": round(random.uniform(8, 72), 1),
        })
    return lots


def generate_defect_pareto():
    total = 1000
    counts = [int(total * p) for p in [0.35, 0.25, 0.17, 0.11, 0.08, 0.04]]
    cumulative = 0
    pareto = []
    for i, defect_type in enumerate(DEFECT_TYPES):
        cumulative += counts[i]
        pareto.append({
            "defect_type": defect_type,
            "count": counts[i],
            "percentage": round(counts[i] / total * 100, 1),
            "cumulative_pct": round(cumulative / total * 100, 1)
        })
    return pareto


def generate_process_metrics():
    metrics = []
    for step in PROCESS_STEPS:
        metrics.append({
            "process_step": step,
            "avg_yield": round(random.uniform(88, 97), 2),
            "defect_rate": round(random.uniform(0.01, 0.12), 4),
            "throughput": random.randint(40, 120),
            "equipment_utilization": round(random.uniform(72, 95), 1),
            "mean_time_between_failures_hrs": round(random.uniform(200, 800), 1),
        })
    return metrics


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/api/summary")
def get_summary():
    return {
        "overall_yield": 91.4,
        "yield_change_7d": +1.2,
        "total_wafers_today": 342,
        "active_lots": 18,
        "critical_defects": 7,
        "equipment_health": 94.2,
        "top_defect": "Particle",
        "best_product": "KLA-9200",
    }


@app.get("/api/yield-trend")
def get_yield_trend(days: int = Query(30, ge=7, le=90), product: Optional[str] = None):
    data = generate_yield_trend(days)
    if product:
        data = [d for d in data if d["product"] == product]
    return {"data": data, "products": PRODUCTS}


@app.get("/api/lots")
def get_lots(status: Optional[str] = None, product: Optional[str] = None):
    lots = generate_lots()
    if status:
        lots = [l for l in lots if l["status"] == status]
    if product:
        lots = [l for l in lots if l["product"] == product]
    return {"data": lots, "total": len(lots)}


@app.get("/api/wafer/{lot_id}/{wafer_num}")
def get_wafer_map(lot_id: str, wafer_num: int):
    random.seed(hash(lot_id + str(wafer_num)) % 10000)
    yield_pct = random.uniform(78, 98)
    cells = generate_wafer_defect_map(wafer_num, yield_pct)
    defect_count = sum(1 for c in cells if c["status"] == "defect")
    total_active = sum(1 for c in cells if c["status"] != "edge")
    return {
        "lot_id": lot_id,
        "wafer_num": wafer_num,
        "yield_pct": round(yield_pct, 2),
        "defect_count": defect_count,
        "total_dies": total_active,
        "cells": cells
    }


@app.get("/api/defect-pareto")
def get_defect_pareto():
    return {"data": generate_defect_pareto()}


@app.get("/api/process-metrics")
def get_process_metrics():
    return {"data": generate_process_metrics()}


@app.get("/api/products")
def get_products():
    return {"products": PRODUCTS}


@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}
