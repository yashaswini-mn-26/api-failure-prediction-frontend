import axios from "axios";
import { FormData, LogEntry, PredictionResult, RepoAnalysis, EndpointTestResult, EndpointMetric } from "../types/types";

const BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:5000";

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.error || err.message || "Unexpected error";
    return Promise.reject(new Error(message));
  }
);

// existing
export const predictAPI    = (data: FormData) => apiClient.post<PredictionResult>("/predict", data);
export const fetchHistory  = async (): Promise<LogEntry[]> => (await apiClient.get<LogEntry[]>("/history")).data;
export const ingestMetrics = (data: any) => apiClient.post("/ingest", data);
export const healthCheck   = () => apiClient.get("/health");

// github
export const analyzeRepo = (repo_url: string, token?: string) =>
  apiClient.post<RepoAnalysis>("/github/analyze", { repo_url, token });

// proxy testing
export const testEndpoint = (data: {
  project_id: string; base_url: string; method: string; path: string;
  headers?: Record<string, string>; body?: any;
}) => apiClient.post<EndpointTestResult>("/proxy/test", data);

export const testAllEndpoints = (data: {
  project_id: string; base_url: string; routes: { method: string; path: string }[];
}) => apiClient.post<EndpointTestResult[]>("/proxy/test-all", data);

export const fetchEndpointMetrics = (project_id: string, path?: string): Promise<EndpointMetric[]> =>
  apiClient.get<EndpointMetric[]>(`/endpoint-metrics/${project_id}`, { params: { path } }).then(r => r.data);