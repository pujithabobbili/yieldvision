import { useState } from "react";
import Overview from "./components/Overview";
import YieldTrend from "./components/YieldTrend";
import LotTable from "./components/LotTable";
import WaferMap from "./components/WaferMap";
import DefectAnalysis from "./components/DefectAnalysis";
import YieldPrediction from "./components/YieldPrediction";
import "./App.css";

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: "⬡" },
  { id: "yield", label: "Yield Trend", icon: "◈" },
  { id: "lots", label: "Lot Explorer", icon: "⊞" },
  { id: "wafer", label: "Wafer Map", icon: "◎" },
  { id: "defects", label: "Defect Analysis", icon: "◆" },
  { id: "prediction", label: "Yield Prediction", icon: "◉" },
];

export default function App() {
  const [activePage, setActivePage] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="app">
      <aside className={`sidebar ${sidebarOpen ? "open" : "collapsed"}`}>
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-mark">◈</span>
            {sidebarOpen && (
              <div className="logo-text">
                <span className="logo-title">YieldVision</span>
                <span className="logo-sub">Semiconductor Analytics</span>
              </div>
            )}
          </div>
          <button className="toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? "◂" : "▸"}
          </button>
        </div>

        <nav className="nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activePage === item.id ? "active" : ""}`}
              onClick={() => setActivePage(item.id)}
              title={!sidebarOpen ? item.label : ""}
            >
              <span className="nav-icon">{item.icon}</span>
              {sidebarOpen && <span className="nav-label">{item.label}</span>}
              {activePage === item.id && <span className="nav-indicator" />}
            </button>
          ))}
        </nav>

        {sidebarOpen && (
          <div className="sidebar-footer">
            <div className="status-dot active" />
            <span>Live · Updated just now</span>
          </div>
        )}
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="page-title">
            <h1>{NAV_ITEMS.find((n) => n.id === activePage)?.label}</h1>
            <span className="breadcrumb">YieldVision / {NAV_ITEMS.find((n) => n.id === activePage)?.label}</span>
          </div>
          <div className="topbar-right">
            <div className="fab-node">FAB-03 · San Jose</div>
            <div className="time-badge">
              {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        </header>

        <div className="page-content">
          {activePage === "overview" && <Overview />}
          {activePage === "yield" && <YieldTrend />}
          {activePage === "lots" && <LotTable />}
          {activePage === "wafer" && <WaferMap />}
          {activePage === "defects" && <DefectAnalysis />}
          {activePage === "prediction" && <YieldPrediction />}
        </div>
      </main>
    </div>
  );
}
