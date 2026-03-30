import React, { useState, useMemo } from "react";
import { LogEntry } from "../types/types";

interface Props {
  logs: LogEntry[];
  isLoading: boolean;
  onRefresh: () => void;
  lastRefresh: Date | null;
}

type SortKey = keyof LogEntry;
type SortDir = "asc" | "desc";

function getRiskColor(score: number): string {
  if (score > 80) return "#ef4444";
  if (score > 60) return "#f97316";
  if (score > 30) return "#f59e0b";
  return "#22c55e";
}

function getRiskLabel(score: number): string {
  if (score > 80) return "Critical";
  if (score > 60) return "High";
  if (score > 30) return "Medium";
  return "Low";
}

const ROWS_PER_PAGE = 20;

const HistoryPage: React.FC<Props> = ({ logs, isLoading, onRefresh, lastRefresh }) => {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "success" | "error">("all");
  const [filterRisk, setFilterRisk] = useState<"all" | "high" | "medium" | "low">("all");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let data = [...logs];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(l =>
        String(l.response_time).includes(q) ||
        String(l.status_code).includes(q) ||
        String(l.risk_score).includes(q) ||
        (l.prediction || "").toLowerCase().includes(q)
      );
    }

    // Status filter
    if (filterStatus === "success") data = data.filter(l => l.status_code < 400);
    if (filterStatus === "error")   data = data.filter(l => l.status_code >= 400);

    // Risk filter
    if (filterRisk === "high")   data = data.filter(l => l.risk_score > 60);
    if (filterRisk === "medium") data = data.filter(l => l.risk_score > 30 && l.risk_score <= 60);
    if (filterRisk === "low")    data = data.filter(l => l.risk_score <= 30);

    // Sort
    data.sort((a, b) => {
      const va = a[sortKey] ?? "";
      const vb = b[sortKey] ?? "";
      if (va < vb) return sortDir === "asc" ? -1 :  1;
      if (va > vb) return sortDir === "asc" ?  1 : -1;
      return 0;
    });

    return data;
  }, [logs, search, filterStatus, filterRisk, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / ROWS_PER_PAGE);
  const paged = filtered.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
    setPage(0);
  };

  const exportCSV = () => {
    const headers = ["timestamp", "response_time_ms", "status_code", "cpu_usage", "memory_usage", "risk_score", "prediction"];
    const rows = filtered.map(l => [l.created_at, l.response_time, l.status_code, l.cpu_usage, l.memory_usage, l.risk_score, l.prediction || ""].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `sentinel_logs_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ k }: { k: SortKey }) => (
    <span style={{ fontSize: 9, opacity: sortKey === k ? 1 : 0.3, marginLeft: 3 }}>
      {sortKey === k && sortDir === "asc" ? "▲" : "▼"}
    </span>
  );

  const FilterChip = ({ label, value, current, onChange }: any) => (
    <button onClick={() => { onChange(value); setPage(0); }} style={{
      padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: "pointer",
      background: current === value ? "var(--accent-glow)" : "var(--bg3)",
      color: current === value ? "var(--accent2)" : "var(--text2)",
      border: `1px solid ${current === value ? "var(--border2)" : "var(--border)"}`,
      transition: "all .15s",
    }}>{label}</button>
  );

  return (
    <>
      {/* Controls bar */}
      <div className="card" style={{ overflow: "visible" }}>
        <div className="card-head">
          <div className="card-title">Event Log <span>— {filtered.length} of {logs.length} entries</span></div>
          <button className="card-action" onClick={exportCSV}>↓ Export CSV</button>
          <button className="card-action" onClick={onRefresh}>{isLoading ? "Loading…" : "↻ Refresh"}</button>
        </div>

        {/* Filters */}
        <div style={{ padding: "12px 16px", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", borderBottom: "1px solid var(--border)" }}>
          {/* Search */}
          <div style={{ position: "relative", flex: "0 0 220px" }}>
            <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, stroke: "var(--text3)", fill: "none", strokeWidth: 2 }} viewBox="0 0 16 16">
              <circle cx="6" cy="6" r="4"/><line x1="9" y1="9" x2="14" y2="14"/>
            </svg>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search logs…"
              style={{ width: "100%", paddingLeft: 30, paddingRight: 10, height: 30, borderRadius: "var(--r)", background: "var(--bg3)", border: "1px solid var(--border2)", color: "var(--text)", fontSize: 12, outline: "none", fontFamily: "var(--font-body)" }}
            />
          </div>

          <span style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 600 }}>Status</span>
          {(["all", "success", "error"] as const).map(v => (
            <FilterChip key={v} label={v === "all" ? "All" : v === "success" ? "2xx/3xx" : "4xx/5xx"} value={v} current={filterStatus} onChange={setFilterStatus} />
          ))}

          <span style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 600, marginLeft: 4 }}>Risk</span>
          {(["all", "high", "medium", "low"] as const).map(v => (
            <FilterChip key={v} label={v.charAt(0).toUpperCase() + v.slice(1)} value={v} current={filterRisk} onChange={setFilterRisk} />
          ))}
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table className="log-table" style={{ minWidth: 800 }}>
            <thead>
              <tr>
                {([
                  { key: "created_at", label: "Timestamp" },
                  { key: "response_time", label: "Response Time" },
                  { key: "status_code", label: "Status" },
                  { key: "cpu_usage", label: "CPU" },
                  { key: "memory_usage", label: "Memory" },
                  { key: "risk_score", label: "Risk" },
                  { key: "prediction", label: "Prediction" },
                ] as { key: SortKey; label: string }[]).map(({ key, label }) => (
                  <th key={key} onClick={() => handleSort(key)} style={{ cursor: "pointer", userSelect: "none" }}>
                    {label}<SortIcon k={key} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: "var(--text3)" }}>No entries match the current filters</td></tr>
              ) : paged.map((log, i) => {
                const isHigh = log.risk_score > 60;
                const riskColor = getRiskColor(log.risk_score);
                return (
                  <tr key={i}>
                    <td style={{ color: "var(--text3)", fontSize: 11 }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td style={{ color: log.response_time > 1000 ? "#f59e0b" : "var(--text2)" }}>
                      {log.response_time}ms
                    </td>
                    <td>
                      <span style={{
                        padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 600,
                        background: log.status_code >= 500 ? "var(--red-bg)" : log.status_code >= 400 ? "var(--amber-bg)" : "var(--green-bg)",
                        color: log.status_code >= 500 ? "var(--red)" : log.status_code >= 400 ? "var(--amber)" : "var(--green)",
                        border: `1px solid ${log.status_code >= 500 ? "var(--red-border)" : log.status_code >= 400 ? "var(--amber-border)" : "var(--green-border)"}`,
                      }}>
                        {log.status_code}
                      </span>
                    </td>
                    <td>{log.cpu_usage}%</td>
                    <td>{log.memory_usage}%</td>
                    <td>
                      <div className="risk-bar-wrap">
                        <div className="risk-bar">
                          <div className="risk-fill" style={{ width: `${log.risk_score}%`, background: riskColor }} />
                        </div>
                        <span style={{ fontSize: 10, color: riskColor, fontWeight: 600, minWidth: 20 }}>{log.risk_score}</span>
                        <span style={{ fontSize: 10, color: riskColor }}>{getRiskLabel(log.risk_score)}</span>
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
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: "1px solid var(--border)" }}>
            <span style={{ fontSize: 12, color: "var(--text3)" }}>
              Page {page + 1} of {totalPages} · {filtered.length} results
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="card-action" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const pg = totalPages <= 7 ? i : Math.max(0, Math.min(page - 3, totalPages - 7)) + i;
                return (
                  <button key={pg} onClick={() => setPage(pg)} style={{
                    width: 30, height: 28, borderRadius: 6, fontSize: 12, cursor: "pointer", border: "1px solid var(--border)",
                    background: pg === page ? "var(--accent-glow)" : "var(--bg3)",
                    color: pg === page ? "var(--accent2)" : "var(--text2)",
                  }}>{pg + 1}</button>
                );
              })}
              <button className="card-action" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default HistoryPage;