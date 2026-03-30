// src/services/logGenerator.ts
export const generateLog = () => {
  return {
    response_time: Math.floor(Math.random() * 2000),
    status_code: Math.random() > 0.8 ? 500 : 200,
    cpu_usage: Math.floor(Math.random() * 100),
    memory_usage: Math.floor(Math.random() * 100),
  };
};