'use client';

import { useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { computeLineItemDirectCost, filterLineItems, summarizeBudget } from '@/lib/budget';
import type {
  BudgetFilters,
  CostType,
  LineItem,
  ProjectMarkups,
  ProjectReferenceRecord,
} from '@/types/budget';
import { CreateOptionSelect } from '@/components/projects/create-option-select';
import { LineItemModal } from '@/components/projects/line-item-modal';

interface BudgetBuilderProps {
  projectId: string;
  markups: ProjectMarkups;
  initialAreas?: ProjectReferenceRecord[];
  initialScopes?: ProjectReferenceRecord[];
  initialUnits?: ProjectReferenceRecord[];
  initialItems?: LineItem[];
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function BudgetBuilder({
  projectId,
  markups,
  initialAreas = [],
  initialScopes = [],
  initialUnits = [],
  initialItems = [],
}: BudgetBuilderProps) {
  const [areas, setAreas] = useState(initialAreas);
  const [scopes, setScopes] = useState(initialScopes);
  const [units, setUnits] = useState(initialUnits);
  const [lineItems, setLineItems] = useState(initialItems);
  const [filters, setFilters] = useState<BudgetFilters>({ areaId: 'all', scopeId: 'all', costType: 'all' });
  const [applyMarkupsToFilteredView, setApplyMarkupsToFilteredView] = useState(false);
  const [editingItem, setEditingItem] = useState<LineItem | undefined>();
  const [modalOpen, setModalOpen] = useState(false);

  const filteredItems = useMemo(() => filterLineItems(lineItems, filters), [lineItems, filters]);

  const summary = useMemo(
    () => summarizeBudget(lineItems, filteredItems, markups, applyMarkupsToFilteredView),
    [lineItems, filteredItems, markups, applyMarkupsToFilteredView],
  );

  const createReference = (
    listSetter: Dispatch<SetStateAction<ProjectReferenceRecord[]>>,
    name: string,
  ): Promise<ProjectReferenceRecord> => {
    const newRecord = { id: crypto.randomUUID(), projectId, name };
    listSetter((previous) => [...previous, newRecord]);
    return Promise.resolve(newRecord);
  };

  const openAddModal = () => {
    setEditingItem(undefined);
    setModalOpen(true);
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
      <section className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h1 className="text-xl font-semibold text-slate-900">Budget Builder</h1>
          <p className="text-sm text-slate-600">Build direct costs by line item and apply project-level markups in summary.</p>
        </div>

        <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-3">
          <CreateOptionSelect
            label="Areas"
            includeAll
            value={filters.areaId}
            options={areas}
            onChange={(next) => setFilters((previous) => ({ ...previous, areaId: next }))}
            onCreate={(name) => createReference(setAreas, name)}
          />
          <CreateOptionSelect
            label="Scopes"
            includeAll
            value={filters.scopeId}
            options={scopes}
            onChange={(next) => setFilters((previous) => ({ ...previous, scopeId: next }))}
            onCreate={(name) => createReference(setScopes, name)}
          />
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Cost Type</label>
            <select
              value={filters.costType}
              onChange={(event) => setFilters((previous) => ({ ...previous, costType: event.target.value as CostType | 'all' }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="labor">Labor</option>
              <option value="material">Material</option>
              <option value="sub">Subcontractor</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 p-4">
            <h2 className="font-medium text-slate-900">Line Items</h2>
            <button onClick={openAddModal} className="rounded bg-slate-900 px-3 py-2 text-sm text-white" type="button">
              Add line item
            </button>
          </div>
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Area</th>
                <th className="px-4 py-3">Scope</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Direct Cost</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{item.description}</div>
                    <div className="text-xs text-slate-600">
                      {item.costType === 'labor' ? `${item.hours ?? 0}h × ${usd.format(item.hourlyRate ?? 0)}` : null}
                      {item.costType === 'material'
                        ? `${item.qty ?? 0} × ${units.find((unit) => unit.id === item.unitId)?.name ?? 'unit'} × ${usd.format(item.unitCost ?? 0)}`
                        : null}
                      {item.costType === 'sub' ? `Allowance: ${usd.format(item.subAmount ?? 0)}` : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">{areas.find((area) => area.id === item.areaId)?.name ?? '—'}</td>
                  <td className="px-4 py-3">{scopes.find((scope) => scope.id === item.scopeId)?.name ?? '—'}</td>
                  <td className="px-4 py-3 capitalize">{item.costType}</td>
                  <td className="px-4 py-3 text-right font-medium">{usd.format(computeLineItemDirectCost(item))}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingItem(item);
                        setModalOpen(true);
                      }}
                      className="text-xs font-medium text-slate-700 underline"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    No line items match the current filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold text-slate-900">Summary</h2>
          <label className="mb-4 flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={applyMarkupsToFilteredView}
              onChange={(event) => setApplyMarkupsToFilteredView(event.target.checked)}
            />
            Apply markups to filtered view
          </label>

          <dl className="space-y-2 text-sm">
            <SummaryRow label="Direct Subtotal" value={summary.directSubtotal} />
            <SummaryRow label="Insurance" value={summary.insurance} />
            <SummaryRow label="OH&P" value={summary.ohp} />
            <SummaryRow label="Tax" value={summary.tax} />
            <SummaryRow label="Contingency" value={summary.contingency} />
            <SummaryRow label="Escalation" value={summary.escalation} />
            <SummaryRow label="Total Budget" value={summary.totalBudget} bold />
          </dl>
        </div>
      </aside>

      <LineItemModal
        open={modalOpen}
        title={editingItem ? 'Edit line item' : 'Add line item'}
        projectId={projectId}
        areas={areas}
        scopes={scopes}
        units={units}
        initialValue={editingItem}
        onClose={() => setModalOpen(false)}
        onSave={(saved) => {
          setLineItems((previous) => {
            const exists = previous.some((item) => item.id === saved.id);
            if (!exists) return [...previous, saved];
            return previous.map((item) => (item.id === saved.id ? saved : item));
          });
          setModalOpen(false);
        }}
        onCreateArea={(name) => createReference(setAreas, name)}
        onCreateScope={(name) => createReference(setScopes, name)}
        onCreateUnit={(name) => createReference(setUnits, name)}
      />
    </div>
  );
}

function SummaryRow({ label, value, bold = false }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? 'border-t border-slate-200 pt-2 font-semibold' : ''}`}>
      <dt className="text-slate-600">{label}</dt>
      <dd className="text-slate-900">{usd.format(value)}</dd>
    </div>
  );
}
