import type {
  BudgetFilters,
  BudgetSummary,
  LineItem,
  Markup,
  ProjectMarkups,
  ProjectReferenceRecord,
} from '@/types/budget';

const toAmount = (value: number | undefined | null) => (value == null ? 0 : value);

export const computeLineItemDirectCost = (item: LineItem): number => {
  if (item.costType === 'labor') {
    return toAmount(item.hours) * toAmount(item.hourlyRate);
  }

  if (item.costType === 'material') {
    return toAmount(item.qty) * toAmount(item.unitCost);
  }

  return toAmount(item.subAmount);
};

const computeMarkupAmount = (baseAmount: number, markup: Markup): number => {
  if (markup.mode === 'fixed') {
    return markup.value;
  }

  const normalizedPercent = markup.value / 100;
  return baseAmount * normalizedPercent;
};

export const filterLineItems = (items: LineItem[], filters: BudgetFilters): LineItem[] =>
  items.filter((item) => {
    if (filters.areaId !== 'all' && item.areaId !== filters.areaId) return false;
    if (filters.scopeId !== 'all' && item.scopeId !== filters.scopeId) return false;
    if (filters.costType !== 'all' && item.costType !== filters.costType) return false;
    return true;
  });

export const summarizeBudget = (
  allItems: LineItem[],
  filteredItems: LineItem[],
  markups: ProjectMarkups,
  applyMarkupsToFilteredView: boolean,
): BudgetSummary => {
  const subtotalForTable = filteredItems.reduce((sum, item) => sum + computeLineItemDirectCost(item), 0);
  const subtotalForMarkups = (applyMarkupsToFilteredView ? filteredItems : allItems).reduce(
    (sum, item) => sum + computeLineItemDirectCost(item),
    0,
  );

  const insurance = computeMarkupAmount(subtotalForMarkups, markups.insurance);
  const ohp = computeMarkupAmount(subtotalForMarkups, markups.ohp);
  const tax = computeMarkupAmount(subtotalForMarkups, markups.tax);
  const contingency = computeMarkupAmount(subtotalForMarkups, markups.contingency);
  const escalation = computeMarkupAmount(subtotalForMarkups, markups.escalation);

  const totalBudget = subtotalForTable + insurance + ohp + tax + contingency + escalation;

  return {
    directSubtotal: subtotalForTable,
    insurance,
    ohp,
    tax,
    contingency,
    escalation,
    totalBudget,
  };
};

export interface AreaScopeGroup {
  areaId: string;
  areaName: string;
  areaSubtotal: number;
  scopes: {
    scopeId: string;
    scopeName: string;
    scopeSubtotal: number;
    items: LineItem[];
  }[];
}

export const groupLineItemsByAreaAndScope = (
  items: LineItem[],
  areas: ProjectReferenceRecord[],
  scopes: ProjectReferenceRecord[],
): AreaScopeGroup[] => {
  const areaLookup = new Map(areas.map((area) => [area.id, area.name]));
  const scopeLookup = new Map(scopes.map((scope) => [scope.id, scope.name]));

  const grouped = new Map<
    string,
    {
      areaName: string;
      areaSubtotal: number;
      scopes: Map<string, { scopeName: string; scopeSubtotal: number; items: LineItem[] }>;
    }
  >();

  for (const item of items) {
    const areaId = item.areaId ?? 'unassigned-area';
    const scopeId = item.scopeId ?? 'unassigned-scope';
    const areaName = areaLookup.get(areaId) ?? 'Unassigned Area';
    const scopeName = scopeLookup.get(scopeId) ?? 'Unassigned Scope';
    const directCost = computeLineItemDirectCost(item);

    if (!grouped.has(areaId)) {
      grouped.set(areaId, {
        areaName,
        areaSubtotal: 0,
        scopes: new Map(),
      });
    }

    const areaGroup = grouped.get(areaId)!;
    areaGroup.areaSubtotal += directCost;

    if (!areaGroup.scopes.has(scopeId)) {
      areaGroup.scopes.set(scopeId, { scopeName, scopeSubtotal: 0, items: [] });
    }

    const scopeGroup = areaGroup.scopes.get(scopeId)!;
    scopeGroup.scopeSubtotal += directCost;
    scopeGroup.items.push(item);
  }

  return Array.from(grouped.entries()).map(([areaId, area]) => ({
    areaId,
    areaName: area.areaName,
    areaSubtotal: area.areaSubtotal,
    scopes: Array.from(area.scopes.entries()).map(([scopeId, scope]) => ({
      scopeId,
      scopeName: scope.scopeName,
      scopeSubtotal: scope.scopeSubtotal,
      items: scope.items,
    })),
  }));
};
