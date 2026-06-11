export type BudgetVarianceStatus = 'UNDER' | 'ON_TRACK' | 'OVER';

export type TaskDirectCostsVariance = {
  taskId: number;
  taskName: string;
  planned: {
    labor: number;
    equipment: number;
    material: number;
    total: number;
  };
  actual: {
    labor: number;
    equipment: number;
    material: number;
    total: number;
  };
  variance: {
    labor: number;
    equipment: number;
    material: number;
    total: number;
  };
  consumptionRate: number;
  status: BudgetVarianceStatus;
};

export type PhaseDirectCostsVariance = {
  phaseId: number;
  phaseName: string;
  tasks: TaskDirectCostsVariance[];
  planned: {
    labor: number;
    equipment: number;
    material: number;
    total: number;
  };
  actual: {
    labor: number;
    equipment: number;
    material: number;
    total: number;
  };
  variance: {
    labor: number;
    equipment: number;
    material: number;
    total: number;
  };
  consumptionRate: number;
  status: BudgetVarianceStatus;
};

export type ProjectDirectCostsVariance = {
  projectId: number;
  projectName: string;
  phases: PhaseDirectCostsVariance[];
  planned: {
    labor: number;
    equipment: number;
    material: number;
    total: number;
  };
  actual: {
    labor: number;
    equipment: number;
    material: number;
    total: number;
  };
  variance: {
    labor: number;
    equipment: number;
    material: number;
    total: number;
  };
  consumptionRate: number;
  status: BudgetVarianceStatus;
};

export type TaskDirectCosts = {
  taskId: number;
  taskName: string;
  labor: number;
  equipment: number;
  material: number;
  total: number;
};

export type PhaseDirectCosts = {
  phaseId: number;
  phaseName: string;
  tasks: TaskDirectCosts[];
  totals: {
    labor: number;
    equipment: number;
    material: number;
    total: number;
  };
};

export type ProjectDirectCosts = {
  projectId: number;
  projectName: string;
  phases: PhaseDirectCosts[];
  totals: {
    labor: number;
    equipment: number;
    material: number;
    total: number;
  };
};
export type TaskActualDirectCosts = {
  taskId: number;
  taskName: string;
  labor: number;
  equipment: number;
  material: number;
  total: number;
};

export type PhaseActualDirectCosts = {
  phaseId: number;
  phaseName: string;
  tasks: TaskActualDirectCosts[];
  totals: {
    labor: number;
    equipment: number;
    material: number;
    total: number;
  };
};

export type ProjectActualDirectCosts = {
  projectId: number;
  projectName: string;
  phases: PhaseActualDirectCosts[];
  totals: {
    labor: number;
    equipment: number;
    material: number;
    total: number;
  };
};
