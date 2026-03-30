import React, { useState } from "react";

// ── Section wrapper ───────────────────────────────────────────
const Section: React.FC<{ title: string; desc: string; children: React.ReactNode }> = ({ title, desc, children }) => (
  <div className="card" style={{ overflow: "visible" }}>
    <div className="card-head">
      <div>
        <div className="card-title" style={{ marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--text3)" }}>{desc}</div>
      </div>
    </div>
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
      {children}
    </div>
  </div>
);

// ── Row ───────────────────────────────────────────────────────
const Row: React.FC<{ label: string; sublabel?: string; children: React.ReactNode }> = ({ label, sublabel, children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "2px 0" }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{label}</div>
      {sublabel && <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>{sublabel}</div>}
    </div>
    <div style={{ flexShrink: 0 }}>{children}</div>
  </div>
);

// ── Toggle ────────────────────────────────────────────────────
const Toggle: React.FC<{ value: boolean; onChange: (v: boolean) => void }> = ({ value, onChange }) => (
  <button onClick={() => onChange(!value)} style={{
    position: "relative", width: 40, height: 22, borderRadius: 11, border: "none",
    background: value ? "var(--accent)" : "var(--bg4)",
    cursor: "pointer", transition: "background .2s", flexShrink: 0,
  }}>
    <span style={{
      position: "absolute", top: 3, left: value ? 20 : 3, width: 16, height: 16,
      borderRadius: "50%", background: "#fff", transition: "left .2s",
    }} />
  </button>
);

// ── Input ─────────────────────────────────────────────────────
const Input: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string; type?: string; width?: number }> = ({
  value, onChange, placeholder, type = "text", width = 220,
}) => (
  <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    style={{
      width, height: 32, borderRadius: "var(--r)", background: "var(--bg3)",
      border: "1px solid var(--border2)", color: "var(--text)", fontSize: 13,
      padding: "0 10px", outline: "none", fontFamily: "var(--font-body)", transition: "border-color .15s",
    }}
    onFocus={e => (e.target.style.borderColor = "var(--accent)")}
    onBlur={e => (e.target.style.borderColor = "var(--border2)")}
  />
);

// ── NumberInput ───────────────────────────────────────────────
const NumberInput: React.FC<{ value: number; onChange: (v: number) => void; min?: number; max?: number; unit?: string }> = ({
  value, onChange, min, max, unit,
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
    <input type="number" value={value} onChange={e => onChange(Number(e.target.value))} min={min} max={max}
      style={{
        width: 80, height: 32, borderRadius: "var(--r)", background: "var(--bg3)",
        border: "1px solid var(--border2)", color: "var(--text)", fontSize: 13,
        padding: "0 10px", outline: "none", fontFamily: "var(--font-mono)", textAlign: "right",
      }}
    />
    {unit && <span style={{ fontSize: 12, color: "var(--text3)" }}>{unit}</span>}
  </div>
);

// ── Select ────────────────────────────────────────────────────
const Select: React.FC<{ value: string; options: { label: string; value: string }[]; onChange: (v: string) => void }> = ({
  value, options, onChange,
}) => (
  <select value={value} onChange={e => onChange(e.target.value)} style={{
    height: 32, borderRadius: "var(--r)", background: "var(--bg3)",
    border: "1px solid var(--border2)", color: "var(--text)", fontSize: 13,
    padding: "0 30px 0 10px", outline: "none", cursor: "pointer", fontFamily: "var(--font-body)",
    appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' stroke='%23555b6e' fill='none' stroke-width='1.5'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
    minWidth: 140,
  }}>
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

// ── Save Button ───────────────────────────────────────────────
const SaveButton: React.FC<{ onClick: () => void; saved: boolean }> = ({ onClick, saved }) => (
  <button onClick={onClick} style={{
    padding: "8px 20px", borderRadius: "var(--r)",
    background: saved ? "var(--green-bg)" : "var(--accent)",
    border: `1px solid ${saved ? "var(--green-border)" : "transparent"}`,
    color: saved ? "var(--green)" : "#fff",
    fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all .2s", fontFamily: "var(--font-body)",
  }}>{saved ? "✓ Saved" : "Save Changes"}</button>
);

// ── Main ──────────────────────────────────────────────────────
const SettingsPage: React.FC = () => {
  const [saved, setSaved] = useState(false);

  // API Config
 const [apiUrl, setApiUrl] = useState<string>(
  process.env.REACT_APP_API_URL || "http://127.0.0.1:5000"
);
  const [apiTimeout, setApiTimeout] = useState(10);
  const [refreshInterval, setRefreshInterval] = useState(5);
  const [historyLimit, setHistoryLimit] = useState(50);

  // Thresholds
  const [warnRisk, setWarnRisk] = useState(60);
  const [criticalRisk, setCriticalRisk] = useState(80);
  const [rtThreshold, setRtThreshold] = useState(1000);
  const [cpuThreshold, setCpuThreshold] = useState(85);
  const [memThreshold, setMemThreshold] = useState(85);

  // Notifications
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [browserNotifs, setBrowserNotifs] = useState(false);
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailAddr, setEmailAddr] = useState("");

  // Display
  const [timezone, setTimezone] = useState("local");
  const [dateFormat, setDateFormat] = useState("locale");
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [compactMode, setCompactMode] = useState(false);

  // Retention
  const [retainDays, setRetainDays] = useState(30);
  const [autoExport, setAutoExport] = useState(false);
  const [exportFormat, setExportFormat] = useState("csv");

  const save = () => {
    // In production: persist to localStorage or POST to /settings
    const settings = {
      api: { url: apiUrl, timeout: apiTimeout, refreshInterval, historyLimit },
      thresholds: { warnRisk, criticalRisk, rtThreshold, cpuThreshold, memThreshold },
      notifications: { alertEnabled, soundEnabled, browserNotifs, webhookEnabled, webhookUrl, emailEnabled, emailAddr },
      display: { timezone, dateFormat, rowsPerPage, compactMode },
      retention: { retainDays, autoExport, exportFormat },
    };
    localStorage.setItem("sentinel_settings", JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>

      {/* Left column */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        <Section title="API Connection" desc="Configure how the dashboard connects to the SentinelAPI backend">
          <Row label="Backend URL" sublabel="Base URL for all API requests">
            <Input value={apiUrl} onChange={setApiUrl} placeholder="http://127.0.0.1:5000" width={240} />
          </Row>
          <Row label="Request Timeout" sublabel="Max wait time per API call">
            <NumberInput value={apiTimeout} onChange={setApiTimeout} min={1} max={60} unit="seconds" />
          </Row>
          <Row label="Refresh Interval" sublabel="How often to poll for new data">
            <NumberInput value={refreshInterval} onChange={setRefreshInterval} min={2} max={60} unit="seconds" />
          </Row>
          <Row label="History Limit" sublabel="Max entries to load per request">
            <NumberInput value={historyLimit} onChange={setHistoryLimit} min={10} max={500} unit="entries" />
          </Row>
          <Row label="Connection Test" sublabel="Verify backend is reachable">
            <button className="card-action" onClick={async () => {
              try { await fetch(apiUrl + "/health"); alert("✓ Connected"); } catch { alert("✗ Connection failed"); }
            }}>Test Connection</button>
          </Row>
        </Section>

        <Section title="Alert Thresholds" desc="Define when warnings and critical alerts are triggered">
          <Row label="Warning Risk Score" sublabel="Score above which a warning is shown">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="range" min={30} max={79} value={warnRisk} onChange={e => setWarnRisk(Number(e.target.value))} style={{ width: 100 }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#f59e0b", minWidth: 28 }}>{warnRisk}</span>
            </div>
          </Row>
          <Row label="Critical Risk Score" sublabel="Score above which a critical alert fires">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="range" min={warnRisk + 1} max={100} value={criticalRisk} onChange={e => setCriticalRisk(Number(e.target.value))} style={{ width: 100 }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#ef4444", minWidth: 28 }}>{criticalRisk}</span>
            </div>
          </Row>
          <Row label="Response Time Alert" sublabel="Flag entries exceeding this latency">
            <NumberInput value={rtThreshold} onChange={setRtThreshold} min={100} max={5000} unit="ms" />
          </Row>
          <Row label="CPU Alert Threshold" sublabel="Flag entries exceeding this CPU %">
            <NumberInput value={cpuThreshold} onChange={setCpuThreshold} min={50} max={100} unit="%" />
          </Row>
          <Row label="Memory Alert Threshold" sublabel="Flag entries exceeding this memory %">
            <NumberInput value={memThreshold} onChange={setMemThreshold} min={50} max={100} unit="%" />
          </Row>
        </Section>

        <Section title="Data Retention" desc="Control how long metrics are stored">
          <Row label="Retain Logs For" sublabel="Older entries will be pruned automatically">
            <NumberInput value={retainDays} onChange={setRetainDays} min={1} max={365} unit="days" />
          </Row>
          <Row label="Auto Export" sublabel="Automatically export data before pruning">
            <Toggle value={autoExport} onChange={setAutoExport} />
          </Row>
          {autoExport && (
            <Row label="Export Format">
              <Select value={exportFormat} onChange={setExportFormat} options={[
                { label: "CSV", value: "csv" },
                { label: "JSON", value: "json" },
              ]} />
            </Row>
          )}
          <Row label="Clear All Data" sublabel="Permanently delete all stored metrics">
            <button onClick={() => { if (window.confirm("Delete all metrics? This cannot be undone.")) alert("Cleared (connect to DELETE /metrics endpoint)"); }}
              style={{ padding: "6px 14px", borderRadius: "var(--r)", background: "var(--red-bg)", border: "1px solid var(--red-border)", color: "var(--red)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              Clear Database
            </button>
          </Row>
        </Section>
      </div>

      {/* Right column */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        <Section title="Notifications" desc="Configure how you're alerted when issues are detected">
          <Row label="In-App Alerts" sublabel="Show banner alerts in the dashboard">
            <Toggle value={alertEnabled} onChange={setAlertEnabled} />
          </Row>
          <Row label="Sound Alerts" sublabel="Play a sound when critical alert fires">
            <Toggle value={soundEnabled} onChange={setSoundEnabled} />
          </Row>
          <Row label="Browser Notifications" sublabel="Show OS-level push notifications">
            <Toggle value={browserNotifs} onChange={v => {
              if (v && "Notification" in window) Notification.requestPermission();
              setBrowserNotifs(v);
            }} />
          </Row>

          <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />

          <Row label="Webhook Alerts" sublabel="POST to a URL on critical incidents">
            <Toggle value={webhookEnabled} onChange={setWebhookEnabled} />
          </Row>
          {webhookEnabled && (
            <Row label="Webhook URL">
              <Input value={webhookUrl} onChange={setWebhookUrl} placeholder="https://hooks.slack.com/…" width={240} />
            </Row>
          )}

          <Row label="Email Alerts" sublabel="Send email on critical events">
            <Toggle value={emailEnabled} onChange={setEmailEnabled} />
          </Row>
          {emailEnabled && (
            <Row label="Email Address">
              <Input value={emailAddr} onChange={setEmailAddr} placeholder="you@company.com" type="email" width={200} />
            </Row>
          )}
        </Section>

        <Section title="Display Preferences" desc="Customise how data is displayed">
          <Row label="Compact Mode" sublabel="Reduce padding and font sizes">
            <Toggle value={compactMode} onChange={setCompactMode} />
          </Row>
          <Row label="Timezone" sublabel="How timestamps are displayed">
            <Select value={timezone} onChange={setTimezone} options={[
              { label: "Local Time", value: "local" },
              { label: "UTC", value: "utc" },
            ]} />
          </Row>
          <Row label="Date Format" sublabel="Format for log timestamps">
            <Select value={dateFormat} onChange={setDateFormat} options={[
              { label: "Locale (auto)", value: "locale" },
              { label: "ISO 8601", value: "iso" },
              { label: "Relative", value: "relative" },
            ]} />
          </Row>
          <Row label="Rows Per Page" sublabel="History table pagination size">
            <Select value={String(rowsPerPage)} onChange={v => setRowsPerPage(Number(v))} options={[
              { label: "10", value: "10" },
              { label: "20", value: "20" },
              { label: "50", value: "50" },
              { label: "100", value: "100" },
            ]} />
          </Row>
        </Section>

        {/* About */}
        <div className="card">
          <div className="card-head"><div className="card-title">About SentinelAPI</div></div>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "Version", value: "2.0.0" },
              { label: "Model", value: "Random Forest (sklearn 1.5)" },
              { label: "Backend", value: "Flask 3.0 + SQLite" },
              { label: "Frontend", value: "React 18 + TypeScript" },
              { label: "License", value: "MIT" },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ color: "var(--text3)", fontWeight: 500 }}>{label}</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--text2)", fontSize: 12 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Save bar — full width */}
      <div style={{
        gridColumn: "1 / -1", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px", borderRadius: "var(--r2)",
        background: "var(--bg2)", border: "1px solid var(--border)", position: "sticky", bottom: 0,
      }}>
        <div style={{ fontSize: 13, color: "var(--text3)" }}>
          Changes are saved to <code style={{ fontFamily: "var(--font-mono)", color: "var(--accent2)", fontSize: 12 }}>localStorage</code> and applied on next load.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="card-action" onClick={() => window.location.reload()}>Reset to Defaults</button>
          <SaveButton onClick={save} saved={saved} />
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;