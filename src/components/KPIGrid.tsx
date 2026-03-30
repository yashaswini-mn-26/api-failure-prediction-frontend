import React, { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import { LogEntry } from "../types/types";

Chart.register(...registerables);

interface Props {
  logs: LogEntry[];
}

interface KPIConfig {
  id: string;
  label: string;
  key: keyof LogEntry;
  unit: string;
  color: string;
  sparkId: string;
}

const KPIS: KPIConfig[] = [
  { id: "rt",   label: "Avg Response Time", key: "response_time",  unit: "ms",  color: "#f59e0b", sparkId: "spark-rt" },
  { id: "cpu",  label: "Avg CPU Usage",     key: "cpu_usage",      unit: "%",   color: "#4f6ef7", sparkId: "spark-cpu" },
  { id: "mem",  label: "Avg Memory Usage",  key: "memory_usage",   unit: "%",   color: "#22c55e", sparkId: "spark-mem" },
  { id: "risk", label: "Avg Risk Score",    key: "risk_score",     unit: " pts", color: "#ef4444", sparkId: "spark-risk" },
];

function avg(arr: LogEntry[], key: keyof LogEntry): number {
  if (!arr.length) return 0;
  return Math.round(arr.reduce((s, d) => s + (Number(d[key]) || 0), 0) / arr.length);
}

function getTrend(now: number, then: number): { cls: string; label: string } {
  const diff = now - then;
  if (Math.abs(diff) < 3) return { cls: "trend-neutral", label: "→ Stable" };
  return diff > 0
    ? { cls: "trend-up",   label: `+${diff}` }
    : { cls: "trend-down", label: `${diff}` };
}

const KPICard: React.FC<{ cfg: KPIConfig; logs: LogEntry[] }> = ({ cfg, logs }) => {
  const chartRef = useRef<Chart | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels: [],
        datasets: [{
          data: [],
          borderColor: cfg.color,
          borderWidth: 1.5,
          fill: true,
          backgroundColor: cfg.color + "25",
          tension: 0.4,
          pointRadius: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
        animation: { duration: 300 },
      },
    });

    return () => chartRef.current?.destroy();
  }, [cfg.color]);

  useEffect(() => {
    if (!chartRef.current || !logs.length) return;
    const pts = logs.slice(0, 20).reverse();
    chartRef.current.data.labels = pts.map((_, i) => i);
    chartRef.current.data.datasets[0].data = pts.map((d) => Number(d[cfg.key]) || 0);
    chartRef.current.update("none");
  }, [logs, cfg.key]);

  const recent = logs.slice(0, 10);
  const older  = logs.slice(10, 20);
  const current = avg(recent, cfg.key);
  const previous = avg(older, cfg.key);
  const { cls, label } = getTrend(current, previous);

  return (
    <div className="kpi-card">
      <div className="kpi-label">
        <svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" /><polyline points="8,4 8,8 11,10" /></svg>
        {cfg.label}
      </div>
      <div className="kpi-value" style={{ color: cfg.color }}>
        {current}{cfg.unit}
      </div>
      <div className="kpi-meta">
        <span className={`kpi-trend ${cls}`}>{label}</span>
        vs last period
      </div>
      <div className="kpi-sparkline">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};

const KPIGrid: React.FC<Props> = ({ logs }) => (
  <div className="kpi-grid">
    {KPIS.map((cfg) => (
      <KPICard key={cfg.id} cfg={cfg} logs={logs} />
    ))}
  </div>
);

export default KPIGrid;