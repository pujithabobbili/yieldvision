import { useState } from "react";
import { useApi } from "../hooks/useApi";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, AreaChart, Area,
  ScatterChart, Scatter, ZAxis
} from "recharts";

const COLORS = { "KLA-7000": "#38bdf8", "KLA-9200": "#34d399", "KLA-X1": "#fbbf24", "KLA-EDGE": "#a78bfa" };

const TOOLTIP_STYLE = {
  backgroundColor: "#111827",
  border: "1px solid rgba(99,179,237,0.2)",
  borderRadius: 8,
  color: "#e2e8f0",
  fontSize: 12,
};

export default function YieldTrend() {
  const [days, setDays] = useState(30);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { data, loading } = useApi("/api/yield-trend", { days, product: selectedProduct });

  const products = data?.products || [];
  const rawData = data?.data || [];

  // Pivot: date → { date, KLA-7000: yield, ... }
  const pivoted = Object.values(
    rawData.reduce((acc, d) => {
      if (!acc[d.date]) acc[d.date] = { date: d.date.slice(5) };
      acc[d.date][d.product] = d.yield;
      return acc;
    }, {})
  );

  // Defect density trend
  const defectTrend = Object.values(
    rawData.reduce((acc, d) => {
      const key = d.date.slice(5);
      if (!acc[key]) acc[key] = { date: key, density: 0, count: 0 };
      acc[key].density += d.defect_density;
      acc[key].count += 1;
      return acc;
    }, {})
  ).map((d) => ({ ...d, density: +(d.density / d.count).toFixed(5) }));

  return (
    <div>
      <div className="controls-row">
        <select value={days} onChange={(e) => setDays(+e.target.value)}>
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={60}>Last 60 days</option>
          <option value={90}>Last 90 days</option>
        </select>
        <select value={selectedProduct || ""} onChange={(e) => setSelectedProduct(e.target.value || null)}>
          <option value="">All Products</option>
          {products.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="loader"><div className="loader-spin" />Loading trend data...</div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title">Yield % by Product · {days}-Day Window</div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={pivoted} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,179,237,0.07)" />
                <XAxis dataKey="date" tick={{ fill: "#4a5568", fontSize: 11 }} />
                <YAxis domain={[75, 100]} tick={{ fill: "#4a5568", fontSize: 11 }} unit="%" />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`]} />
                <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
                {products.map((p) => (
                  <Line
                    key={p} type="monotone" dataKey={p}
                    stroke={COLORS[p]} strokeWidth={2} dot={false}
                    opacity={selectedProduct && selectedProduct !== p ? 0.2 : 1}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="charts-grid">
            <div className="card">
              <div className="card-title">Defect Density Trend</div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={defectTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="defectGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f87171" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,179,237,0.07)" />
                  <XAxis dataKey="date" tick={{ fill: "#4a5568", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#4a5568", fontSize: 11 }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Area type="monotone" dataKey="density" stroke="#f87171" fill="url(#defectGrad)" strokeWidth={2} name="Avg Defect Density" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <div className="card-title">Wafers Processed per Day</div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart
                  data={Object.values(rawData.reduce((acc, d) => {
                    const key = d.date.slice(5);
                    if (!acc[key]) acc[key] = { date: key, wafers: 0 };
                    acc[key].wafers += d.wafers_processed;
                    return acc;
                  }, {}))}
                  margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="wafersGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,179,237,0.07)" />
                  <XAxis dataKey="date" tick={{ fill: "#4a5568", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#4a5568", fontSize: 11 }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Area type="monotone" dataKey="wafers" stroke="#34d399" fill="url(#wafersGrad)" strokeWidth={2} name="Total Wafers" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
