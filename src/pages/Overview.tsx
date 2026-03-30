import React from "react";
import { LogEntry, SystemStatus } from "../types/types";
import KPIGrid from "../components/KPIGrid";
import Charts from "../components/Charts";
import InputForm from "../components/InputForm";
import Logs from "../components/Logs";
import { FormData, PredictionResult } from "../types/types";
import { predictAPI } from "../services/api";

interface Props {
  logs: LogEntry[];
  isLoading: boolean;
  onRefresh: () => void;
  lastRefresh: Date | null;
  systemStatus: SystemStatus;
}

const Overview: React.FC<Props> = ({ logs, isLoading, onRefresh, lastRefresh, systemStatus }) => {
  const [form, setForm] = React.useState<FormData>({ response_time: 100, status_code: 200, cpu_usage: 50, memory_usage: 50 });
  const [result, setResult] = React.useState<PredictionResult | null>(null);
  const [isPredicting, setIsPredicting] = React.useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: Number(e.target.value) }));

  const handleSubmit = async () => {
    setIsPredicting(true);
    try {
      const res = await predictAPI(form);
      setResult(res.data);
      onRefresh();
    } finally {
      setIsPredicting(false);
    }
  };

  const getTrend = (): string => {
    if (logs.length < 5) return "Not enough data";
    const diff = logs[0].cpu_usage - logs[4].cpu_usage;
    if (diff > 10) return "📈 Increasing Load";
    if (diff < -10) return "📉 Decreasing Load";
    return "➖ Stable";
  };

  return (
    <>
      <KPIGrid logs={logs} />
      <Charts logs={logs} isLoading={isLoading} onRefresh={onRefresh} />
      <div className="grid-2">
        <InputForm form={form} onChange={handleChange} onSubmit={handleSubmit} isPredicting={isPredicting} result={result} trend={getTrend()} />
        <Logs logs={logs} lastRefresh={lastRefresh} onRefresh={onRefresh} />
      </div>
    </>
  );
};

export default Overview;