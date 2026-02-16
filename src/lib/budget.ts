import type {
  BudgetFilters,
  BudgetSummary,
  LineItem,
  Markup,
  ProjectMarkups,
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
