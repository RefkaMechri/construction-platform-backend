export type CriticalTaskResult = {
  taskId: number;
  taskName: string;
  phaseId: number;
  phaseName: string;
  startDate: string | null;
  endDate: string | null;
  es: number;
  ef: number;
  ls: number;
  lf: number;
  slack: number;
  isCritical: boolean;
};
