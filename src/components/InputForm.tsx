import React, { useState } from "react";
import { FormData, PredictionResult } from "../types/types";

interface Props {
  form: FormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  isPredicting: boolean;
  result: PredictionResult | null;
  trend: string;
}

interface FieldConfig {
  name: keyof FormData;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}

const FIELDS: FieldConfig[] = [
  { name: "response_time", label: "Response Time", min: 50,  max: 3000, step: 10,  unit: " ms" },
  { name: "status_code",   label: "Status Code",   min: 200, max: 503,  step: 1,   unit: "" },
  { name: "cpu_usage",     label: "CPU Usage",     min: 0,   max: 100,  step: 1,   unit: "%" },
  { name: "memory_usage",  label: "Memory Usage",  min: 0,   max: 100,  step: 1,   unit: "%" },
];

const InputForm: React.FC<Props> = ({
  form,
  onChange,
  onSubmit,
  isPredicting,
  result,
  trend,
}) => {
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Manual Prediction</div>
        <span style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--font-mono)" }}>
          ML-powered
        </span>
      </div>

      <div className="predict-form">
        {/* Trend indicator */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 10px",
          borderRadius: "var(--r)",
          background: "var(--bg3)",
          border: "1px solid var(--border)",
          fontSize: 12,
          color: "var(--text2)",
        }}>
          <span style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 600 }}>System Trend</span>
          <span style={{ marginLeft: "auto" }}>{trend}</span>
        </div>

        {/* Sliders */}
        <div className="form-grid">
          {FIELDS.map((field) => (
            <div className="field" key={field.name}>
              <label>
                {field.label}
                <span>
                  {form[field.name]}
                  {field.unit}
                </span>
              </label>
              <input
                type="range"
                name={field.name}
                min={field.min}
                max={field.max}
                step={field.step}
                value={form[field.name]}
                onChange={onChange}
              />
            </div>
          ))}
        </div>

        {/* Submit */}
        <button
          className="predict-btn"
          onClick={onSubmit}
          disabled={isPredicting}
        >
          <svg viewBox="0 0 16 16" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2L14 5V11L8 14L2 11V5L8 2Z" />
            <circle cx="8" cy="8" r="2" fill="white" stroke="none" />
          </svg>
          {isPredicting ? "Analyzing…" : "Run Prediction"}
        </button>

        {/* Result */}
        {result && <PredictionResultCard result={result} />}
      </div>
    </div>
  );
};

const PredictionResultCard: React.FC<{ result: PredictionResult }> = ({ result }) => {
  const isHigh = result.prediction.toLowerCase().includes("high");
  return (
    <div className={`result-box ${isHigh ? "high" : "stable"}`}>
      <div
        className="result-icon"
        style={{
          background: isHigh ? "var(--red-bg)" : "var(--green-bg)",
          border: `1px solid ${isHigh ? "var(--red-border)" : "var(--green-border)"}`,
        }}
      >
        {isHigh ? "⚠" : "✓"}
      </div>
      <div className="result-info">
        <h4>{result.prediction}</h4>
        <p>{result.suggestion}</p>
      </div>
      <div className="result-score">
        <div className="num">{result.risk_score}</div>
        <div className="lbl">Risk Score</div>
      </div>
    </div>
  );
};

export default InputForm;