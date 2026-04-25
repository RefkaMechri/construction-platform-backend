export type CriticalTaskResult = {
  taskId: number;
  taskName: string;
  phaseId: number;
  phaseName: string;
  parentTaskId?: number | null;
  startDate: string | null;
  endDate: string | null;
  durationDays: number;
  es: number;
  ef: number;
  ls: number;
  lf: number;
  slack: number;
  totalFloat: number;
  freeFloat: number;
  isCritical: boolean;
};
