/*
  App.tsx — Root Application Component
  ─────────────────────────────────────────────────────────────────────────
  PURPOSE:
    This is the shell of the entire application. It owns:
    1. The active page state (which of 6 pages is showing)
    2. The global logs data (fetched every 5 seconds from the Flask backend)
    3. The system status & alert state (derived from log risk scores)
    4. The live clock

  RENDER STRUCTURE:
    <div.app-shell>              → CSS Grid: sidebar(220px) + main(1fr)
      <Sidebar />                → Left nav, receives activePage + onNavigate
      <div.main-area>            → Right side: topbar + content
        <header.topbar>          → Page title, status badge, clock, theme toggle
        <AlertBanner />          → Only renders when risk_score > 60
        <div.content>            → Page component renders here
          {renderPage()}         → Switch statement picks the right page
        </div>
      </div>
    </div>

  DATA FLOW:
    App (owns logs state)
     → passes logs as props to all page components
     → pages are READ-ONLY; they call onRefresh() to trigger a re-fetch
     → only PredictionPage writes new data (via POST /predict)

  AUTO-REFRESH:
    useEffect sets up setInterval(loadHistory, 5000) on mount.
    The cleanup function (return () => clearInterval) runs on unmount.
    Without cleanup, the interval would keep firing after the component dies.
*/

import React, { useState, useEffect, useCallback } from "react";
import "./App.css";
import { LogEntry, SystemStatus } from "./types/types";
import { fetchHistory } from "./services/api";
import { useTheme } from "./ThemeContext";

// ── Page components ──────────────────────────────────────────
import Overview      from "./pages/Overview";
import MetricsPage   from "./pages/MetricsPage";
import HistoryPage   from "./pages/HistoryPage";
import PredictionPage from "./pages/PredictionPage";
import IncidentsPage  from "./pages/IncidentsPage";
import SettingsPage   from "./pages/SettingsPage";

// ── Shared components ────────────────────────────────────────
import Sidebar      from "./components/Sidebar";
import AlertBanner  from "./components/AlertBanner";
import StatusBadge  from "./components/StatusBadge";

// Page type — union of all valid route names (no router library needed)
export type Page = "overview" | "metrics" | "history" | "prediction" | "incidents" | "settings";

// How often to poll the Flask /history endpoint (milliseconds)
const REFRESH_INTERVAL = 5000;

function App() {
  // ── State declarations ──────────────────────────────────────
  // activePage: which of the 6 pages is currently shown
  const [activePage, setActivePage] = useState<Page>("overview");

  // logs: the array of LogEntry objects from GET /history (newest first)
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // systemStatus: derived from the latest log's risk_score
  const [systemStatus, setSystemStatus] = useState<SystemStatus>("healthy");

  // alert: null when healthy, object with title/desc/level when risk > 60
  const [alert, setAlert] = useState<{
    title: string;
    desc: string;
    level: "critical" | "warning";
  } | null>(null);

  // isLoading: true while fetch is in-flight (used to show loading states)
  const [isLoading, setIsLoading] = useState(false);

  // lastRefresh: timestamp of last successful fetch (shown in Logs component)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // currentTime: updated every second by setInterval — drives the live clock
  const [currentTime, setCurrentTime] = useState(new Date());

  // Get theme state from ThemeContext (set up in index.tsx)
  const { theme, toggleTheme } = useTheme();

  // ── Live clock ─────────────────────────────────────────────
  // useEffect with empty [] dependency array runs once on mount.
  // Returns a cleanup that clears the interval on unmount.
  useEffect(() => {
    const tick = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  // ── Alert evaluation ────────────────────────────────────────
  // useCallback memoizes this function so it doesn't cause re-renders
  // when passed as a dependency to loadHistory's useCallback.
  // Logic: check the FIRST item in logs (newest entry):
  //   risk > 80 → Critical (red banner + red badge)
  //   risk > 60 → Warning  (amber banner + amber badge)
  //   else      → Healthy  (no banner + green badge)
  const evaluateAlerts = useCallback((latestLogs: LogEntry[]) => {
    if (!latestLogs.length) return;
    const latest = latestLogs[0]; // First item is newest (API returns DESC order)
    if (latest.risk_score > 80) {
      setAlert({ title: "Critical: System Failure Risk Detected", desc: `Risk score at ${latest.risk_score} — immediate attention required`, level: "critical" });
      setSystemStatus("critical");
    } else if (latest.risk_score > 60) {
      setAlert({ title: "Warning: Elevated Risk Level", desc: `Risk score at ${latest.risk_score} — monitor closely`, level: "warning" });
      setSystemStatus("warning");
    } else {
      setAlert(null);
      setSystemStatus("healthy");
    }
  }, []); // No dependencies — this function never needs to be recreated

  // ── Data fetching ────────────────────────────────────────────
  // loadHistory calls GET /history via the api.ts service layer.
  // It's wrapped in useCallback so the setInterval reference stays stable.
  // Dependencies: [evaluateAlerts] — if evaluateAlerts changes, recreate this too.
  const loadHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchHistory(); // Returns LogEntry[] sorted newest-first
      setLogs(data);
      evaluateAlerts(data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Fetch failed:", err);
      // No user-facing error here — loading state just clears
    } finally {
      setIsLoading(false); // Always runs, even on error
    }
  }, [evaluateAlerts]);

  // ── Auto-refresh setup ───────────────────────────────────────
  // Runs once when loadHistory is first defined (on mount).
  // setInterval calls loadHistory every REFRESH_INTERVAL ms.
  // Cleanup: clearInterval prevents memory leaks on unmount.
  useEffect(() => {
    loadHistory(); // Initial load immediately
    const interval = setInterval(loadHistory, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [loadHistory]);

  // ── Shared props for all pages ───────────────────────────────
  // Spread onto each page component to avoid repeating props.
  const pageProps = { logs, isLoading, onRefresh: loadHistory, lastRefresh };

  // ── Page routing ─────────────────────────────────────────────
  // No react-router — a simple switch renders the correct component.
  // This is fine for 6 static pages with no URL-based navigation.
  const renderPage = () => {
    switch (activePage) {
      case "overview":   return <Overview      {...pageProps} systemStatus={systemStatus} />;
      case "metrics":    return <MetricsPage   {...pageProps} />;
      case "history":    return <HistoryPage   {...pageProps} />;
      case "prediction": return <PredictionPage logs={logs} onRefresh={loadHistory} />;
      case "incidents":  return <IncidentsPage  logs={logs} onNavigate={setActivePage} />;
      case "settings":   return <SettingsPage />;
      default:           return <Overview      {...pageProps} systemStatus={systemStatus} />;
    }
  };

  // Page title map — drives the topbar title text
  const PAGE_TITLES: Record<Page, string> = {
    overview:   "System Overview",
    metrics:    "Metrics",
    history:    "Event History",
    prediction: "Prediction Engine",
    incidents:  "Incidents",
    settings:   "Settings",
  };

  return (
    // app-shell: CSS Grid — sidebar (220px) + main area (1fr remaining)
    <div className="app-shell">

      {/* Sidebar receives activePage (to highlight active nav item)
          and onNavigate (called when user clicks a nav item).
          onNavigate is just setActivePage — updates activePage state above. */}
      <Sidebar activePage={activePage} onNavigate={setActivePage} />

      {/* main-area: flex column — topbar stacked above content */}
      <div className="main-area">

        {/* TOPBAR — sticky, always visible while content scrolls */}
        <header className="topbar">
          {/* Page title — changes with activePage */}
          <div className="topbar-title">{PAGE_TITLES[activePage]}</div>

          {/* Status badge — color changes with systemStatus */}
          <StatusBadge status={systemStatus} />

          {/* Blinking dot — visual indicator that auto-refresh is active */}
          <div className="refresh-indicator" title="Auto-refresh every 5s" />

          {/* THEME TOGGLE BUTTON
              Shows sun icon in dark mode (click to go light)
              Shows moon icon in light mode (click to go dark)
              Calls toggleTheme() from ThemeContext → updates data-theme on <html> */}
          <button className="theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
            {theme === "dark" ? (
              // Sun icon — shown in dark mode to indicate "switch to light"
              <svg viewBox="0 0 16 16">
                <circle cx="8" cy="8" r="3"/>
                <line x1="8" y1="1" x2="8" y2="3"/>
                <line x1="8" y1="13" x2="8" y2="15"/>
                <line x1="1" y1="8" x2="3" y2="8"/>
                <line x1="13" y1="8" x2="15" y2="8"/>
                <line x1="3" y1="3" x2="4.5" y2="4.5"/>
                <line x1="11.5" y1="11.5" x2="13" y2="13"/>
                <line x1="13" y1="3" x2="11.5" y2="4.5"/>
                <line x1="4.5" y1="11.5" x2="3" y2="13"/>
              </svg>
            ) : (
              // Moon icon — shown in light mode to indicate "switch to dark"
              <svg viewBox="0 0 16 16">
                <path d="M13 9.5A6 6 0 0 1 6.5 3c0-.35.03-.69.08-1A6 6 0 1 0 14 9.92a6.07 6.07 0 0 1-1-.42z"/>
              </svg>
            )}
            {theme === "dark" ? "Light" : "Dark"}
          </button>

          {/* Live clock — updates every second via setCurrentTime */}
          <span className="ts-label">{currentTime.toLocaleTimeString()}</span>
        </header>

        {/* ALERT BANNER — only renders when alert is not null
            Conditional rendering: {alert && <AlertBanner>} means
            "if alert is truthy (not null), render AlertBanner"
            onDismiss: sets alert back to null → banner disappears */}
        {alert && (
          <div style={{ padding: "16px 24px 0" }}>
            <AlertBanner
              title={alert.title}
              desc={alert.desc}
              level={alert.level}
              onDismiss={() => setAlert(null)}
            />
          </div>
        )}

        {/* CONTENT AREA — renders the active page component
            The CSS .content > * animation runs on each new page mount,
            giving a smooth fade+slide-up transition between pages */}
        <div className="content">
          {renderPage()}
        </div>
      </div>
    </div>
  );
}

export default App;