import React, { useEffect, useRef, useCallback } from "react";
import { Chart, registerables } from "chart.js";
import { LogEntry } from "../types/types";

Chart.register(...registerables);

interface Props {
  logs: LogEntry[];
  isLoading?: boolean;
  onRefresh: () => void;
}

// ── Gauge helper ──────────────────────────────────────────────
function drawGauge(
  canvas: HTMLCanvasElement,
  value: number,
  max: number,
  color: string
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const cx = 36, cy = 36, r = 28;
  ctx.clearRect(0, 0, 72, 72);
  const start = -Math.PI * 0.75;
  const end   =  Math.PI * 0.75;
  const pct   = Math.min(value / max, 1);

  // Track
  ctx.beginPath();
  ctx.arc(cx, cy, r, start, end);
  ctx.strokeStyle = "#1e2330";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.stroke();

  // Fill
  ctx.beginPath();
  ctx.arc(cx, cy, r, start, start + (end - start) * pct);
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.stroke();
}

// ── Gauge component ───────────────────────────────────────────
interface GaugeProps {
  canvasId: string;
  value: number;
  max: number;
  unit: string;
  label: string;
  color: string;
}

const Gauge: React.FC<GaugeProps> = ({ canvasId, value, max, unit, label, color }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) drawGauge(canvasRef.current, value, max, color);
  }, [value, max, color]);

  return (
    <div className="gauge-item">
      <div className="gauge-ring">
        <canvas ref={canvasRef} id={canvasId} width={72} height={72} />
        <div className="gauge-val">
          <span className="v">{value}</span>
          <span className="u">{unit}</span>
        </div>
      </div>
      <div className="gauge-lbl">{label}</div>
    </div>
  );
};

// ── Main Charts component ─────────────────────────────────────
const Charts: React.FC<Props> = ({ logs, isLoading, onRefresh }) => {
  const chartRef    = useRef<Chart | null>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);

  // Init main chart
  useEffect(() => {
    if (!canvasRef.current) return;

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "CPU %",
            data: [],
            borderColor: "#4f6ef7",
            backgroundColor: "rgba(79,110,247,0.12)",
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            borderWidth: 2,
          },
          {
            label: "Memory %",
            data: [],
            borderColor: "#22c55e",
            backgroundColor: "rgba(34,197,94,0.09)",
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            borderWidth: 1.5,
          },
          {
            label: "Risk Score",
            data: [],
            borderColor: "#ef4444",
            backgroundColor: "transparent",
            tension: 0.4,
            pointRadius: 0,
            borderWidth: 1.5,
            borderDash: [4, 3],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: {
              color: "#8b90a0",
              font: { size: 11, family: "'Inter', sans-serif" },
              boxWidth: 10,
              boxHeight: 10,
              padding: 12,
              usePointStyle: true,
            },
          },
          tooltip: {
            backgroundColor: "#111318",
            borderColor: "rgba(255,255,255,0.09)",
            borderWidth: 1,
            titleColor: "#e8eaf0",
            bodyColor: "#8b90a0",
            padding: 10,
          },
        },
        scales: {
          x: {
            ticks: {
              color: "#555b6e",
              font: { size: 10, family: "'IBM Plex Mono', monospace" },
              maxTicksLimit: 6,
              maxRotation: 0,
            },
            grid: { color: "rgba(255,255,255,0.03)" },
          },
          y: {
            ticks: { color: "#555b6e", font: { size: 10 } },
            grid: { color: "rgba(255,255,255,0.03)" },
            min: 0,
            max: 110,
          },
        },
        animation: { duration: 400 },
      },
    });

    return () => chartRef.current?.destroy();
  }, []);

  // Update chart data
  useEffect(() => {
    if (!chartRef.current || !logs.length) return;
    const pts = logs.slice(0, 30).reverse();
    chartRef.current.data.labels = pts.map((d) => {
      return new Date(d.created_at).toLocaleTimeString();
    });
    chartRef.current.data.datasets[0].data = pts.map((d) => d.cpu_usage);
    chartRef.current.data.datasets[1].data = pts.map((d) => d.memory_usage);
    chartRef.current.data.datasets[2].data = pts.map((d) => d.risk_score);
    chartRef.current.update("none");
  }, [logs]);

  // Latest values for gauges
  const latest = logs[0];
  const cpu    = latest?.cpu_usage    ?? 0;
  const mem    = latest?.memory_usage ?? 0;
  const risk   = latest?.risk_score   ?? 0;

  const cpuColor  = cpu  > 85 ? "#ef4444" : cpu  > 65 ? "#f59e0b" : "#4f6ef7";
  const memColor  = mem  > 85 ? "#ef4444" : mem  > 65 ? "#f59e0b" : "#22c55e";
  const riskColor = risk > 60 ? "#ef4444" : risk > 30 ? "#f59e0b" : "#22c55e";

  return (
    <div className="charts-row">
      {/* Main chart */}
      <div className="card">
        <div className="card-head">
          <div className="card-title">
            System Metrics <span>— last 30 entries</span>
          </div>
          <button className="card-action" onClick={onRefresh}>
            {isLoading ? "Loading…" : "↻ Refresh"}
          </button>
        </div>
        <div className="card-body">
          <div className="chart-wrap">
            <canvas ref={canvasRef} />
          </div>
        </div>
      </div>

      {/* Gauges */}
      <div className="card">
        <div className="card-head">
          <div className="card-title">Current Load</div>
        </div>
        <div className="gauges">
          <Gauge canvasId="g-cpu"  value={cpu}  max={100} unit="%"   label="CPU"    color={cpuColor} />
          <Gauge canvasId="g-mem"  value={mem}  max={100} unit="%"   label="Memory" color={memColor} />
          <Gauge canvasId="g-risk" value={risk} max={100} unit="pts" label="Risk"   color={riskColor} />
        </div>
      </div>
    </div>
  );
};

export default Charts;