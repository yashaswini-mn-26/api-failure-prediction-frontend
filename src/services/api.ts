/*
  services/api.ts — HTTP Service Layer
  ─────────────────────────────────────────────────────────────────────────
  PURPOSE:
    Centralises all HTTP calls to the Flask backend.
    Components never call fetch() directly — they call functions from here.
    This means if the API changes, you update ONE file, not every component.

  BASE_URL:
    REACT_APP_API_URL is read from a .env file if it exists.
    Default: http://127.0.0.1:5000 (Flask dev server on localhost).
    In production, set REACT_APP_API_URL=https://your-api.com in .env.production.

  axios vs fetch:
    We use axios because it:
    - Automatically parses JSON responses (no .json() call needed)
    - Has a request/response interceptor system for global error handling
    - Includes request timeout support (fetch has no native timeout)
    - Returns the response body under res.data (not res.json())

  INTERCEPTORS:
    Response interceptor catches ALL failed requests in one place.
    Instead of try/catch in every component, errors flow to one handler.
    The error is re-thrown so individual callers can still catch it.
*/

import axios from "axios";
import { FormData, LogEntry, PredictionResult } from "../types/types";

// BASE_URL: reads from Create React App env variable, falls back to localhost
// process.env.REACT_APP_* variables are injected at build time by CRA webpack
const BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:5000";
console.log("[API] Base URL:", BASE_URL);

// Create an axios instance with shared config
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,                          // 10 second timeout — fails fast
  headers: { "Content-Type": "application/json" },
});

// RESPONSE INTERCEPTOR — runs for every response (success or failure)
// First function: handles success (2xx) — just passes through
// Second function: handles error (4xx, 5xx, network failure)
apiClient.interceptors.response.use(
  (res) => res,                            // Pass successful responses through unchanged
  (err) => {
    // Try to extract a meaningful error message (in priority order)
    const message =
      err.response?.data?.error ||         // Flask returned {"error": "..."}
      err.message ||                       // Axios generated message (e.g. "timeout")
      "An unexpected error occurred";
    console.error("[API Error]", message);
    return Promise.reject(new Error(message)); // Re-throw for callers to catch
  }
);

/*
  predictAPI — POST /predict
  Sends the 4 form values, gets back a PredictionResult.
  Returns an AxiosResponse<PredictionResult> so callers do res.data to get the object.
*/
export const predictAPI = (data: FormData) =>
  apiClient.post<PredictionResult>("/predict", data);

/*
  fetchHistory — GET /history
  Returns the last 50 log entries from SQLite, sorted newest-first.
  The Flask /history endpoint returns DESC order; we reverse() so index 0 = newest.
  Note: async/await here because we need to call .reverse() on the raw array.
*/
export const fetchHistory = async (): Promise<LogEntry[]> => {
  const res = await apiClient.get<LogEntry[]>("/history");
  // Flask returns DESC (newest first), which is what we want — no reverse needed
  // But if your API returns ASC, uncomment: return res.data.reverse();
  return res.data;
};

/*
  ingestMetrics — POST /ingest
  Allows external code (e.g. a test script) to push custom metric events.
  Omit<> removes fields that are computed server-side (not provided by client).
*/
export const ingestMetrics = (
  data: Omit<LogEntry, "created_at" | "time" | "risk_score" | "prediction" | "confidence">
) => apiClient.post("/ingest", data);

/*
  healthCheck — GET /
  Used by Settings page "Test Connection" button to verify the backend is reachable.
*/
export const healthCheck = () => apiClient.get("/health");