import { useState } from "react";
import { useApi } from "../hooks/useApi";

const LOTS = Array.from({ length: 10 }, (_, i) => `LOT-${String(1001 + i).padStart(4, "0")}`);
const CELL_SIZE = 16;
const GRID = 20;

const COLOR_MAP = {
  pass: "#1a3a2a",
  defect: "#f87171",
  edge: "transparent",
};

const DEFECT_COLORS = {
  Particle: "#f87171",
  Scratch: "#fbbf24",
  Bridging: "#a78bfa",
  "Open Circuit": "#fb923c",
  "Pattern Defect": "#38bdf8",
  Contamination: "#34d399",
};

export default function WaferMap() {
  const [lotId, setLotId] = useState(LOTS[0]);
  const [waferId, setWaferId] = useState(1);
  const [hovered, setHovered] = useState(null);

  const { data, loading } = useApi(`/api/wafer/${lotId}/${waferId}`);

  const cells = data?.cells || [];
  const defectTypes = [...new Set(cells.filter((c) => c.defect_type).map((c) => c.defect_type))];

  // Group defects by type for mini chart
  const defectBreakdown = defectTypes.map((type) => ({
    type,
    count: cells.filter((c) => c.defect_type === type).length,
    color: DEFECT_COLORS[type] || "#94a3b8",
  })).sort((a, b) => b.count - a.count);

  return (
    <div>
      <div className="controls-row">
        <select value={lotId} onChange={(e) => setLotId(e.target.value)}>
          {LOTS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <select value={waferId} onChange={(e) => setWaferId(+e.target.value)}>
          {Array.from({ length: 25 }, (_, i) => (
            <option key={i + 1} value={i + 1}>Wafer {i + 1}</option>
          ))}
        </select>
      </div>

      <div className="charts-grid">
        <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div className="card-title" style={{ alignSelf: "flex-start" }}>
            Wafer Defect Map · {lotId} · Wafer {waferId}
          </div>

          {loading ? (
            <div className="loader"><div className="loader-spin" />Loading wafer map...</div>
          ) : (
            <>
              <div style={{
                display: "grid",
                gridTemplateColumns: `repeat(${GRID}, ${CELL_SIZE}px)`,
                gap: 1,
                padding: 12,
                background: "#0a1219",
                borderRadius: 10,
                border: "1px solid rgba(99,179,237,0.1)",
              }}>
                {cells.map((cell, i) => {
                  const isHovered = hovered && hovered.row === cell.row && hovered.col === cell.col;
                  return (
                    <div
                      key={i}
                      onMouseEnter={() => cell.status !== "edge" ? setHovered(cell) : null}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        width: CELL_SIZE, height: CELL_SIZE,
                        borderRadius: cell.status === "edge" ? 0 : 2,
                        background: cell.status === "defect"
                          ? (DEFECT_COLORS[cell.defect_type] || "#f87171")
                          : cell.status === "edge" ? "transparent" : "#1a3a2a",
                        opacity: isHovered ? 1 : cell.status === "defect" ? 0.85 : 1,
                        outline: isHovered ? "2px solid white" : "none",
                        cursor: cell.status !== "edge" ? "crosshair" : "default",
                        transition: "outline 0.05s",
                      }}
                    />
                  );
                })}
              </div>

              {hovered && hovered.status === "defect" && (
                <div style={{
                  marginTop: 12, padding: "8px 14px",
                  background: "var(--bg-hover)", borderRadius: 8,
                  border: "1px solid var(--border-bright)",
                  fontSize: 12, fontFamily: "var(--font-mono)",
                  color: "var(--text-secondary)",
                }}>
                  ⚠ <span style={{ color: DEFECT_COLORS[hovered.defect_type] }}>{hovered.defect_type}</span>
                  {" · "} Row {hovered.row}, Col {hovered.col}
                </div>
              )}

              <div style={{ display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap", justifyContent: "center" }}>
                {Object.entries(DEFECT_COLORS).map(([type, color]) => (
                  <div key={type} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-dim)" }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
                    {type}
                  </div>
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-dim)" }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: "#1a3a2a" }} />
                  Pass
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {data && (
            <div className="card">
              <div className="card-title">Wafer Statistics</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  ["Yield", `${data.yield_pct}%`, data.yield_pct >= 92 ? "var(--green)" : data.yield_pct >= 85 ? "var(--amber)" : "var(--red)"],
                  ["Total Dies", data.total_dies, "var(--cyan)"],
                  ["Defect Count", data.defect_count, "var(--red)"],
                  ["Pass Dies", data.total_dies - data.defect_count, "var(--green)"],
                ].map(([label, val, color]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "var(--text-dim)" }}>{label}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {defectBreakdown.length > 0 && (
            <div className="card">
              <div className="card-title">Defect Breakdown</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {defectBreakdown.map((d) => (
                  <div key={d.type}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                      <span style={{ color: "var(--text-secondary)" }}>{d.type}</span>
                      <span style={{ fontFamily: "var(--font-mono)", color: d.color }}>{d.count}</span>
                    </div>
                    <div style={{ background: "var(--bg-hover)", borderRadius: 4, height: 5, overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: `${(d.count / (data?.defect_count || 1)) * 100}%`,
                        background: d.color,
                        borderRadius: 4,
                        transition: "width 0.5s ease",
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
