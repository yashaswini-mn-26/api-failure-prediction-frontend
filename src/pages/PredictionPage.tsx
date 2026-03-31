import React, { useState, useRef, useEffect } from "react";
import { Chart, registerables } from "chart.js";
import { LogEntry, FormData, PredictionResult } from "../types/types";
import { predictAPI } from "../services/api";

Chart.register(...registerables);

interface Props {
  logs: LogEntry[];
  onRefresh: () => void;
}

interface HistoryItem {
  input: FormData;
  result: PredictionResult;
  timestamp: Date;
}

const SCENARIOS: { label: string; desc: string; data: FormData; color: string }[] = [
  { label: "Healthy", desc: "Normal operating conditions", color: "#22c55e", data: { response_time: 80, status_code: 200, cpu_usage: 32, memory_usage: 45 } },
  { label: "High Load", desc: "Traffic spike, CPU pressure", color: "#f59e0b", data: { response_time: 650, status_code: 200, cpu_usage: 91, memory_usage: 78 } },
  { label: "DB Slowdown", desc: "Slow queries, timeout risk", color: "#f97316", data: { response_time: 1800, status_code: 200, cpu_usage: 55, memory_usage: 60 } },
  { label: "Server Crash", desc: "5xx errors, memory overflow", color: "#ef4444", data: { response_time: 2500, status_code: 503, cpu_usage: 98, memory_usage: 95 } },
  { label: "Memory Leak", desc: "Gradual memory exhaustion", color: "#ef4444", data: { response_time: 320, status_code: 200, cpu_usage: 45, memory_usage: 93 } },
  { label: "DDoS", desc: "Request flood, CPU saturation", color: "#ef4444", data: { response_time: 4200, status_code: 503, cpu_usage: 99, memory_usage: 88 } },
];

const FIELDS: { name: keyof FormData; label: string; min: number; max: number; step: number; unit: string; icon: string }[] = [
  { name: "response_time", label: "Response Time", min: 10, max: 5000, step: 10, unit: "ms", icon: "⏱" },
  { name: "status_code",   label: "Status Code",   min: 200, max: 503, step: 1, unit: "", icon: "📡" },
  { name: "cpu_usage",     label: "CPU Usage",     min: 0, max: 100, step: 1, unit: "%", icon: "🖥" },
  { name: "memory_usage",  label: "Memory Usage",  min: 0, max: 100, step: 1, unit: "%", icon: "💾" },
];

// ── Confidence Meter ──────────────────────────────────────────
const ConfidenceMeter: React.FC<{ score: number; confidence: number }> = ({ score, confidence }) => {
  const color = score > 80 ? "#ef4444" : score > 60 ? "#f97316" : score > 30 ? "#f59e0b" : "#22c55e";
  const label = score > 80 ? "Critical" : score > 60 ? "High Risk" : score > 30 ? "Moderate" : "Stable";

  return (
    <div style={{ textAlign: "center", padding: "20px 0" }}>
      <div style={{ position: "relative", width: 140, height: 140, margin: "0 auto 16px" }}>
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r="56" fill="none" stroke="var(--bg4)" strokeWidth="10"/>
          <circle cx="70" cy="70" r="56" fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={`${(score / 100) * 351.86} 351.86`}
            strokeLinecap="round"
            transform="rotate(-90 70 70)"
            style={{ transition: "stroke-dasharray 0.6s ease, stroke 0.4s ease" }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 500, color, lineHeight: 1 }}>{score}</div>
          <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px", marginTop: 2 }}>Risk Score</div>
        </div>
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 12, color: "var(--text3)" }}>Confidence: <span style={{ fontFamily: "var(--font-mono)", color: "var(--text2)" }}>{(confidence * 100).toFixed(1)}%</span></div>
    </div>
  );
};

// ── History sparkline ─────────────────────────────────────────
const HistorySparkline: React.FC<{ history: HistoryItem[] }> = ({ history }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const chart = useRef<Chart | null>(null);

  useEffect(() => {
    if (!ref.current || history.length < 2) return;
    chart.current?.destroy();
    const pts = [...history].reverse();
    chart.current = new Chart(ref.current, {
      type: "line",
      data: {
        labels: pts.map((_, i) => i + 1),
        datasets: [{
          data: pts.map(h => h.result.risk_score),
          borderColor: "#4f6ef7",
          backgroundColor: "rgba(79,110,247,0.1)",
          fill: true, tension: 0.4, pointRadius: 3,
          pointBackgroundColor: pts.map(h => h.result.risk_score > 60 ? "#ef4444" : "#22c55e"),
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: "#111318", borderColor: "#ffffff18", borderWidth: 1, titleColor: "#e8eaf0", bodyColor: "#8b90a0", padding: 10 } },
        scales: {
          x: { display: false },
          y: { min: 0, max: 100, ticks: { color: "#555b6e", font: { size: 10 } }, grid: { color: "rgba(255,255,255,0.03)" } },
        },
        animation: { duration: 300 },
      },
    });
    return () => chart.current?.destroy();
  }, [history]);

  return <div style={{ height: 100 }}><canvas ref={ref} /></div>;
};

// ── Main Page ─────────────────────────────────────────────────
const PredictionPage: React.FC<Props> = ({ logs, onRefresh }) => {
  const [form, setForm] = useState<FormData>({ response_time: 100, status_code: 200, cpu_usage: 50, memory_usage: 50 });
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: Number(e.target.value) }));
    setActiveScenario(null);
  };

  const applyScenario = (s: typeof SCENARIOS[0]) => {
    setForm(s.data);
    setActiveScenario(s.label);
  };

  const runPrediction = async () => {
    setIsPredicting(true);
    try {
      const res = await predictAPI(form);
      setResult(res.data);
      setHistory(prev => [{ input: { ...form }, result: res.data, timestamp: new Date() }, ...prev].slice(0, 20));
      onRefresh();
    } catch {
      // graceful
    } finally {
      setIsPredicting(false);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16, alignItems: "start" }}>

      {/* Left column */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Scenario Library */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">Scenario Library</div>
            <span style={{ fontSize: 11, color: "var(--text3)" }}>Click to load</span>
          </div>
          <div style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {SCENARIOS.map(s => (
              <button key={s.label} onClick={() => applyScenario(s)} style={{
                padding: "10px 12px",
                borderRadius: "var(--r)",
                background: activeScenario === s.label ? s.color + "15" : "var(--bg3)",
                border: `1px solid ${activeScenario === s.label ? s.color + "40" : "var(--border)"}`,
                cursor: "pointer",
                textAlign: "left",
                transition: "all .15s",
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: activeScenario === s.label ? s.color : "var(--text)", marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: "var(--text3)" }}>{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Input Sliders */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">Input Parameters</div>
            {activeScenario && <span style={{ fontSize: 11, color: "var(--accent2)", fontWeight: 600 }}>Scenario: {activeScenario}</span>}
          </div>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 20 }}>
            {FIELDS.map(field => {
              // const pct = ((form[field.name] - field.min) / (field.max - field.min)) * 100;
              const isWarning = field.name === "cpu_usage" || field.name === "memory_usage" ? form[field.name] > 80 : field.name === "response_time" ? form[field.name] > 1000 : false;
              const isError = field.name === "status_code" ? form[field.name] >= 500 : false;

              return (
                <div key={field.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 14 }}>{field.icon}</span>
                      <span style={{ fontSize: 12, color: "var(--text2)", fontWeight: 500 }}>{field.label}</span>
                    </div>
                    <span style={{
                      fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 500,
                      color: isError ? "#ef4444" : isWarning ? "#f59e0b" : "var(--text)",
                    }}>
                      {form[field.name]}{field.unit}
                    </span>
                  </div>
                  <input type="range" name={field.name} min={field.min} max={field.max} step={field.step}
                    value={form[field.name]} onChange={handleChange}
                    style={{ accentColor: isError ? "#ef4444" : isWarning ? "#f59e0b" : "var(--accent2)" } as any}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text3)", marginTop: 3 }}>
                    <span>{field.min}{field.unit}</span>
                    <span>{field.max}{field.unit}</span>
                  </div>
                </div>
              );
            })}

            <button className="predict-btn" onClick={runPrediction} disabled={isPredicting}>
              <svg viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                <path d="M8 2L14 5V11L8 14L2 11V5L8 2Z"/>
                <circle cx="8" cy="8" r="2" fill="white" stroke="none"/>
              </svg>
              {isPredicting ? "Analyzing…" : "Run Prediction"}
            </button>
          </div>
        </div>

        {/* Suggestion */}
 {result && (
  <div className="card">
    <div className="card-head">
      <div className="card-title">Recommendation Engine</div>
    </div>

    <div style={{ padding: 16 }}>
      {result.suggestion ? (
        result.suggestion.split(" | ").map((s, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "10px 12px",
              borderRadius: "var(--r)",
              background: "var(--bg3)",
              border: "1px solid var(--border)",
              marginBottom: 8,
            }}
          >
            <span
              style={{
                color: "#f59e0b",
                fontSize: 14,
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              ⚡
            </span>
            <span style={{ fontSize: 13, color: "var(--text2)" }}>
              {s}
            </span>
          </div>
        ))
      ) : (
        <div
          style={{
            padding: "12px",
            borderRadius: "var(--r)",
            background: "var(--bg3)",
            border: "1px solid var(--border)",
            fontSize: 13,
            color: "var(--text3)",
            textAlign: "center",
          }}
        >
          No recommendations available
        </div>
      )}
    </div>
  </div>
)}

        {/* History chart */}
        {history.length >= 2 && (
          <div className="card">
            <div className="card-head">
              <div className="card-title">Session Risk Trend</div>
              <span style={{ fontSize: 11, color: "var(--text3)" }}>{history.length} predictions</span>
            </div>
            <div style={{ padding: "8px 16px 16px" }}>
              <HistorySparkline history={history} />
            </div>
          </div>
        )}
      </div>

      {/* Right column — result + history */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Result card */}
        <div className="card">
          <div className="card-head"><div className="card-title">Prediction Result</div></div>
          {result ? (
            <>
              <ConfidenceMeter score={result.risk_score} confidence={result.confidence} />
              <div style={{ padding: "0 16px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { label: "Response Time", value: form.response_time + "ms", warn: form.response_time > 1000 },
                  { label: "Status Code", value: String(form.status_code), warn: form.status_code >= 500 },
                  { label: "CPU", value: form.cpu_usage + "%", warn: form.cpu_usage > 85 },
                  { label: "Memory", value: form.memory_usage + "%", warn: form.memory_usage > 85 },
                ].map(({ label, value, warn }) => (
                  <div key={label} style={{ background: "var(--bg3)", borderRadius: "var(--r)", padding: "8px 10px" }}>
                    <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 600, marginBottom: 3 }}>{label}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 500, color: warn ? "#ef4444" : "var(--text)" }}>{value}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty" style={{ padding: 40 }}>
              <svg viewBox="0 0 16 16" style={{ width: 36, height: 36 }}>
                <path d="M8 2L14 5V11L8 14L2 11V5L8 2Z"/>
                <circle cx="8" cy="8" r="2" fill="currentColor" stroke="none"/>
              </svg>
              <p>Run a prediction to see results</p>
            </div>
          )}
        </div>

        {/* Prediction history */}
        {history.length > 0 && (
          <div className="card">
            <div className="card-head">
              <div className="card-title">Recent Predictions</div>
              <button className="card-action" onClick={() => setHistory([])}>Clear</button>
            </div>
            <div style={{ maxHeight: 340, overflowY: "auto" }}>
              {history.map((item, i) => {
                // const isHigh = item.result.risk_score > 60;
                const color = item.result.risk_score > 80 ? "#ef4444" : item.result.risk_score > 60 ? "#f97316" : item.result.risk_score > 30 ? "#f59e0b" : "#22c55e";
                return (
                  <div key={i} onClick={() => { setForm(item.input); setResult(item.result); }} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px", borderBottom: "1px solid var(--border)",
                    cursor: "pointer", transition: "background .1s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--bg3)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: "var(--text2)", fontFamily: "var(--font-mono)" }}>
                        RT:{item.input.response_time}ms · CPU:{item.input.cpu_usage}% · SC:{item.input.status_code}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 1 }}>
                        {item.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 15, fontFamily: "var(--font-mono)", fontWeight: 500, color }}>{item.result.risk_score}</div>
                      <div style={{ fontSize: 9, color: "var(--text3)", textTransform: "uppercase" }}>score</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PredictionPage;