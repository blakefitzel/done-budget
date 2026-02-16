'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { computeLineItemDirectCost, filterLineItems, summarizeBudget } from '@/lib/budget';
import { supabase } from '@/lib/supabase';
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
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const defaultMarkups: ProjectMarkups = {
  insurance: { mode: 'percent', value: 0 },
  ohp: { mode: 'percent', value: 0 },
  tax: { mode: 'percent', value: 0 },
  contingency: { mode: 'percent', value: 0 },
  escalation: { mode: 'percent', value: 0 },
};

const toNumber = (value: number | string | null | undefined): number => (value == null ? 0 : Number(value));

export function BudgetBuilder({ projectId }: BudgetBuilderProps) {
  const [areas, setAreas] = useState<ProjectReferenceRecord[]>([]);
  const [scopes, setScopes] = useState<ProjectReferenceRecord[]>([]);
  const [units, setUnits] = useState<ProjectReferenceRecord[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [markups, setMarkups] = useState<ProjectMarkups>(defaultMarkups);
  const [filters, setFilters] = useState<BudgetFilters>({ areaId: 'all', scopeId: 'all', costType: 'all' });
  const [applyMarkupsToFilteredView, setApplyMarkupsToFilteredView] = useState(false);
  const [editingItem, setEditingItem] = useState<LineItem | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      const [projectResult, areasResult, scopesResult, unitsResult, itemsResult] = await Promise.all([
        supabase
          .from('projects')
          .select(
            'tax_mode,tax_value,ohp_mode,ohp_value,insurance_mode,insurance_value,contingency_mode,contingency_value,escalation_mode,escalation_value',
          )
          .eq('id', projectId)
          .single(),
        supabase.from('project_areas').select('id,project_id,name,sort_order').eq('project_id', projectId).order('sort_order'),
        supabase.from('project_scopes').select('id,project_id,name,sort_order').eq('project_id', projectId).order('sort_order'),
        supabase.from('project_units').select('id,project_id,name').eq('project_id', projectId).order('name'),
        supabase
          .from('line_items')
          .select(
            'id,project_id,area_id,scope_id,cost_type,description,vendor,material,qty,unit_id,unit_cost,hours,hourly_rate,sub_amount,notes',
          )
          .eq('project_id', projectId)
          .order('created_at'),
      ]);

      const firstError =
        projectResult.error ??
        areasResult.error ??
        scopesResult.error ??
        unitsResult.error ??
        itemsResult.error;

      if (firstError) {
        setError(firstError.message);
        setLoading(false);
        return;
      }

      const project = projectResult.data;
      setMarkups({
        tax: { mode: project.tax_mode, value: toNumber(project.tax_value) },
        ohp: { mode: project.ohp_mode, value: toNumber(project.ohp_value) },
        insurance: { mode: project.insurance_mode, value: toNumber(project.insurance_value) },
        contingency: { mode: project.contingency_mode, value: toNumber(project.contingency_value) },
        escalation: { mode: project.escalation_mode, value: toNumber(project.escalation_value) },
      });

      setAreas(
        (areasResult.data ?? []).map((record) => ({
          id: record.id,
          projectId: record.project_id,
          name: record.name,
          sortOrder: record.sort_order,
        })),
      );
      setScopes(
        (scopesResult.data ?? []).map((record) => ({
          id: record.id,
          projectId: record.project_id,
          name: record.name,
          sortOrder: record.sort_order,
        })),
      );
      setUnits(
        (unitsResult.data ?? []).map((record) => ({
          id: record.id,
          projectId: record.project_id,
          name: record.name,
        })),
      );
      setLineItems(
        (itemsResult.data ?? []).map((item) => ({
          id: item.id,
          projectId: item.project_id,
          areaId: item.area_id,
          scopeId: item.scope_id,
          costType: item.cost_type,
          description: item.description,
          vendor: item.vendor ?? undefined,
          material: item.material ?? undefined,
          qty: toNumber(item.qty),
          unitId: item.unit_id,
          unitCost: toNumber(item.unit_cost),
          hours: toNumber(item.hours),
          hourlyRate: toNumber(item.hourly_rate),
          subAmount: toNumber(item.sub_amount),
          notes: item.notes ?? undefined,
        })),
      );

      setLoading(false);
    };

    load();
  }, [projectId]);

  const filteredItems = useMemo(() => filterLineItems(lineItems, filters), [lineItems, filters]);

  const summary = useMemo(
    () => summarizeBudget(lineItems, filteredItems, markups, applyMarkupsToFilteredView),
    [lineItems, filteredItems, markups, applyMarkupsToFilteredView],
  );

  const createReference = async (
    table: 'project_areas' | 'project_scopes' | 'project_units',
    listSetter: Dispatch<SetStateAction<ProjectReferenceRecord[]>>,
    name: string,
  ): Promise<ProjectReferenceRecord> => {
    const payload = table === 'project_units' ? { project_id: projectId, name } : { project_id: projectId, name, sort_order: 0 };

    const { data, error: createError } = await supabase
      .from(table)
      .insert(payload)
      .select('id,project_id,name,sort_order')
      .single();

    if (createError) {
      throw new Error(createError.message);
    }

    const newRecord: ProjectReferenceRecord = {
      id: data.id,
      projectId: data.project_id,
      name: data.name,
      sortOrder: data.sort_order,
    };
    listSetter((previous) => [...previous, newRecord]);
    return newRecord;
  };

  const openAddModal = () => {
    setEditingItem(undefined);
    setModalOpen(true);
  };

  const saveLineItem = async (saved: LineItem) => {
    const payload = {
      id: saved.id,
      project_id: projectId,
      area_id: saved.areaId ?? null,
      scope_id: saved.scopeId ?? null,
      cost_type: saved.costType,
      description: saved.description,
      vendor: saved.vendor ?? null,
      material: saved.material ?? null,
      qty: saved.qty ?? null,
      unit_id: saved.unitId ?? null,
      unit_cost: saved.unitCost ?? null,
      hours: saved.hours ?? null,
      hourly_rate: saved.hourlyRate ?? null,
      sub_amount: saved.subAmount ?? null,
      notes: saved.notes ?? null,
    };

    const { error: saveError } = await supabase.from('line_items').upsert(payload, { onConflict: 'id' });

    if (saveError) {
      setError(saveError.message);
      return;
    }

    setLineItems((previous) => {
      const exists = previous.some((item) => item.id === saved.id);
      if (!exists) return [...previous, saved];
      return previous.map((item) => (item.id === saved.id ? saved : item));
    });
    setModalOpen(false);
  };

  const deleteLineItem = async (id: string) => {
    const { error: deleteError } = await supabase.from('line_items').delete().eq('id', id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setLineItems((previous) => previous.filter((item) => item.id !== id));
  };

  if (loading) {
    return <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading budget…</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
      <section className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h1 className="text-xl font-semibold text-slate-900">Budget Builder</h1>
          <p className="text-sm text-slate-600">Build direct costs by line item and apply project-level markups in summary.</p>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-3">
          <CreateOptionSelect
            label="Areas"
            includeAll
            value={filters.areaId}
            options={areas}
            onChange={(next) => setFilters((previous) => ({ ...previous, areaId: next }))}
            onCreate={(name) => createReference('project_areas', setAreas, name)}
          />
          <CreateOptionSelect
            label="Scopes"
            includeAll
            value={filters.scopeId}
            options={scopes}
            onChange={(next) => setFilters((previous) => ({ ...previous, scopeId: next }))}
            onCreate={(name) => createReference('project_scopes', setScopes, name)}
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
                    <div className="flex justify-end gap-2">
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
                      <button
                        type="button"
                        onClick={() => deleteLineItem(item.id)}
                        className="text-xs font-medium text-red-700 underline"
                      >
                        Delete
                      </button>
                    </div>
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
        onSave={saveLineItem}
        onCreateArea={(name) => createReference('project_areas', setAreas, name)}
        onCreateScope={(name) => createReference('project_scopes', setScopes, name)}
        onCreateUnit={(name) => createReference('project_units', setUnits, name)}
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
