import React from "react";
import { LogEntry } from "../types/types";

interface Props {
  logs: LogEntry[];
  lastRefresh: Date | null;
  onRefresh: () => void;
}

function getRiskColor(score: number): string {
  if (score > 60) return "#ef4444";
  if (score > 30) return "#f59e0b";
  return "#22c55e";
}

const Logs: React.FC<Props> = ({ logs, lastRefresh, onRefresh }) => {
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">
          Recent Events{" "}
          <span>— {logs.length} entries</span>
        </div>
        <button className="card-action" onClick={onRefresh}>
          ↻ Live
        </button>
      </div>

      {lastRefresh && (
        <div style={{
          padding: "6px 14px",
          fontSize: 11,
          color: "var(--text3)",
          borderBottom: "1px solid var(--border)",
          fontFamily: "var(--font-mono)",
        }}>
          Last updated: {lastRefresh.toLocaleTimeString()}
        </div>
      )}

      <div className="log-scroll">
        {logs.length === 0 ? (
          <div className="empty">
            <svg viewBox="0 0 16 16">
              <path d="M2 4h12v9a1 1 0 01-1 1H3a1 1 0 01-1-1V4Z" />
              <path d="M0 4h16" />
              <circle cx="5" cy="2" r=".5" fill="currentColor" />
              <circle cx="8" cy="2" r=".5" fill="currentColor" />
              <circle cx="11" cy="2" r=".5" fill="currentColor" />
            </svg>
            <p>Waiting for data…</p>
          </div>
        ) : (
          <table className="log-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>CPU</th>
                <th>Mem</th>
                <th>RT</th>
                <th>Status</th>
                <th>Risk</th>
                <th>Prediction</th>
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, 15).map((log, i) => {
                const isHigh = log.prediction === "High Risk" ||
                               (log.prediction?.toLowerCase().includes("high") ?? false);
                const riskColor = getRiskColor(log.risk_score);
                const time = log.created_at
                  ? new Date(log.created_at).toLocaleTimeString()
                  : (log.time ?? "—");

                return (
                  <tr key={i}>
                    <td>{time}</td>
                    <td>{log.cpu_usage}%</td>
                    <td>{log.memory_usage}%</td>
                    <td>{log.response_time}ms</td>
                    <td style={{ color: log.status_code >= 500 ? "var(--red)" : "var(--text2)" }}>
                      {log.status_code}
                    </td>
                    <td>
                      <div className="risk-bar-wrap">
                        <div className="risk-bar">
                          <div
                            className="risk-fill"
                            style={{ width: `${log.risk_score}%`, background: riskColor }}
                          />
                        </div>
                        <span style={{ fontSize: 11, color: riskColor }}>{log.risk_score}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`pred-badge ${isHigh ? "pred-high" : "pred-stable"}`}>
                        {isHigh ? "⬥ High Risk" : "✓ Stable"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Logs;