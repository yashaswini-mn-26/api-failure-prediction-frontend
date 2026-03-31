
import React, { useState, useEffect, useCallback } from "react";
import "./App.css";
import { LogEntry, SystemStatus, ConnectedProject } from "./types/types";
import { fetchHistory } from "./services/api";
import { useTheme } from "./ThemeContext";

// Existing pages
import Overview       from "./pages/Overview";
import MetricsPage    from "./pages/MetricsPage";
import HistoryPage    from "./pages/HistoryPage";
import PredictionPage from "./pages/PredictionPage";
import IncidentsPage  from "./pages/IncidentsPage";
import SettingsPage   from "./pages/SettingsPage";

// New pages
import ConnectPage          from "./pages/ConnectPage";
import RepoAnalyzerPage     from "./pages/RepoAnalyzerPage";
import EndpointMonitorPage  from "./pages/EndpointMonitorPage";

import Sidebar     from "./components/Sidebar";
import AlertBanner from "./components/AlertBanner";
import StatusBadge from "./components/StatusBadge";

export type Page =
  | "overview" | "metrics" | "history" | "prediction" | "incidents" | "settings"
  | "connect"  | "repo-analyzer" | "endpoint-monitor";

const REFRESH_INTERVAL = 5000;

function App() {
  const [activePage, setActivePage] = useState<Page>("overview");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>("healthy");
  const [alert, setAlert] = useState<{ title: string; desc: string; level: "critical" | "warning" } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // GitHub project state — lives in App so it persists across page switches
  const [projects, setProjects] = useState<ConnectedProject[]>([]);
  const [activeProject, setActiveProject] = useState<ConnectedProject | null>(null);

  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const tick = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  const evaluateAlerts = useCallback((latestLogs: LogEntry[]) => {
    if (!latestLogs.length) return;
    const latest = latestLogs[0];
    if (latest.risk_score > 80) {
      setAlert({ title: "Critical: System Failure Risk Detected", desc: `Risk score at ${latest.risk_score}`, level: "critical" });
      setSystemStatus("critical");
    } else if (latest.risk_score > 60) {
      setAlert({ title: "Warning: Elevated Risk Level", desc: `Risk score at ${latest.risk_score}`, level: "warning" });
      setSystemStatus("warning");
    } else { setAlert(null); setSystemStatus("healthy"); }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchHistory();
      setLogs(data);
      evaluateAlerts(data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Fetch failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [evaluateAlerts]);

  useEffect(() => {
    loadHistory();
    const interval = setInterval(loadHistory, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [loadHistory]);

  const handleProjectAdded = (p: ConnectedProject) => {
    setProjects(prev => [...prev, p]);
    setActiveProject(p);
  };

  const pageProps = { logs, isLoading, onRefresh: loadHistory, lastRefresh };

  const PAGE_TITLES: Record<Page, string> = {
    overview: "System Overview", metrics: "Metrics", history: "Event History",
    prediction: "Prediction Engine", incidents: "Incidents", settings: "Settings",
    connect: "Connect Repository", "repo-analyzer": "Repo Analyzer",
    "endpoint-monitor": "Endpoint Monitor",
  };

  const renderPage = () => {
    switch (activePage) {
      case "overview":          return <Overview      {...pageProps} systemStatus={systemStatus} />;
      case "metrics":           return <MetricsPage   {...pageProps} />;
      case "history":           return <HistoryPage   {...pageProps} />;
      case "prediction":        return <PredictionPage logs={logs} onRefresh={loadHistory} />;
      case "incidents":         return <IncidentsPage  logs={logs} onNavigate={setActivePage} />;
      case "settings":          return <SettingsPage />;
      case "connect":           return <ConnectPage projects={projects} onProjectAdded={handleProjectAdded} onProjectSelect={setActiveProject} onNavigate={setActivePage} />;
      case "repo-analyzer":     return <RepoAnalyzerPage project={activeProject} onNavigate={setActivePage} />;
      case "endpoint-monitor":  return <EndpointMonitorPage project={activeProject} onNavigate={setActivePage} />;
      default:                  return <Overview      {...pageProps} systemStatus={systemStatus} />;
    }
  };

  return (
    <div className="app-shell">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-title">{PAGE_TITLES[activePage]}</div>
          <StatusBadge status={systemStatus} />
          
          <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
            {theme === "dark" ? (
              <svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="3"/><line x1="8" y1="1" x2="8" y2="3"/><line x1="8" y1="13" x2="8" y2="15"/><line x1="1" y1="8" x2="3" y2="8"/><line x1="13" y1="8" x2="15" y2="8"/><line x1="3" y1="3" x2="4.5" y2="4.5"/><line x1="11.5" y1="11.5" x2="13" y2="13"/><line x1="13" y1="3" x2="11.5" y2="4.5"/><line x1="4.5" y1="11.5" x2="3" y2="13"/></svg>
            ) : (
              <svg viewBox="0 0 16 16"><path d="M13 9.5A6 6 0 0 1 6.5 3c0-.35.03-.69.08-1A6 6 0 1 0 14 9.92a6.07 6.07 0 0 1-1-.42z"/></svg>
            )}
            {theme === "dark" ? "Light" : "Dark"}
          </button>
          <div className="refresh-indicator" title="Auto-refresh every 5s" />
          <span className="ts-label">{currentTime.toLocaleTimeString()}</span>
        </header>

        {alert && (
          <div style={{ padding: "16px 24px 0" }}>
            <AlertBanner title={alert.title} desc={alert.desc} level={alert.level} onDismiss={() => setAlert(null)} />
          </div>
        )}

        <div className="content">{renderPage()}</div>
      </div>
    </div>
  );
}

export default App;
