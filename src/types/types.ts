// ─── Existing SentinelAPI types ───────────────────────────────────────────────

export interface FormData {
  response_time: number;
  status_code: number;
  cpu_usage: number;
  memory_usage: number;
}

export interface PredictionResult {
  prediction: string;
  confidence: number;
  risk_score: number;
  suggestion: string;
}

export interface LogEntry {
  response_time: number;
  status_code: number;
  cpu_usage: number;
  memory_usage: number;
  risk_score: number;
  prediction?: string;
  confidence?: number;
  created_at: string;
  time?: string;
}

export type SystemStatus = "healthy" | "warning" | "critical" | "unknown";

// ─── GitHub Integration types ─────────────────────────────────────────────────

export interface ParsedRoute {
  method: string;
  path: string;
  file: string;
  line?: number;
  framework: string;
}

export interface RepoAnalysis {
  repo_url: string;
  owner: string;
  repo: string;
  framework: string;
  language: string;
  routes: ParsedRoute[];
  files_scanned: number;
  readme_summary: string;
  stars: number;
  description: string;
}

export interface ConnectedProject {
  id: string;
  name: string;
  repo_url: string;
  base_url: string;
  framework: string;
  routes: ParsedRoute[];
  connected_at: string;
  is_active: boolean;
}

export interface EndpointTestResult {
  endpoint_id: string;
  project_id: string;
  method: string;
  path: string;
  full_url: string;
  status_code: number;
  response_time_ms: number;
  response_size_bytes: number;
  response_preview: string;
  headers: Record<string, string>;
  error?: string;
  tested_at: string;
  risk_score: number;
}

export interface EndpointMetric {
  id: number;
  project_id: string;
  endpoint_path: string;
  method: string;
  status_code: number;
  response_time_ms: number;
  risk_score: number;
  tested_at: string;
}