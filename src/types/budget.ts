export type CostType = 'labor' | 'material' | 'sub';
export type MarkupMode = 'percent' | 'fixed';

export interface Markup {
  mode: MarkupMode;
  value: number;
}

export interface ProjectMarkups {
  tax: Markup;
  ohp: Markup;
  insurance: Markup;
  contingency: Markup;
  escalation: Markup;
}

export interface ProjectReferenceRecord {
  id: string;
  projectId?: string;
  name: string;
  sortOrder?: number;
}

export interface LineItem {
  id: string;
  projectId: string;
  areaId?: string | null;
  scopeId?: string | null;
  costType: CostType;
  description: string;
  vendor?: string;
  material?: string;
  qty?: number;
  unitId?: string | null;
  unitCost?: number;
  hours?: number;
  hourlyRate?: number;
  subAmount?: number;
  notes?: string;
}

export interface BudgetSummary {
  directSubtotal: number;
  insurance: number;
  ohp: number;
  tax: number;
  contingency: number;
  escalation: number;
  totalBudget: number;
}

export interface BudgetFilters {
  areaId: string | 'all';
  scopeId: string | 'all';
  costType: CostType | 'all';
}
