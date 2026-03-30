import React, { useMemo, useState } from "react";
import { LogEntry } from "../types/types";
import { Page } from "../App";

interface Props {
  logs: LogEntry[];
  onNavigate: (page: Page) => void;
}

interface Incident {
  id: string;
  severity: "critical" | "high" | "medium";
  title: string;
  cause: string;
  startTime: Date;
  duration: string;
  affectedEntries: number;
  maxRisk: number;
  avgResponseTime: number;
  errorRate: number;
  status: "active" | "resolved";
}

function detectIncidents(logs: LogEntry[]): Incident[] {
  if (!logs.length) return [];

  const incidents: Incident[] = [];
  let id = 1;

  // Detect contiguous windows of high risk
  const WINDOW = 5;
  const HIGH_RISK_THRESHOLD = 60;

  for (let i = 0; i < logs.length - WINDOW + 1; i++) {
    const window = logs.slice(i, i + WINDOW);
    const avgRisk = window.reduce((s, l) => s + l.risk_score, 0) / WINDOW;
    if (avgRisk < HIGH_RISK_THRESHOLD) continue;

    const maxRisk = Math.max(...window.map(l => l.risk_score));
    const avgRT = Math.round(window.reduce((s, l) => s + l.response_time, 0) / WINDOW);
    const errors = window.filter(l => l.status_code >= 500).length;
    const errorRate = (errors / WINDOW) * 100;

    // Determine cause
    const causes: string[] = [];
    if (avgRT > 1000) causes.push("High response time");
    if (errorRate > 20) causes.push("Server errors");
    if (window.some(l => l.cpu_usage > 85)) causes.push("CPU saturation");
    if (window.some(l => l.memory_usage > 85)) causes.push("Memory pressure");

    const severity: Incident["severity"] = maxRisk > 80 ? "critical" : maxRisk > 60 ? "high" : "medium";

    const titles: Record<string, string> = {
      "High response time": "API Latency Spike",
      "Server errors": "Server Error Surge",
      "CPU saturation": "CPU Overload Event",
      "Memory pressure": "Memory Exhaustion Warning",
    };

    const startTime = new Date(logs[i + WINDOW - 1]?.created_at || Date.now());
    const endTime = new Date(logs[i]?.created_at || Date.now());
    const durationMs = Math.abs(endTime.getTime() - startTime.getTime());
    const durationStr = durationMs < 60000 ? `${Math.round(durationMs / 1000)}s` : `${Math.round(durationMs / 60000)}m`;

    incidents.push({
      id: `INC-${String(id++).padStart(4, "0")}`,
      severity,
      title: titles[causes[0]] || "System Anomaly Detected",
      cause: causes.join(", ") || "Unknown cause",
      startTime,
      duration: durationStr,
      affectedEntries: WINDOW,
      maxRisk,
      avgResponseTime: avgRT,
      errorRate: Math.round(errorRate),
      status: i === 0 ? "active" : "resolved",
    });

    // Skip ahead to avoid duplicates
    i += WINDOW - 1;
  }

  return incidents.slice(0, 20);
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#f59e0b",
};

const SEVERITY_BG: Record<string, string> = {
  critical: "var(--red-bg)",
  high: "var(--orange-bg)",
  medium: "var(--amber-bg)",
};

const SeverityBadge: React.FC<{ s: string }> = ({ s }) => (
  <span style={{
    padding: "3px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, letterSpacing: ".4px",
    background: SEVERITY_BG[s], color: SEVERITY_COLOR[s],
    border: `1px solid ${SEVERITY_COLOR[s]}28`,
    textTransform: "uppercase",
  }}>{s}</span>
);

const IncidentsPage: React.FC<Props> = ({ logs, onNavigate }) => {
  const incidents = useMemo(() => detectIncidents(logs), [logs]);
  const [selected, setSelected] = useState<Incident | null>(null);

  const critical = incidents.filter(i => i.severity === "critical").length;
  const high = incidents.filter(i => i.severity === "high").length;
  const active = incidents.filter(i => i.status === "active").length;

  return (
    <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 360px" : "1fr", gap: 16 }}>

      {/* Left — list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { label: "Total Incidents", value: incidents.length, color: "var(--text)" },
            { label: "Critical",  value: critical, color: "#ef4444" },
            { label: "High Risk", value: high, color: "#f97316" },
            { label: "Active Now", value: active, color: active > 0 ? "#ef4444" : "#22c55e" },
          ].map(({ label, value, color }) => (
            <div key={label} className="kpi-card">
              <div className="kpi-label">{label}</div>
              <div className="kpi-value" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Incident list */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">Incident Feed <span>— auto-detected from logs</span></div>
            <button className="card-action" onClick={() => onNavigate("history")}>View Full Log →</button>
          </div>

          {incidents.length === 0 ? (
            <div className="empty" style={{ padding: 48 }}>
              <svg viewBox="0 0 16 16" style={{ width: 40, height: 40 }}>
                <path d="M8 1L15 13H1L8 1Z"/>
                <line x1="8" y1="6" x2="8" y2="9"/>
                <circle cx="8" cy="11" r=".5" fill="currentColor" stroke="none"/>
              </svg>
              <p style={{ fontSize: 14 }}>No incidents detected</p>
              <p>System is operating within normal parameters</p>
            </div>
          ) : (
            <div>
              {incidents.map((inc, idx) => (
                <div key={inc.id} onClick={() => setSelected(selected?.id === inc.id ? null : inc)}
                  style={{
                    padding: "14px 16px",
                    borderBottom: idx < incidents.length - 1 ? "1px solid var(--border)" : "none",
                    cursor: "pointer",
                    background: selected?.id === inc.id ? "var(--bg3)" : "transparent",
                    transition: "background .1s",
                    display: "flex", alignItems: "flex-start", gap: 14,
                  }}
                  onMouseEnter={e => { if (selected?.id !== inc.id) e.currentTarget.style.background = "var(--bg3)"; }}
                  onMouseLeave={e => { if (selected?.id !== inc.id) e.currentTarget.style.background = "transparent"; }}
                >
                  {/* Severity indicator */}
                  <div style={{
                    width: 4, height: 52, borderRadius: 2, background: SEVERITY_COLOR[inc.severity],
                    flexShrink: 0, marginTop: 2,
                    boxShadow: `0 0 8px ${SEVERITY_COLOR[inc.severity]}40`,
                  }} />

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text3)" }}>{inc.id}</span>
                      <SeverityBadge s={inc.severity} />
                      <span style={{
                        padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 600,
                        background: inc.status === "active" ? "var(--red-bg)" : "var(--bg3)",
                        color: inc.status === "active" ? "var(--red)" : "var(--text3)",
                        border: `1px solid ${inc.status === "active" ? "var(--red-border)" : "var(--border)"}`,
                      }}>
                        {inc.status === "active" ? "● Active" : "○ Resolved"}
                      </span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>{inc.title}</div>
                    <div style={{ fontSize: 12, color: "var(--text3)" }}>{inc.cause}</div>
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 500, color: SEVERITY_COLOR[inc.severity] }}>{inc.maxRisk}</div>
                    <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase" }}>peak risk</div>
                    <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>{inc.startTime.toLocaleTimeString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right — detail panel */}
      {selected && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="card">
            <div className="card-head">
              <div className="card-title">{selected.id}</div>
              <button className="card-action" onClick={() => setSelected(null)}>✕ Close</button>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ marginBottom: 16 }}>
                <SeverityBadge s={selected.severity} />
                <h3 style={{ marginTop: 10, fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{selected.title}</h3>
                <p style={{ fontSize: 13, color: "var(--text2)", marginTop: 4 }}>{selected.cause}</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                {[
                  { label: "Peak Risk", value: String(selected.maxRisk), color: SEVERITY_COLOR[selected.severity] },
                  { label: "Duration", value: selected.duration },
                  { label: "Avg RT", value: selected.avgResponseTime + "ms", color: selected.avgResponseTime > 1000 ? "#f59e0b" : "var(--text)" },
                  { label: "Error Rate", value: selected.errorRate + "%", color: selected.errorRate > 10 ? "#ef4444" : "var(--text)" },
                  { label: "Affected", value: selected.affectedEntries + " entries" },
                  { label: "Detected At", value: selected.startTime.toLocaleTimeString() },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: "var(--bg3)", borderRadius: 6, padding: "8px 10px" }}>
                    <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 600, marginBottom: 3 }}>{label}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 500, color: color || "var(--text)" }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Runbook */}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".6px", fontWeight: 600, marginBottom: 10 }}>Suggested Actions</div>
                {[
                  selected.cause.includes("response time") && "Check slow query logs in your database",
                  selected.cause.includes("errors") && "Review application logs for stack traces",
                  selected.cause.includes("CPU") && "Consider horizontal scaling or auto-scaling triggers",
                  selected.cause.includes("Memory") && "Inspect for memory leaks; restart affected pods",
                  "Review recent deployments for regressions",
                ].filter(Boolean).map((action, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 12, color: "var(--text2)" }}>
                    <span style={{ color: "#4f6ef7", fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                    <span>{action}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button className="card-action" style={{ flex: 1 }} onClick={() => onNavigate("history")}>View Logs</button>
                <button className="card-action" style={{ flex: 1 }} onClick={() => onNavigate("prediction")}>Run Prediction</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncidentsPage;