import React, { useEffect, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import { LogEntry } from "../types/types";

Chart.register(...registerables);

interface Props {
  logs: LogEntry[];
  isLoading: boolean;
  onRefresh: () => void;
  lastRefresh: Date | null;
}

function avg(arr: number[]): number {
  return arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
}

function pct(arr: number[], threshold: number): string {
  const count = arr.filter(v => v > threshold).length;
  return ((count / arr.length) * 100).toFixed(1) + "%";
}

// ── Single chart card ────────────────────────────────────────
interface ChartCardProps { title: string; subtitle?: string; children: React.ReactNode; badge?: string; badgeColor?: string; }
const ChartCard: React.FC<ChartCardProps> = ({ title, subtitle, children, badge, badgeColor }) => (
  <div className="card">
    <div className="card-head">
      <div className="card-title">{title}{subtitle && <span> — {subtitle}</span>}</div>
      {badge && <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 20, background: badgeColor + "15", color: badgeColor, border: `1px solid ${badgeColor}28` }}>{badge}</span>}
    </div>
    <div className="card-body">{children}</div>
  </div>
);

// ── Stat strip ───────────────────────────────────────────────
const StatStrip: React.FC<{ items: { label: string; value: string; color?: string }[] }> = ({ items }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 1, marginBottom: 16 }}>
    {items.map(({ label, value, color }) => (
      <div key={label} style={{ background: "var(--bg3)", padding: "10px 12px", borderRadius: 6 }}>
        <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".6px", fontWeight: 600, marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 18, fontFamily: "var(--font-mono)", fontWeight: 500, color: color || "var(--text)" }}>{value}</div>
      </div>
    ))}
  </div>
);

// ── Response Time Chart ──────────────────────────────────────
const ResponseTimeChart: React.FC<{ logs: LogEntry[] }> = ({ logs }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const chart = useRef<Chart | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    chart.current?.destroy();
    const pts = logs.slice(0, 50).reverse();
    chart.current = new Chart(ref.current, {
      type: "line",
      data: {
        labels: pts.map(d => new Date(d.created_at).toLocaleTimeString()),
        datasets: [{
          label: "Response Time (ms)",
          data: pts.map(d => d.response_time),
          borderColor: "#f59e0b",
          backgroundColor: "rgba(245,158,11,0.08)",
          fill: true, tension: 0.4, pointRadius: 2, pointBackgroundColor: "#f59e0b", borderWidth: 2,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: "#111318", borderColor: "#ffffff18", borderWidth: 1, titleColor: "#e8eaf0", bodyColor: "#8b90a0", padding: 10 },
        },
        scales: {
          x: { ticks: { color: "#555b6e", font: { size: 10 }, maxTicksLimit: 8, maxRotation: 0 }, grid: { color: "rgba(255,255,255,0.03)" } },
          y: { ticks: { color: "#555b6e", font: { size: 10 }, callback: v => v + "ms" }, grid: { color: "rgba(255,255,255,0.03)" } },
        },
        animation: { duration: 300 },
      },
    });
    return () => chart.current?.destroy();
  }, [logs]);

  const rts = logs.map(l => l.response_time);
  return (
    <ChartCard title="Response Time" subtitle="over time" badge="P95" badgeColor="#f59e0b">
      <StatStrip items={[
        { label: "Average", value: avg(rts) + "ms", color: "#f59e0b" },
        { label: "> 500ms", value: pct(rts, 500), color: "#ef4444" },
        { label: "> 1000ms", value: pct(rts, 1000), color: "#ef4444" },
        { label: "Max", value: Math.max(...rts) + "ms" },
      ]} />
      <div style={{ height: 200 }}><canvas ref={ref} /></div>
    </ChartCard>
  );
};

// ── Status Code Doughnut ─────────────────────────────────────
const StatusCodeChart: React.FC<{ logs: LogEntry[] }> = ({ logs }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const chart = useRef<Chart | null>(null);

  useEffect(() => {
    if (!ref.current || !logs.length) return;
    chart.current?.destroy();
    const counts: Record<string, number> = {};
    logs.forEach(l => {
      const bucket = l.status_code >= 500 ? "5xx Server Error" : l.status_code >= 400 ? "4xx Client Error" : l.status_code >= 300 ? "3xx Redirect" : "2xx Success";
      counts[bucket] = (counts[bucket] || 0) + 1;
    });
    const labels = Object.keys(counts);
    const colorMap: Record<string, string> = {
      "2xx Success": "#22c55e",
      "3xx Redirect": "#4f6ef7",
      "4xx Client Error": "#f59e0b",
      "5xx Server Error": "#ef4444",
    };
    chart.current = new Chart(ref.current, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{ data: Object.values(counts), backgroundColor: labels.map(l => colorMap[l] || "#555"), borderWidth: 0, hoverOffset: 4 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: "72%",
        plugins: {
          legend: { position: "right", labels: { color: "#8b90a0", font: { size: 11 }, boxWidth: 10, boxHeight: 10, padding: 10 } },
          tooltip: { backgroundColor: "#111318", borderColor: "#ffffff18", borderWidth: 1, titleColor: "#e8eaf0", bodyColor: "#8b90a0", padding: 10 },
        },
        animation: { duration: 400 },
      },
    });
    return () => chart.current?.destroy();
  }, [logs]);

  const errorCount = logs.filter(l => l.status_code >= 500).length;
  const errorRate = logs.length ? ((errorCount / logs.length) * 100).toFixed(1) : "0.0";

  return (
    <ChartCard title="Status Codes" subtitle="distribution" badge={`${errorRate}% errors`} badgeColor={Number(errorRate) > 5 ? "#ef4444" : "#22c55e"}>
      <div style={{ height: 240, position: "relative" }}>
        <canvas ref={ref} />
      </div>
    </ChartCard>
  );
};

// ── CPU + Memory area chart ──────────────────────────────────
const ResourceChart: React.FC<{ logs: LogEntry[] }> = ({ logs }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const chart = useRef<Chart | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    chart.current?.destroy();
    const pts = logs.slice(0, 50).reverse();
    chart.current = new Chart(ref.current, {
      type: "line",
      data: {
        labels: pts.map(d => new Date(d.created_at).toLocaleTimeString()),
        datasets: [
          { label: "CPU %", data: pts.map(d => d.cpu_usage), borderColor: "#4f6ef7", backgroundColor: "rgba(79,110,247,0.12)", fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2 },
          { label: "Memory %", data: pts.map(d => d.memory_usage), borderColor: "#22c55e", backgroundColor: "rgba(34,197,94,0.09)", fill: true, tension: 0.4, pointRadius: 0, borderWidth: 1.5 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: true, position: "top", labels: { color: "#8b90a0", font: { size: 11 }, boxWidth: 10, boxHeight: 10, usePointStyle: true } },
          tooltip: { backgroundColor: "#111318", borderColor: "#ffffff18", borderWidth: 1, titleColor: "#e8eaf0", bodyColor: "#8b90a0", padding: 10 },
        },
        scales: {
          x: { ticks: { color: "#555b6e", font: { size: 10 }, maxTicksLimit: 8, maxRotation: 0 }, grid: { color: "rgba(255,255,255,0.03)" } },
          y: { min: 0, max: 100, ticks: { color: "#555b6e", font: { size: 10 }, callback: v => v + "%" }, grid: { color: "rgba(255,255,255,0.03)" } },
        },
        animation: { duration: 300 },
      },
    });
    return () => chart.current?.destroy();
  }, [logs]);

  const cpus = logs.map(l => l.cpu_usage);
  const mems = logs.map(l => l.memory_usage);
  return (
    <ChartCard title="CPU & Memory" subtitle="utilisation">
      <StatStrip items={[
        { label: "Avg CPU", value: avg(cpus) + "%", color: "#4f6ef7" },
        { label: "Peak CPU", value: Math.max(...cpus) + "%", color: cpus.length && Math.max(...cpus) > 85 ? "#ef4444" : "#4f6ef7" },
        { label: "Avg Mem", value: avg(mems) + "%", color: "#22c55e" },
        { label: "Peak Mem", value: Math.max(...mems) + "%", color: mems.length && Math.max(...mems) > 85 ? "#ef4444" : "#22c55e" },
      ]} />
      <div style={{ height: 200 }}><canvas ref={ref} /></div>
    </ChartCard>
  );
};

// ── Risk Score histogram ─────────────────────────────────────
const RiskHistogram: React.FC<{ logs: LogEntry[] }> = ({ logs }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const chart = useRef<Chart | null>(null);

  useEffect(() => {
    if (!ref.current || !logs.length) return;
    chart.current?.destroy();
    const buckets = [0, 0, 0, 0, 0]; // 0-20, 20-40, 40-60, 60-80, 80-100
    logs.forEach(l => { buckets[Math.min(Math.floor(l.risk_score / 20), 4)]++; });
    const colors = ["#22c55e", "#4f6ef7", "#f59e0b", "#f97316", "#ef4444"];
    chart.current = new Chart(ref.current, {
      type: "bar",
      data: {
        labels: ["0–20", "20–40", "40–60", "60–80", "80–100"],
        datasets: [{ label: "Events", data: buckets, backgroundColor: colors, borderRadius: 6, borderWidth: 0 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: "#111318", borderColor: "#ffffff18", borderWidth: 1, titleColor: "#e8eaf0", bodyColor: "#8b90a0", padding: 10 } },
        scales: {
          x: { ticks: { color: "#555b6e", font: { size: 10 } }, grid: { display: false } },
          y: { ticks: { color: "#555b6e", font: { size: 10 } }, grid: { color: "rgba(255,255,255,0.03)" } },
        },
        animation: { duration: 300 },
      },
    });
    return () => chart.current?.destroy();
  }, [logs]);

  const risks = logs.map(l => l.risk_score);
  const high = logs.filter(l => l.risk_score > 60).length;
  return (
    <ChartCard title="Risk Score Distribution" badge={`${high} high-risk events`} badgeColor={high > 0 ? "#ef4444" : "#22c55e"}>
      <StatStrip items={[
        { label: "Average", value: avg(risks) + " pts" },
        { label: "Max", value: Math.max(...risks) + " pts", color: "#ef4444" },
        { label: "High Risk (>60)", value: String(high), color: "#ef4444" },
        { label: "Critical (>80)", value: String(logs.filter(l => l.risk_score > 80).length), color: "#ef4444" },
      ]} />
      <div style={{ height: 180 }}><canvas ref={ref} /></div>
    </ChartCard>
  );
};

// ── Main Page ────────────────────────────────────────────────
const MetricsPage: React.FC<Props> = ({ logs, isLoading, onRefresh, lastRefresh }) => {
  return (
    <>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <div style={{ flex: 1, fontSize: 13, color: "var(--text3)" }}>
          {lastRefresh ? `Last updated: ${lastRefresh.toLocaleTimeString()}` : "Loading…"}
        </div>
        <button className="card-action" onClick={onRefresh}>{isLoading ? "Loading…" : "↻ Refresh"}</button>
      </div>

      {/* Charts grid */}
      <div className="grid-2">
        <ResponseTimeChart logs={logs} />
        <StatusCodeChart logs={logs} />
      </div>
      <div className="grid-2">
        <ResourceChart logs={logs} />
        <RiskHistogram logs={logs} />
      </div>
    </>
  );
};

export default MetricsPage;