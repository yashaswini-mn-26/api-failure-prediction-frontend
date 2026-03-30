/*
  types/types.ts — Shared TypeScript Types
  ─────────────────────────────────────────────────────────────────────────
  PURPOSE:
    Central location for all TypeScript interfaces and types.
    Importing from here ensures the same shape is used in components,
    services, and pages — no duplication, no drift.

  WHY TYPESCRIPT INTERFACES?
    TypeScript interfaces describe the SHAPE of an object.
    They're erased at compile time (no runtime cost).
    They give autocomplete and catch errors before you run the code.
*/

// FormData — the 4 input values the user adjusts in the prediction form
// These are sent as the POST /predict request body.
export interface FormData {
  response_time: number;  // API response time in milliseconds (50–5000)
  status_code:   number;  // HTTP status code (200, 404, 500, 503, etc.)
  cpu_usage:     number;  // CPU utilisation percentage (0–100)
  memory_usage:  number;  // Memory utilisation percentage (0–100)
}

// PredictionResult — the response from POST /predict
// Flask backend returns this JSON shape.
export interface PredictionResult {
  prediction:  string;  // "High Risk ⚠️" or "Stable ✅"
  confidence:  number;  // ML model probability (0.00–1.00)
  risk_score:  number;  // Hybrid score: ML + rule boosts (0–100)
  suggestion:  string;  // Human-readable recommendation string
}

// LogEntry — one row from GET /history
// Flask returns an array of these from the SQLite metrics table.
export interface LogEntry {
  response_time: number;       // Milliseconds
  status_code:   number;       // HTTP status
  cpu_usage:     number;       // Percent
  memory_usage:  number;       // Percent
  risk_score:    number;       // 0–100 computed risk
  prediction?:   string;       // Optional — only present if prediction was run
  confidence?:   number;       // Optional — ML confidence
  created_at:    string;       // ISO datetime string from SQLite datetime('now')
  time?:         string;       // Optional display-formatted time string
}

// SystemStatus — drives the topbar badge and sidebar dot
// Derived from the latest LogEntry's risk_score in App.tsx evaluateAlerts().
export type SystemStatus = "healthy" | "warning" | "critical" | "unknown";