import React from "react";
import { SystemStatus } from "../types/types";

interface Props {
  status: SystemStatus;
}

const STATUS_MAP: Record<SystemStatus, { label: string; cls: string }> = {
  healthy:  { label: "Healthy",  cls: "badge-green" },
  warning:  { label: "Warning",  cls: "badge-amber" },
  critical: { label: "Critical", cls: "badge-red" },
  unknown:  { label: "Unknown",  cls: "badge-amber" },
};

const StatusBadge: React.FC<Props> = ({ status }) => {
  const { label, cls } = STATUS_MAP[status];
  return (
    <span className={`badge ${cls}`}>
      <span>●</span> {label}
    </span>
  );
};

export default StatusBadge;