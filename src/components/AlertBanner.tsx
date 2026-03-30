import React from "react";

interface Props {
  title: string;
  desc: string;
  level: "critical" | "warning";
  onDismiss: () => void;
}

const AlertBanner: React.FC<Props> = ({ title, desc, level, onDismiss }) => (
  <div className={`alert-banner ${level}`}>
    <div className="alert-icon">
      <svg viewBox="0 0 16 16">
        <path d="M8 2L14 14H2L8 2Z" />
        <line x1="8" y1="7" x2="8" y2="10" />
        <circle cx="8" cy="12" r="0.6" fill="currentColor" />
      </svg>
    </div>
    <div className="alert-text">
      <h4>{title}</h4>
      <p>{desc}</p>
    </div>
    <button className="alert-close" onClick={onDismiss} aria-label="Dismiss alert">
      ✕
    </button>
  </div>
);

export default AlertBanner;