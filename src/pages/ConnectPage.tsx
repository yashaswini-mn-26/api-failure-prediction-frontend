import React, { useState } from "react";
import { ConnectedProject, RepoAnalysis } from "../types/types";
import { analyzeRepo } from "../services/api";

interface Props {
  projects: ConnectedProject[];
  onProjectAdded: (p: ConnectedProject) => void;
  onProjectSelect: (p: ConnectedProject) => void;
  onNavigate: (page: any) => void;
}

const METHOD_COLOR: Record<string, string> = {
  GET: "#22c55e", POST: "#4f6ef7", PUT: "#f59e0b",
  DELETE: "#ef4444", PATCH: "#a855f7",
};

const FRAMEWORK_ICONS: Record<string, string> = {
  flask: "🐍", django: "🦄", fastapi: "⚡", express: "🟢",
  rails: "💎", spring: "☕", unknown: "📦",
};

const Btn: React.FC<{ onClick: () => void; disabled?: boolean; variant?: "primary"|"ghost"; children: React.ReactNode }> = ({ onClick, disabled, variant = "ghost", children }) => (
  <button onClick={onClick} disabled={disabled} style={{
    display: "flex", alignItems: "center", gap: 8, padding: variant === "primary" ? "10px 20px" : "7px 14px",
    borderRadius: 8, border: `1px solid ${variant === "primary" ? "transparent" : "var(--border2)"}`,
    background: variant === "primary" ? "var(--accent)" : "none",
    color: variant === "primary" ? "#fff" : "var(--accent2)",
    fontSize: 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1, transition: "all .15s", fontFamily: "var(--font-body)",
  }}>
    {children}
  </button>
);

const ConnectPage: React.FC<Props> = ({ projects, onProjectAdded, onProjectSelect, onNavigate }) => {
  const [repoUrl, setRepoUrl] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [token, setToken]     = useState("");
  const [projectName, setProjectName] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<RepoAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"input"|"review"|"done">("input");

  const handleAnalyze = async () => {
    if (!repoUrl.trim()) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const res = await analyzeRepo(repoUrl.trim(), token.trim() || undefined);
      setAnalysis(res.data);
      setProjectName(res.data.repo);
      setStep("review");
    } catch (e: any) {
      setError(e.message || "Failed to analyze repo");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConnect = () => {
    if (!analysis || !baseUrl.trim()) return;
    const project: ConnectedProject = {
      id: `proj_${Date.now()}`,
      name: projectName || analysis.repo,
      repo_url: analysis.repo_url,
      base_url: baseUrl.trim().replace(/\/$/, ""),
      framework: analysis.framework,
      routes: analysis.routes,
      connected_at: new Date().toISOString(),
      is_active: true,
    };
    onProjectAdded(project);
    setStep("done");
  };

  const reset = () => {
    setRepoUrl(""); setBaseUrl(""); setToken(""); setProjectName("");
    setAnalysis(null); setError(null); setStep("input");
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, alignItems: "start" }}>

      {/* ── Left: main flow ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Step 1 — Input */}
        {step === "input" && (
          <div className="card">
            <div className="card-head">
              <div className="card-title">Connect a GitHub Repository</div>
              <span style={{ fontSize: 11, color: "var(--text3)" }}>step 1 of 2</span>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Repo URL */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px", display: "block", marginBottom: 6 }}>
                  GitHub Repository URL
                </label>
                <input value={repoUrl} onChange={e => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo"
                  onKeyDown={e => e.key === "Enter" && handleAnalyze()}
                  style={{ width: "100%", height: 38, padding: "0 12px", borderRadius: 8, background: "var(--bg3)", border: "1px solid var(--border2)", color: "var(--text)", fontSize: 13, outline: "none", fontFamily: "var(--font-mono)" }} />
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 5 }}>
                  Supports Flask, Django, FastAPI, Express, Rails — public or private
                </div>
              </div>

              {/* Token (collapsible) */}
              <details style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                <summary style={{ padding: "10px 14px", fontSize: 12, color: "var(--text2)", cursor: "pointer", userSelect: "none", fontWeight: 500 }}>
                  Private repo? Add GitHub Personal Access Token (optional)
                </summary>
                <div style={{ padding: "0 14px 14px" }}>
                  <input value={token} onChange={e => setToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    type="password"
                    style={{ width: "100%", height: 36, padding: "0 12px", borderRadius: 8, background: "var(--bg3)", border: "1px solid var(--border2)", color: "var(--text)", fontSize: 13, outline: "none", fontFamily: "var(--font-mono)", marginTop: 8 }} />
                  <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 6 }}>
                    Token is used only for this request and never stored on disk
                  </div>
                </div>
              </details>

              {error && (
                <div style={{ padding: "10px 14px", borderRadius: 8, background: "var(--red-bg)", border: "1px solid var(--red-border)", fontSize: 13, color: "var(--red)" }}>
                  {error}
                </div>
              )}

              <Btn onClick={handleAnalyze} disabled={isAnalyzing || !repoUrl.trim()} variant="primary">
                {isAnalyzing ? (
                  <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>↻</span> Analyzing repo…</>
                ) : (
                  <><span>🔍</span> Analyze Repository</>
                )}
              </Btn>

              {/* Example repos */}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".6px", fontWeight: 600, marginBottom: 10 }}>Try an example</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {[
                    { label: "Flask app", url: "https://github.com/pallets/flask" },
                    { label: "FastAPI demo", url: "https://github.com/tiangolo/fastapi" },
                    { label: "Django", url: "https://github.com/django/django" },
                  ].map(ex => (
                    <button key={ex.url} onClick={() => setRepoUrl(ex.url)} style={{
                      padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                      background: "var(--bg3)", border: "1px solid var(--border2)", color: "var(--text2)", cursor: "pointer",
                    }}>{ex.label}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2 — Review analysis */}
        {step === "review" && analysis && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Repo info card */}
            <div className="card">
              <div className="card-head">
                <div className="card-title">
                  {FRAMEWORK_ICONS[analysis.framework] || "📦"} {analysis.owner}/{analysis.repo}
                </div>
                <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, background: "var(--green-bg)", color: "var(--green)", border: "1px solid var(--green-border)", fontWeight: 700 }}>
                  {analysis.routes.length} routes found
                </span>
              </div>
              <div style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                {[
                  { label: "Framework", value: analysis.framework },
                  { label: "Language", value: analysis.language },
                  { label: "Stars", value: analysis.stars.toLocaleString() },
                  { label: "Files scanned", value: analysis.files_scanned },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: "var(--bg3)", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 600, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 500, color: "var(--text)" }}>{value}</div>
                  </div>
                ))}
              </div>
              {analysis.readme_summary && (
                <div style={{ padding: "0 16px 16px", fontSize: 13, color: "var(--text2)", lineHeight: 1.6, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                  {analysis.readme_summary}
                </div>
              )}
            </div>

            {/* Routes list */}
            <div className="card">
              <div className="card-head">
                <div className="card-title">Detected Endpoints <span>— {analysis.routes.length} total</span></div>
              </div>
              <div style={{ maxHeight: 320, overflowY: "auto" }}>
                {analysis.routes.map((r, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, minWidth: 52, textAlign: "center", padding: "3px 6px", borderRadius: 4, background: (METHOD_COLOR[r.method] || "#888") + "18", color: METHOD_COLOR[r.method] || "var(--text2)", letterSpacing: ".3px" }}>
                      {r.method}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text)", flex: 1 }}>{r.path}</span>
                    <span style={{ fontSize: 11, color: "var(--text3)" }}>{r.file}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Connect form */}
            <div className="card">
              <div className="card-head">
                <div className="card-title">Connect Your Running App</div>
                <span style={{ fontSize: 11, color: "var(--text3)" }}>step 2 of 2</span>
              </div>
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px", display: "block", marginBottom: 6 }}>Project Name</label>
                  <input value={projectName} onChange={e => setProjectName(e.target.value)}
                    style={{ width: "100%", height: 36, padding: "0 12px", borderRadius: 8, background: "var(--bg3)", border: "1px solid var(--border2)", color: "var(--text)", fontSize: 13, outline: "none", fontFamily: "var(--font-body)" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px", display: "block", marginBottom: 6 }}>
                    Your App Base URL <span style={{ color: "var(--red)", marginLeft: 4 }}>*</span>
                  </label>
                  <input value={baseUrl} onChange={e => setBaseUrl(e.target.value)}
                    placeholder="http://localhost:8000  or  https://myapp.railway.app"
                    style={{ width: "100%", height: 36, padding: "0 12px", borderRadius: 8, background: "var(--bg3)", border: "1px solid var(--border2)", color: "var(--text)", fontSize: 13, outline: "none", fontFamily: "var(--font-mono)" }} />
                  <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 5 }}>
                    Where your app is running — local or deployed. We'll test endpoints against this URL.
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={reset} style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid var(--border2)", background: "none", color: "var(--text2)", fontSize: 13, cursor: "pointer", fontFamily: "var(--font-body)" }}>
                    ← Back
                  </button>
                  <Btn onClick={handleConnect} disabled={!baseUrl.trim()} variant="primary">
                    ✓ Connect Project
                  </Btn>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Done */}
        {step === "done" && (
          <div className="card">
            <div style={{ padding: 48, textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
              <h3 style={{ fontFamily: "var(--font-head)", fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Project Connected!</h3>
              <p style={{ fontSize: 14, color: "var(--text2)", marginBottom: 24 }}>
                Your project is ready. Head to the Repo Analyzer to test endpoints.
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <Btn onClick={() => onNavigate("repo-analyzer")} variant="primary">Open Analyzer →</Btn>
                <Btn onClick={reset}>Connect Another</Btn>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Right: connected projects ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="card">
          <div className="card-head">
            <div className="card-title">Connected Projects <span>— {projects.length}</span></div>
          </div>
          {projects.length === 0 ? (
            <div className="empty" style={{ padding: 32 }}>
              <svg viewBox="0 0 16 16"><path d="M2 2h12v12H2z" rx="2"/><line x1="6" y1="8" x2="10" y2="8"/><line x1="8" y1="6" x2="8" y2="10"/></svg>
              <p>No projects yet — connect one to start</p>
            </div>
          ) : projects.map(p => (
            <div key={p.id} onClick={() => { onProjectSelect(p); onNavigate("repo-analyzer"); }}
              style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", cursor: "pointer", transition: "background .1s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--bg3)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span>{FRAMEWORK_ICONS[p.framework] || "📦"}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{p.name}</span>
                <span style={{ marginLeft: "auto", fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "var(--green-bg)", color: "var(--green)", border: "1px solid var(--green-border)", fontWeight: 700 }}>
                  Active
                </span>
              </div>
              <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text3)", marginBottom: 3 }}>{p.base_url}</div>
              <div style={{ fontSize: 11, color: "var(--text3)" }}>{p.routes.length} endpoints · {p.framework}</div>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="card">
          <div className="card-head"><div className="card-title">How it works</div></div>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { n: "1", title: "Paste your GitHub URL", desc: "We read your code via the GitHub API — no cloning needed" },
              { n: "2", title: "We detect all routes", desc: "Parser reads urls.py, routes.js, app.py and finds every endpoint" },
              { n: "3", title: "Add your running app URL", desc: "Could be localhost:8000 or a deployed URL — anywhere reachable" },
              { n: "4", title: "We test & monitor", desc: "Flask proxy calls each endpoint, measures latency and status codes" },
            ].map(s => (
              <div key={s.n} style={{ display: "flex", gap: 12 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--accent-glow)", border: "1px solid var(--border2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--accent2)", flexShrink: 0 }}>{s.n}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text3)" }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ConnectPage;