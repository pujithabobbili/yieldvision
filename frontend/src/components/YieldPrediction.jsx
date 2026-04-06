import { useState } from "react";
import { useApi } from "../hooks/useApi";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";

const TOOLTIP_STYLE = {
  backgroundColor: "#111827",
  border: "1px solid rgba(99,179,237,0.2)",
  borderRadius: 8,
  color: "#e2e8f0",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 13,
};

export default function YieldPrediction() {
  const [prediction, setPrediction] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const { data: metrics } = useApi("/api/model-metrics");

  const runPrediction = async () => {
    setIsRunning(true);
    try {
      const response = await fetch("http://localhost:8000/api/predict-sample");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Prediction failed");
      }
      const result = await response.json();
      setPrediction(result);
    } catch (error) {
      console.error("Prediction error:", error);
      alert(error.message || "Failed to run prediction. Make sure the model is trained.");
    } finally {
      setIsRunning(false);
    }
  };

  const rocData = metrics?.roc_curve
    ? metrics.roc_curve.fpr.map((fpr, i) => ({
        fpr: (fpr * 100).toFixed(2),
        tpr: (metrics.roc_curve.tpr[i] * 100).toFixed(2),
      }))
    : [];

  const prData = metrics?.pr_curve
    ? metrics.pr_curve.recall.map((recall, i) => ({
        recall: (recall * 100).toFixed(2),
        precision: (metrics.pr_curve.precision[i] * 100).toFixed(2),
      }))
    : [];

  const featureData = prediction?.top_features.map((f) => ({
    name: `Sensor ${f.feature_index}`,
    importance: (f.importance * 100).toFixed(2),
    value: f.value.toFixed(3),
  })) || [];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>◉ Yield Failure Prediction</h1>
          <p className="subtitle">ML-powered wafer yield prediction using SECOM sensor data</p>
        </div>
        <button
          onClick={runPrediction}
          disabled={isRunning}
          className="btn-primary"
          style={{
            padding: "12px 24px",
            fontSize: "15px",
            fontWeight: 600,
            cursor: isRunning ? "not-allowed" : "pointer",
            opacity: isRunning ? 0.6 : 1,
          }}
        >
          {isRunning ? "Running..." : "Run Prediction"}
        </button>
      </div>

      {!metrics && (
        <div className="card" style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ marginBottom: 8 }}>Model Not Trained</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: 24 }}>
            The ML model hasn't been trained yet. Please run the training script first.
          </p>
          <code style={{
            background: "rgba(99,179,237,0.1)",
            padding: "8px 16px",
            borderRadius: 6,
            fontSize: 14,
            color: "var(--cyan)"
          }}>
            python backend/train_model.py
          </code>
        </div>
      )}

      {metrics && (
        <>
          {prediction && (
            <div className="grid-2">
              <div className="card">
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div
                    style={{
                      fontSize: 72,
                      fontWeight: 700,
                      marginBottom: 16,
                      color: prediction.prediction === "PASS" ? "var(--green)" : "var(--red)",
                    }}
                  >
                    {prediction.prediction}
                  </div>
                  <div style={{ fontSize: 18, color: "var(--text-secondary)", marginBottom: 24 }}>
                    Failure Probability: {(prediction.failure_probability * 100).toFixed(2)}%
                  </div>
                  
                  <div style={{ marginBottom: 8, fontSize: 14, color: "var(--text-secondary)" }}>
                    Confidence: {(prediction.confidence * 100).toFixed(1)}%
                  </div>
                  <div style={{
                    height: 12,
                    background: "rgba(99,179,237,0.1)",
                    borderRadius: 6,
                    overflow: "hidden",
                    marginBottom: 8,
                  }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${prediction.confidence * 100}%`,
                        background: `linear-gradient(90deg, var(--cyan), var(--purple))`,
                        transition: "width 0.5s ease",
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 style={{ marginBottom: 16 }}>Top Contributing Sensors</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={featureData} layout="vertical" margin={{ left: 80, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,179,237,0.1)" />
                    <XAxis type="number" stroke="var(--text-secondary)" fontSize={12} />
                    <YAxis type="category" dataKey="name" stroke="var(--text-secondary)" fontSize={11} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="importance" fill="var(--cyan)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="grid-2">
            <div className="card">
              <h3 style={{ marginBottom: 16 }}>ROC Curve</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={rocData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,179,237,0.1)" />
                  <XAxis
                    dataKey="fpr"
                    stroke="var(--text-secondary)"
                    fontSize={12}
                    label={{ value: "False Positive Rate (%)", position: "insideBottom", offset: -5, fill: "var(--text-secondary)" }}
                  />
                  <YAxis
                    stroke="var(--text-secondary)"
                    fontSize={12}
                    label={{ value: "True Positive Rate (%)", angle: -90, position: "insideLeft", fill: "var(--text-secondary)" }}
                  />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Line
                    type="monotone"
                    dataKey="tpr"
                    stroke="var(--cyan)"
                    strokeWidth={2}
                    dot={false}
                    name="ROC Curve"
                  />
                  <Line
                    type="monotone"
                    data={[{ fpr: 0, tpr: 0 }, { fpr: 100, tpr: 100 }]}
                    dataKey="tpr"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Random"
                  />
                </LineChart>
              </ResponsiveContainer>
              <div style={{ textAlign: "center", marginTop: 12, fontSize: 14 }}>
                <span style={{ color: "var(--text-secondary)" }}>AUC: </span>
                <span style={{ color: "var(--cyan)", fontWeight: 600 }}>
                  {metrics.roc_auc.toFixed(4)}
                </span>
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: 16 }}>Precision-Recall Curve</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={prData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,179,237,0.1)" />
                  <XAxis
                    dataKey="recall"
                    stroke="var(--text-secondary)"
                    fontSize={12}
                    label={{ value: "Recall (%)", position: "insideBottom", offset: -5, fill: "var(--text-secondary)" }}
                  />
                  <YAxis
                    stroke="var(--text-secondary)"
                    fontSize={12}
                    label={{ value: "Precision (%)", angle: -90, position: "insideLeft", fill: "var(--text-secondary)" }}
                  />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Line
                    type="monotone"
                    dataKey="precision"
                    stroke="var(--purple)"
                    strokeWidth={2}
                    dot={false}
                    name="PR Curve"
                  />
                </LineChart>
              </ResponsiveContainer>
              <div style={{ textAlign: "center", marginTop: 12, fontSize: 14 }}>
                <span style={{ color: "var(--text-secondary)" }}>AUC: </span>
                <span style={{ color: "var(--purple)", fontWeight: 600 }}>
                  {metrics.pr_auc.toFixed(4)}
                </span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 16 }}>Model Information</h3>
            <div className="grid-3">
              <div className="stat-card">
                <div className="stat-label">ROC-AUC Score</div>
                <div className="stat-value" style={{ color: "var(--cyan)" }}>
                  {metrics.roc_auc.toFixed(4)}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">PR-AUC Score</div>
                <div className="stat-value" style={{ color: "var(--purple)" }}>
                  {metrics.pr_auc.toFixed(4)}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Training Samples</div>
                <div className="stat-value" style={{ color: "var(--green)" }}>
                  {metrics.model_info.n_train_samples.toLocaleString()}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Features Used</div>
                <div className="stat-value" style={{ color: "var(--amber)" }}>
                  {metrics.model_info.n_features}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Failure Rate</div>
                <div className="stat-value" style={{ color: "var(--red)" }}>
                  {(metrics.model_info.failure_rate * 100).toFixed(2)}%
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Model Type</div>
                <div className="stat-value" style={{ fontSize: 14, color: "var(--text-secondary)" }}>
                  Gradient Boosting
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
