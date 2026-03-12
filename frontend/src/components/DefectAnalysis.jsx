import { useApi } from "../hooks/useApi";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ComposedChart, Legend
} from "recharts";

const TOOLTIP_STYLE = {
  backgroundColor: "#111827", border: "1px solid rgba(99,179,237,0.2)",
  borderRadius: 8, color: "#e2e8f0", fontSize: 12,
};

const PROCESS_COLORS = {
  Lithography: "#38bdf8", Etch: "#f87171", Deposition: "#34d399",
  CMP: "#fbbf24", "Ion Implant": "#a78bfa", Diffusion: "#fb923c"
};

export default function DefectAnalysis() {
  const { data: pareto, loading: pl } = useApi("/api/defect-pareto");
  const { data: process, loading: prl } = useApi("/api/process-metrics");

  const paretoData = pareto?.data || [];
  const processData = process?.data || [];

  return (
    <div>
      <div className="charts-grid">
        <div className="card" style={{ gridColumn: "1 / -1" }}>
          <div className="card-title">Defect Pareto Chart · Top Defect Types (80/20 Rule)</div>
          {pl ? (
            <div className="loader"><div className="loader-spin" />Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={paretoData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,179,237,0.07)" />
                <XAxis dataKey="defect_type" tick={{ fill: "#4a5568", fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fill: "#4a5568", fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} unit="%" tick={{ fill: "#4a5568", fontSize: 11 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
                <Bar yAxisId="left" dataKey="count" fill="#38bdf8" name="Defect Count" radius={[4, 4, 0, 0]} opacity={0.85} />
                <Line yAxisId="right" type="monotone" dataKey="cumulative_pct" stroke="#fbbf24" strokeWidth={2} dot={{ r: 4, fill: "#fbbf24" }} name="Cumulative %" />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="charts-grid">
        <div className="card">
          <div className="card-title">Equipment Utilization by Process Step</div>
          {prl ? (
            <div className="loader"><div className="loader-spin" />Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={processData} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,179,237,0.07)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fill: "#4a5568", fontSize: 11 }} />
                <YAxis type="category" dataKey="process_step" tick={{ fill: "#94a3b8", fontSize: 11 }} width={80} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`]} />
                <Bar dataKey="equipment_utilization" name="Utilization" radius={[0, 4, 4, 0]}
                  fill="#34d399" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <div className="card-title">Throughput vs Defect Rate by Step</div>
          {prl ? (
            <div className="loader"><div className="loader-spin" />Loading...</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="data-table" style={{ minWidth: 360 }}>
                <thead>
                  <tr>
                    <th>Step</th>
                    <th>Throughput</th>
                    <th>Defect Rate</th>
                    <th>MTBF (hrs)</th>
                    <th>Yield</th>
                  </tr>
                </thead>
                <tbody>
                  {processData.map((p) => (
                    <tr key={p.process_step}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: PROCESS_COLORS[p.process_step] || "#94a3b8" }} />
                          {p.process_step}
                        </div>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)" }}>{p.throughput}/hr</td>
                      <td>
                        <span style={{ color: p.defect_rate > 0.08 ? "var(--red)" : p.defect_rate > 0.05 ? "var(--amber)" : "var(--green)", fontFamily: "var(--font-mono)" }}>
                          {(p.defect_rate * 100).toFixed(2)}%
                        </span>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)" }}>{p.mean_time_between_failures_hrs}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ flex: 1, background: "var(--bg-hover)", borderRadius: 4, height: 6 }}>
                            <div style={{ width: `${((p.avg_yield - 80) / 20) * 100}%`, height: "100%", background: "var(--cyan)", borderRadius: 4 }} />
                          </div>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--cyan)", minWidth: 40 }}>{p.avg_yield}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
