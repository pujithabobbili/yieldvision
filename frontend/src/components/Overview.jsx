import { useApi } from "../hooks/useApi";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, RadarChart, Radar,
  PolarGrid, PolarAngleAxis
} from "recharts";

const TOOLTIP_STYLE = {
  backgroundColor: "#111827",
  border: "1px solid rgba(99,179,237,0.2)",
  borderRadius: 8,
  color: "#e2e8f0",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 13,
};

export default function Overview() {
  const { data: summary, loading: sl } = useApi("/api/summary");
  const { data: trend } = useApi("/api/yield-trend", { days: 14 });
  const { data: process } = useApi("/api/process-metrics");

  const kpis = summary
    ? [
        { label: "Overall Yield", value: `${summary.overall_yield}%`, change: `+${summary.yield_change_7d}% this week`, dir: "up", color: "cyan" },
        { label: "Wafers Today", value: summary.total_wafers_today, change: "across all products", dir: "", color: "green" },
        { label: "Active Lots", value: summary.active_lots, change: "in production", dir: "", color: "purple" },
        { label: "Critical Defects", value: summary.critical_defects, change: "require review", dir: "down", color: "red" },
        { label: "Equipment Health", value: `${summary.equipment_health}%`, change: "all systems nominal", dir: "up", color: "green" },
        { label: "Top Defect", value: summary.top_defect, change: `Best: ${summary.best_product}`, dir: "", color: "amber" },
      ]
    : [];

  // Aggregate trend by date for overview chart
  const chartData = trend
    ? Object.values(
        trend.data.reduce((acc, d) => {
          if (!acc[d.date]) acc[d.date] = { date: d.date, yield: 0, count: 0 };
          acc[d.date].yield += d.yield;
          acc[d.date].count += 1;
          return acc;
        }, {})
      ).map((d) => ({ date: d.date.slice(5), yield: +(d.yield / d.count).toFixed(2) }))
    : [];

  const radarData = process?.data.map((p) => ({
    metric: p.process_step.slice(0, 5),
    yield: p.avg_yield,
    util: p.equipment_utilization,
    throughput: (p.throughput / 120) * 100,
  })) || [];

  return (
    <div>
      {sl ? (
        <div className="loader"><div className="loader-spin" />Loading metrics...</div>
      ) : (
        <div className="kpi-grid">
          {kpis.map((k) => (
            <div key={k.label} className={`kpi-card ${k.color}`}>
              <div className="kpi-label">{k.label}</div>
              <div className={`kpi-value ${k.color}`}>{k.value}</div>
              {k.change && (
                <div className={`kpi-change ${k.dir}`}>
                  {k.dir === "up" ? "▲" : k.dir === "down" ? "▼" : ""} {k.change}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="charts-grid">
        <div className="card" style={{ gridColumn: "1 / -1" }}>
          <div className="card-title">14-Day Yield Trend · All Products</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,179,237,0.07)" />
              <XAxis dataKey="date" tick={{ fill: "#4a5568", fontSize: 11 }} />
              <YAxis domain={[80, 100]} tick={{ fill: "#4a5568", fontSize: 11 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="yield" stroke="#38bdf8" strokeWidth={2} dot={false} name="Avg Yield %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="charts-grid">
        <div className="card">
          <div className="card-title">Process Step Performance</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={process?.data || []} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,179,237,0.07)" />
              <XAxis dataKey="process_step" tick={{ fill: "#4a5568", fontSize: 10 }} />
              <YAxis domain={[80, 100]} tick={{ fill: "#4a5568", fontSize: 11 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="avg_yield" fill="#38bdf8" name="Avg Yield %" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-title">Process Health Radar</div>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(99,179,237,0.12)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: "#4a5568", fontSize: 11 }} />
              <Radar name="Yield" dataKey="yield" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.15} />
              <Radar name="Utilization" dataKey="util" stroke="#34d399" fill="#34d399" fillOpacity={0.1} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
