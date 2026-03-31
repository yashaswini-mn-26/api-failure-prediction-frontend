import React, { useState, useEffect, useRef, useCallback } from "react";
import { Chart, registerables } from "chart.js";
import { ConnectedProject, EndpointTestResult, ParsedRoute } from "../types/types";
import { testAllEndpoints } from "../services/api";

Chart.register(...registerables);

interface Props {
  project: ConnectedProject | null;
  onNavigate: (page: any) => void;
}

const METHOD_COLOR: Record<string, string> = {
  GET: "#22c55e", POST: "#4f6ef7", PUT: "#f59e0b", DELETE: "#ef4444", PATCH: "#a855f7",
};

interface MetricPoint { time: string; status: number; rt: number; risk: number; }

// Per-endpoint history stored in memory (resets on page reload — use backend for persistence)
const endpointHistory: Record<string, MetricPoint[]> = {};

const EndpointMonitorPage: React.FC<Props> = ({ project, onNavigate }) => {
  const [results, setResults]     = useState<Record<string, EndpointTestResult>>({});
  const [isPolling, setIsPolling] = useState(false);
  const [interval, setIntervalMs] = useState(10000);
  const [selected, setSelected]   = useState<ParsedRoute | null>(null);
  const [tick, setTick]           = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chartRef    = useRef<Chart | null>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);

  const poll = useCallback(async () => {
    if (!project) return;
    try {
      const res = await testAllEndpoints({
        project_id: project.id,
        base_url: project.base_url,
        routes: project.routes.map(r => ({ method: r.method, path: r.path })),
      });
      const map: Record<string, EndpointTestResult> = {};
      res.data.forEach(r => {
        const key = `${r.method}:${r.path}`;
        map[key] = r;
        if (!endpointHistory[key]) endpointHistory[key] = [];
        endpointHistory[key].push({ time: new Date().toLocaleTimeString(), status: r.status_code, rt: r.response_time_ms, risk: r.risk_score });
        if (endpointHistory[key].length > 30) endpointHistory[key].shift();
      });
      setResults(map);
      setTick(t => t + 1);
    } catch {}
  }, [project]);

  useEffect(() => {
    if (isPolling) {
      poll();
      intervalRef.current = setInterval(poll, interval);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPolling, interval, poll]);

  // Chart for selected endpoint
  useEffect(() => {
    if (!selected || !canvasRef.current) return;
    chartRef.current?.destroy();
    const key = `${selected.method}:${selected.path}`;
    const history = endpointHistory[key] || [];
    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels: history.map(h => h.time),
        datasets: [
          { label: "Response Time (ms)", data: history.map(h => h.rt), borderColor: "#4f6ef7", backgroundColor: "rgba(79,110,247,0.1)", fill: true, tension: 0.4, pointRadius: 2, borderWidth: 2, yAxisID: "rt" },
          { label: "Risk Score", data: history.map(h => h.risk), borderColor: "#ef4444", backgroundColor: "transparent", tension: 0.4, pointRadius: 2, borderWidth: 1.5, borderDash: [4, 3], yAxisID: "risk" },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: true, position: "top", labels: { color: "#8b90a0", font: { size: 11 }, boxWidth: 10, usePointStyle: true } },
          tooltip: { backgroundColor: "#111318", borderColor: "#ffffff18", borderWidth: 1, titleColor: "#e8eaf0", bodyColor: "#8b90a0", padding: 10 },
        },
        scales: {
          x: { ticks: { color: "#555b6e", font: { size: 10 }, maxTicksLimit: 8 }, grid: { color: "rgba(255,255,255,0.03)" } },
          rt: { type: "linear", position: "left", ticks: { color: "#555b6e", font: { size: 10 }, callback: v => v + "ms" }, grid: { color: "rgba(255,255,255,0.03)" } },
          risk: { type: "linear", position: "right", min: 0, max: 100, ticks: { color: "#555b6e", font: { size: 10 } }, grid: { display: false } },
        },
        animation: { duration: 300 },
      },
    });
    return () => chartRef.current?.destroy();
  }, [selected, tick]);

  if (!project) {
    return (
      <div className="card" style={{ padding: 64, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>📡</div>
        <h3 style={{ fontFamily: "var(--font-head)", fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>No project connected</h3>
        <p style={{ fontSize: 14, color: "var(--text2)", marginBottom: 24 }}>Connect a repo first to monitor its endpoints.</p>
        <button onClick={() => onNavigate("connect")} style={{ padding: "10px 24px", borderRadius: 8, background: "var(--accent)", border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-head)" }}>
          Connect a Project →
        </button>
      </div>
    );
  }

  const tested = Object.keys(results);
  const passing = tested.filter(k => results[k].status_code >= 200 && results[k].status_code < 400).length;
  const failing = tested.filter(k => results[k].status_code >= 400 || results[k].error).length;
  const avgRt = tested.length ? Math.round(tested.reduce((s, k) => s + results[k].response_time_ms, 0) / tested.length) : 0;
  const uptime = tested.length ? Math.round((passing / tested.length) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Control bar */}
      <div className="card">
        <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 14, fontFamily: "var(--font-head)", fontWeight: 700, color: "var(--text)" }}>{project.name}</div>
            <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text3)" }}>{project.base_url}</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ fontSize: 12, color: "var(--text2)", display: "flex", alignItems: "center", gap: 8 }}>
              Poll every
              <select value={interval} onChange={e => setIntervalMs(Number(e.target.value))} style={{ height: 30, borderRadius: 8, background: "var(--bg3)", border: "1px solid var(--border2)", color: "var(--text)", fontSize: 12, padding: "0 8px", outline: "none" }}>
                <option value={5000}>5s</option>
                <option value={10000}>10s</option>
                <option value={30000}>30s</option>
                <option value={60000}>60s</option>
              </select>
            </label>
            <button onClick={() => setIsPolling(p => !p)} style={{
              padding: "8px 20px", borderRadius: 8,
              background: isPolling ? "var(--red-bg)" : "var(--accent)",
              color: isPolling ? "var(--red)" : "#fff",
              fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-head)",
              border: isPolling ? "1px solid var(--red-border)" : "none",
            }}>
              {isPolling ? "⏹ Stop Monitoring" : "▶ Start Monitoring"}
            </button>
            <button onClick={poll} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border2)", background: "none", color: "var(--accent2)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body)" }}>
              ↻ Test Now
            </button>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {[
          { label: "Uptime", value: tested.length ? uptime + "%" : "—", color: uptime > 90 ? "#22c55e" : "#ef4444" },
          { label: "Passing", value: String(passing), color: "#22c55e" },
          { label: "Failing", value: String(failing), color: failing > 0 ? "#ef4444" : "var(--text)" },
          { label: "Avg Response", value: avgRt ? avgRt + "ms" : "—", color: avgRt > 1000 ? "#f59e0b" : "var(--text)" },
        ].map(({ label, value, color }) => (
          <div key={label} className="kpi-card">
            <div className="kpi-label">{label}</div>
            <div className="kpi-value" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Endpoint grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
        {project.routes.map((route, i) => {
          const key = `${route.method}:${route.path}`;
          const result = results[key];
          const history = endpointHistory[key] || [];
          const isSelected = selected && `${selected.method}:${selected.path}` === key;
          const statusOk = result ? (result.status_code >= 200 && result.status_code < 400) : null;

          return (
            <div key={i} onClick={() => setSelected(route)}
              style={{ padding: "14px 16px", borderRadius: 12, background: "var(--bg2)", border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`, cursor: "pointer", transition: "all .15s" }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = "var(--border3)"; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = "var(--border)"; }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4, background: (METHOD_COLOR[route.method] || "#888") + "18", color: METHOD_COLOR[route.method] || "var(--text2)" }}>
                  {route.method}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{route.path}</span>
                {result && (
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusOk ? "#22c55e" : "#ef4444", flexShrink: 0 }} />
                )}
              </div>

              {result ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                  {[
                    { label: "Status", value: result.status_code || "ERR", color: statusOk ? "#22c55e" : "#ef4444" },
                    { label: "Time", value: result.response_time_ms + "ms", color: result.response_time_ms > 1000 ? "#f59e0b" : "var(--text)" },
                    { label: "Risk", value: String(result.risk_score), color: result.risk_score > 60 ? "#ef4444" : "#22c55e" },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background: "var(--bg3)", borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
                      <div style={{ fontSize: 9, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".4px", fontWeight: 600, marginBottom: 2 }}>{label}</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 500, color }}>{value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "var(--text3)" }}>
                  {isPolling ? "Waiting for first poll…" : "Hit 'Test Now' to check"}
                </div>
              )}

              {/* Mini sparkline if we have history */}
              {history.length > 1 && (
                <div style={{ marginTop: 8, height: 28, display: "flex", alignItems: "flex-end", gap: 1 }}>
                  {history.slice(-20).map((p, idx) => {
                    const maxRt = Math.max(...history.map(h => h.rt));
                    const h = maxRt > 0 ? Math.max(3, Math.round((p.rt / maxRt) * 24)) : 3;
                    const c = p.status >= 400 ? "#ef4444" : p.rt > 1000 ? "#f59e0b" : "#4f6ef7";
                    return <div key={idx} style={{ width: 3, height: h, borderRadius: 1, background: c, opacity: 0.7 + (idx / history.length) * 0.3 }} />;
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected endpoint detail chart */}
      {selected && (
        <div className="card">
          <div className="card-head">
            <div className="card-title">
              <span style={{ color: METHOD_COLOR[selected.method] }}>{selected.method}</span> {selected.path}
              <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text3)", fontWeight: 400, marginLeft: 8 }}>— live history</span>
            </div>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 16 }}>✕</button>
          </div>
          <div className="card-body">
            {(endpointHistory[`${selected.method}:${selected.path}`] || []).length < 2 ? (
              <div style={{ textAlign: "center", color: "var(--text3)", padding: 32, fontSize: 13 }}>
                Run at least 2 polls to see history chart
              </div>
            ) : (
              <div style={{ height: 240, position: "relative" }}>
                <canvas ref={canvasRef} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EndpointMonitorPage;