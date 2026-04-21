export const PROJECT_BUDGET_ITEM_CATEGORIES = [
  'TRANSPORT',
  'ADMINISTRATIVE',
  'SITE_INSTALLATION',
  'LOGISTICS',
  'OTHER',
] as const;

export type ProjectBudgetItemCategory =
  (typeof PROJECT_BUDGET_ITEM_CATEGORIES)[number];
