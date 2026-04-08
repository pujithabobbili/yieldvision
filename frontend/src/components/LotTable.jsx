import { useState } from "react";
import { useApi } from "../hooks/useApi";

const STATUS_COLOR = { Complete: "green", "In Progress": "cyan", "On Hold": "amber" };

export default function LotTable() {
  const [statusFilter, setStatusFilter] = useState(null);
  const [productFilter, setProductFilter] = useState(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("yield_pct");
  const [sortDir, setSortDir] = useState("desc");

  const { data, loading } = useApi("/api/lots", {
    status: statusFilter,
    product: productFilter,
  });

  const lots = (data?.data || [])
    .filter((l) => l.lot_id.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const v = sortDir === "asc" ? 1 : -1;
      return a[sortKey] < b[sortKey] ? -v : v;
    });

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortIcon = ({ k }) => sortKey === k ? (sortDir === "asc" ? " ▲" : " ▼") : " ·";

  return (
    <div>
      <div className="controls-row">
        <input
          type="text"
          placeholder="Search lot ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            background: "var(--bg-panel)", border: "1px solid var(--border)",
            color: "var(--text-secondary)", padding: "6px 12px", borderRadius: 6,
            fontFamily: "var(--font-sans)", fontSize: 13, outline: "none",
          }}
        />
        <select value={statusFilter || ""} onChange={(e) => setStatusFilter(e.target.value || null)}>
          <option value="">All Statuses</option>
          <option>Complete</option>
          <option>In Progress</option>
          <option>On Hold</option>
        </select>
        <select value={productFilter || ""} onChange={(e) => setProductFilter(e.target.value || null)}>
          <option value="">All Products</option>
          <option>SECOM-A1</option>
          <option>SECOM-B2</option>
          <option>SECOM-C3</option>
          <option>SECOM-D4</option>
        </select>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-dim)" }}>
          {lots.length} lots
        </span>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div className="loader"><div className="loader-spin" />Loading lots...</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  {[
                    ["lot_id", "Lot ID"], ["product", "Product"], ["process_step", "Process Step"],
                    ["yield_pct", "Yield %"], ["defect_count", "Defects"],
                    ["wafer_count", "Wafers"], ["cycle_time_hrs", "Cycle Time"],
                    ["status", "Status"], ["created_at", "Created"],
                  ].map(([key, label]) => (
                    <th key={key} onClick={() => toggleSort(key)} style={{ cursor: "pointer" }}>
                      {label}<SortIcon k={key} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lots.map((lot) => (
                  <tr key={lot.lot_id}>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--cyan)" }}>
                      {lot.lot_id}
                    </td>
                    <td>{lot.product}</td>
                    <td>{lot.process_step}</td>
                    <td>
                      <span style={{ color: lot.yield_pct >= 92 ? "var(--green)" : lot.yield_pct >= 85 ? "var(--amber)" : "var(--red)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                        {lot.yield_pct}%
                      </span>
                    </td>
                    <td style={{ color: lot.defect_count > 50 ? "var(--red)" : "var(--text-secondary)" }}>
                      {lot.defect_count}
                    </td>
                    <td>{lot.wafer_count}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{lot.cycle_time_hrs}h</td>
                    <td>
                      <span className={`badge ${STATUS_COLOR[lot.status]}`}>{lot.status}</span>
                    </td>
                    <td style={{ fontSize: 12, color: "var(--text-dim)" }}>{lot.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
