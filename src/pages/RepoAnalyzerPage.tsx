import React, { useState } from "react";
import { ConnectedProject, EndpointTestResult, ParsedRoute } from "../types/types";
import { testEndpoint, testAllEndpoints } from "../services/api";

interface Props {
  project: ConnectedProject | null;
  onNavigate: (page: any) => void;
}

const METHOD_COLOR: Record<string, string> = {
  GET: "#22c55e", POST: "#4f6ef7", PUT: "#f59e0b",
  DELETE: "#ef4444", PATCH: "#a855f7",
};
const METHOD_BG: Record<string, string> = {
  GET: "rgba(34,197,94,0.1)", POST: "rgba(79,110,247,0.1)", PUT: "rgba(245,158,11,0.1)",
  DELETE: "rgba(239,68,68,0.1)", PATCH: "rgba(168,85,247,0.1)",
};

const StatusChip: React.FC<{ code: number }> = ({ code }) => {
  const color = code >= 500 ? "#ef4444" : code >= 400 ? "#f59e0b" : code >= 200 ? "#22c55e" : "var(--text2)";
  return (
    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color, padding: "2px 8px", borderRadius: 6, background: color + "18" }}>
      {code}
    </span>
  );
};

const RepoAnalyzerPage: React.FC<Props> = ({ project, onNavigate }) => {
  const [selected, setSelected] = useState<ParsedRoute | null>(null);
  const [results, setResults] = useState<Record<string, EndpointTestResult>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [testingAll, setTestingAll] = useState(false);
  const [customHeaders, setCustomHeaders] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [activeTab, setActiveTab] = useState<"response"|"headers">("response");
  const [filterMethod, setFilterMethod] = useState("ALL");

  if (!project) {
    return (
      <div className="card" style={{ padding: 64, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔌</div>
        <h3 style={{ fontFamily: "var(--font-head)", fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>No project connected</h3>
        <p style={{ fontSize: 14, color: "var(--text2)", marginBottom: 24 }}>Connect a GitHub repository first to analyze its endpoints.</p>
        <button onClick={() => onNavigate("connect")} style={{ padding: "10px 24px", borderRadius: 8, background: "var(--accent)", border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-head)" }}>
          Connect a Project →
        </button>
      </div>
    );
  }

  const routeKey = (r: ParsedRoute) => `${r.method}:${r.path}`;

  const runTest = async (route: ParsedRoute) => {
    const key = routeKey(route);
    setTesting(p => ({ ...p, [key]: true }));
    try {
      let parsedHeaders: Record<string, string> = {};
      try { parsedHeaders = customHeaders ? JSON.parse(customHeaders) : {}; } catch {}
      let parsedBody: any = undefined;
      try { parsedBody = customBody ? JSON.parse(customBody) : undefined; } catch {}

      const res = await testEndpoint({
        project_id: project.id,
        base_url: project.base_url,
        method: route.method,
        path: route.path,
        headers: parsedHeaders,
        body: parsedBody,
      });
      setResults(p => ({ ...p, [key]: res.data }));
    } catch (e: any) {
      setResults(p => ({
        ...p, [key]: {
          endpoint_id: key, project_id: project.id, method: route.method,
          path: route.path, full_url: `${project.base_url}${route.path}`,
          status_code: 0, response_time_ms: 0, response_size_bytes: 0,
          response_preview: "", headers: {}, error: e.message, tested_at: new Date().toISOString(),
          risk_score: 50,
        }
      }));
    } finally {
      setTesting(p => ({ ...p, [key]: false }));
    }
  };

  const runAll = async () => {
    setTestingAll(true);
    try {
      const res = await testAllEndpoints({
        project_id: project.id,
        base_url: project.base_url,
        routes: project.routes.map(r => ({ method: r.method, path: r.path })),
      });
      const map: Record<string, EndpointTestResult> = {};
      res.data.forEach(r => { map[`${r.method}:${r.path}`] = r; });
      setResults(map);
    } catch {}
    setTestingAll(false);
  };

  const methods = ["ALL", ...Array.from(new Set(project.routes.map(r => r.method)))];
  const filtered = filterMethod === "ALL" ? project.routes : project.routes.filter(r => r.method === filterMethod);
  const selectedResult = selected ? results[routeKey(selected)] : null;

  const tested = Object.keys(results).length;
  const passing = Object.values(results).filter(r => r.status_code >= 200 && r.status_code < 400).length;
  const failing = Object.values(results).filter(r => r.status_code >= 400 || r.error).length;
  const avgRt = tested ? Math.round(Object.values(results).reduce((s, r) => s + r.response_time_ms, 0) / tested) : 0;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, height: "calc(100vh - 130px)" }}>

      {/* ── Left: endpoint list ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0, overflow: "hidden" }}>
        <div className="card" style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
          <div className="card-head" style={{ flexShrink: 0 }}>
            <div>
              <div className="card-title">{project.name}</div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{project.base_url}</div>
            </div>
          </div>

          {/* Stats strip */}
          {tested > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, padding: "10px 12px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 16, fontFamily: "var(--font-mono)", fontWeight: 500, color: "#22c55e" }}>{passing}</div>
                <div style={{ fontSize: 9, color: "var(--text3)", textTransform: "uppercase" }}>passing</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 16, fontFamily: "var(--font-mono)", fontWeight: 500, color: "#ef4444" }}>{failing}</div>
                <div style={{ fontSize: 9, color: "var(--text3)", textTransform: "uppercase" }}>failing</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 16, fontFamily: "var(--font-mono)", fontWeight: 500, color: "var(--text)" }}>{avgRt}ms</div>
                <div style={{ fontSize: 9, color: "var(--text3)", textTransform: "uppercase" }}>avg rt</div>
              </div>
            </div>
          )}

          {/* Method filter */}
          <div style={{ display: "flex", gap: 4, padding: "8px 10px", borderBottom: "1px solid var(--border)", flexWrap: "wrap", flexShrink: 0 }}>
            {methods.map(m => (
              <button key={m} onClick={() => setFilterMethod(m)} style={{
                padding: "3px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, cursor: "pointer",
                background: filterMethod === m ? (METHOD_BG[m] || "var(--accent-glow)") : "var(--bg3)",
                color: filterMethod === m ? (METHOD_COLOR[m] || "var(--accent2)") : "var(--text3)",
                border: `1px solid ${filterMethod === m ? (METHOD_COLOR[m] || "var(--accent)") + "40" : "var(--border)"}`,
              }}>{m}</button>
            ))}
          </div>

          {/* Route list */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filtered.map((route, i) => {
              const key = routeKey(route);
              const result = results[key];
              const isSelected = selected && routeKey(selected) === key;
              const isLoading = testing[key];
              return (
                <div key={i} onClick={() => setSelected(route)}
                  style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", cursor: "pointer", background: isSelected ? "var(--bg3)" : "transparent", transition: "background .1s" }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "var(--bg3)"; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, minWidth: 42, textAlign: "center", padding: "2px 4px", borderRadius: 4, background: METHOD_BG[route.method] || "var(--bg4)", color: METHOD_COLOR[route.method] || "var(--text2)", letterSpacing: ".3px" }}>
                      {route.method}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{route.path}</span>
                    {isLoading && <span style={{ fontSize: 10, color: "var(--accent2)", animation: "spin 1s linear infinite", display: "inline-block" }}>↻</span>}
                    {result && !isLoading && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: result.error || result.status_code >= 400 ? "#ef4444" : "#22c55e" }}>
                        {result.error ? "ERR" : result.status_code}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 3, paddingLeft: 50 }}>{route.file}</div>
                </div>
              );
            })}
          </div>

          {/* Test all button */}
          <div style={{ padding: 12, borderTop: "1px solid var(--border)", flexShrink: 0 }}>
            <button onClick={runAll} disabled={testingAll} style={{
              width: "100%", padding: "9px", borderRadius: 8, background: "var(--accent)", border: "none",
              color: "#fff", fontSize: 13, fontWeight: 700, cursor: testingAll ? "not-allowed" : "pointer",
              opacity: testingAll ? 0.6 : 1, fontFamily: "var(--font-head)",
            }}>
              {testingAll ? "Testing all…" : `⚡ Test All ${filtered.length} Endpoints`}
            </button>
          </div>
        </div>
      </div>

      {/* ── Right: request + response ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, overflow: "hidden" }}>
        {!selected ? (
          <div className="card" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", color: "var(--text3)" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>←</div>
              <div style={{ fontSize: 14 }}>Select an endpoint to test it</div>
            </div>
          </div>
        ) : (
          <>
            {/* Request bar */}
            <div className="card" style={{ flexShrink: 0 }}>
              <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 800, padding: "4px 10px", borderRadius: 6, background: METHOD_BG[selected.method], color: METHOD_COLOR[selected.method] }}>
                  {selected.method}
                </span>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--text)", flex: 1 }}>
                  <span style={{ color: "var(--text3)" }}>{project.base_url}</span>{selected.path}
                </div>
                <button onClick={() => runTest(selected)} disabled={testing[routeKey(selected)]} style={{
                  padding: "8px 20px", borderRadius: 8, background: "var(--accent)", border: "none",
                  color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-head)",
                  opacity: testing[routeKey(selected)] ? 0.6 : 1,
                }}>
                  {testing[routeKey(selected)] ? "Sending…" : "Send"}
                </button>
              </div>

              {/* Optional headers/body */}
              <div style={{ borderTop: "1px solid var(--border)", padding: "10px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 600, marginBottom: 5 }}>Custom Headers (JSON)</div>
                  <textarea value={customHeaders} onChange={e => setCustomHeaders(e.target.value)}
                    placeholder='{"Authorization": "Bearer token"}'
                    rows={2}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, background: "var(--bg3)", border: "1px solid var(--border2)", color: "var(--text)", fontSize: 12, fontFamily: "var(--font-mono)", outline: "none", resize: "none" }} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 600, marginBottom: 5 }}>Request Body (JSON)</div>
                  <textarea value={customBody} onChange={e => setCustomBody(e.target.value)}
                    placeholder='{"key": "value"}'
                    rows={2}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, background: "var(--bg3)", border: "1px solid var(--border2)", color: "var(--text)", fontSize: 12, fontFamily: "var(--font-mono)", outline: "none", resize: "none" }} />
                </div>
              </div>
            </div>

            {/* Response panel */}
            <div className="card" style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div className="card-head" style={{ flexShrink: 0 }}>
                <div className="card-title">Response</div>
                {selectedResult && (
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <StatusChip code={selectedResult.status_code} />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text2)" }}>{selectedResult.response_time_ms}ms</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text3)" }}>{selectedResult.response_size_bytes}B</span>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: selectedResult.risk_score > 60 ? "var(--red-bg)" : "var(--green-bg)", color: selectedResult.risk_score > 60 ? "var(--red)" : "var(--green)", border: `1px solid ${selectedResult.risk_score > 60 ? "var(--red-border)" : "var(--green-border)"}`, fontWeight: 700 }}>
                      Risk: {selectedResult.risk_score}
                    </span>
                  </div>
                )}
              </div>

              {/* Tabs */}
              {selectedResult && (
                <div style={{ display: "flex", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
                  {(["response", "headers"] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} style={{
                      padding: "10px 16px", background: "none", border: "none", cursor: "pointer",
                      fontSize: 12, fontWeight: 600, color: activeTab === tab ? "var(--accent2)" : "var(--text3)",
                      borderBottom: `2px solid ${activeTab === tab ? "var(--accent)" : "transparent"}`,
                      textTransform: "capitalize", fontFamily: "var(--font-body)",
                    }}>{tab}</button>
                  ))}
                </div>
              )}

              <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
                {!selectedResult ? (
                  <div style={{ color: "var(--text3)", fontSize: 13 }}>Hit "Send" to see the response</div>
                ) : selectedResult.error ? (
                  <div style={{ padding: "12px 14px", borderRadius: 8, background: "var(--red-bg)", border: "1px solid var(--red-border)", fontSize: 13, color: "var(--red)", fontFamily: "var(--font-mono)" }}>
                    Error: {selectedResult.error}
                  </div>
                ) : activeTab === "response" ? (
                  <pre style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text)", whiteSpace: "pre-wrap", wordBreak: "break-all", margin: 0 }}>
                    {(() => {
                      try { return JSON.stringify(JSON.parse(selectedResult.response_preview), null, 2); }
                      catch { return selectedResult.response_preview; }
                    })()}
                  </pre>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {Object.entries(selectedResult.headers).map(([k, v]) => (
                      <div key={k} style={{ display: "flex", gap: 16, fontSize: 12, fontFamily: "var(--font-mono)" }}>
                        <span style={{ color: "var(--accent2)", minWidth: 200 }}>{k}</span>
                        <span style={{ color: "var(--text2)" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default RepoAnalyzerPage;