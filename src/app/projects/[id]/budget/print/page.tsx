import { computeLineItemDirectCost, filterLineItems, groupLineItemsByAreaAndScope, summarizeBudget } from '@/lib/budget';
import { supabase } from '@/lib/supabase';
import type { BudgetFilters, CostType, LineItem, ProjectMarkups, ProjectReferenceRecord } from '@/types/budget';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const toNumber = (value: number | string | null | undefined): number => (value == null ? 0 : Number(value));

interface PrintPageProps {
  params: { id: string };
  searchParams: {
    areaId?: string;
    scopeId?: string;
    costType?: CostType | 'all';
    hideUnitPricing?: string;
    applyMarkupsToFilteredView?: string;
  };
}

export default async function ProjectBudgetPrintPage({ params, searchParams }: PrintPageProps) {
  const projectId = params.id;

  const [projectResult, areasResult, scopesResult, unitsResult, itemsResult] = await Promise.all([
    supabase
      .from('projects')
      .select(
        'id,name,location,tax_mode,tax_value,ohp_mode,ohp_value,insurance_mode,insurance_value,contingency_mode,contingency_value,escalation_mode,escalation_value',
      )
      .eq('id', projectId)
      .single(),
    supabase.from('project_areas').select('id,project_id,name,sort_order').eq('project_id', projectId).order('sort_order'),
    supabase.from('project_scopes').select('id,project_id,name,sort_order').eq('project_id', projectId).order('sort_order'),
    supabase.from('project_units').select('id,project_id,name').eq('project_id', projectId).order('name'),
    supabase
      .from('line_items')
      .select('id,project_id,area_id,scope_id,cost_type,description,vendor,material,qty,unit_id,unit_cost,hours,hourly_rate,sub_amount,notes')
      .eq('project_id', projectId)
      .order('created_at'),
  ]);

  const firstError = projectResult.error ?? areasResult.error ?? scopesResult.error ?? unitsResult.error ?? itemsResult.error;

  if (firstError || !projectResult.data) {
    return (
      <main className="p-8 text-sm text-red-600">
        Unable to load proposal print view.
        <br />
        {firstError?.message}
      </main>
    );
  }

  const project = projectResult.data;
  const areas: ProjectReferenceRecord[] = (areasResult.data ?? []).map((record) => ({
    id: record.id,
    projectId: record.project_id,
    name: record.name,
    sortOrder: record.sort_order,
  }));
  const scopes: ProjectReferenceRecord[] = (scopesResult.data ?? []).map((record) => ({
    id: record.id,
    projectId: record.project_id,
    name: record.name,
    sortOrder: record.sort_order,
  }));
  const units = (unitsResult.data ?? []).map((record) => ({ id: record.id, name: record.name }));
  const unitNameById = new Map(units.map((unit) => [unit.id, unit.name]));

  const lineItems: LineItem[] = (itemsResult.data ?? []).map((item) => ({
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
  }));

  const markups: ProjectMarkups = {
    tax: { mode: project.tax_mode, value: toNumber(project.tax_value) },
    ohp: { mode: project.ohp_mode, value: toNumber(project.ohp_value) },
    insurance: { mode: project.insurance_mode, value: toNumber(project.insurance_value) },
    contingency: { mode: project.contingency_mode, value: toNumber(project.contingency_value) },
    escalation: { mode: project.escalation_mode, value: toNumber(project.escalation_value) },
  };

  const filters: BudgetFilters = {
    areaId: searchParams.areaId ?? 'all',
    scopeId: searchParams.scopeId ?? 'all',
    costType: (searchParams.costType as BudgetFilters['costType']) ?? 'all',
  };

  const filteredItems = filterLineItems(lineItems, filters);
  const applyMarkupsToFilteredView = searchParams.applyMarkupsToFilteredView === 'true';
  const hideUnitPricing = searchParams.hideUnitPricing === 'true';

  const summary = summarizeBudget(lineItems, filteredItems, markups, applyMarkupsToFilteredView);
  const grouped = groupLineItemsByAreaAndScope(filteredItems, areas, scopes);

  return (
    <main className="proposal-page bg-white px-10 py-8 text-slate-900">
      <header className="mb-8 flex items-start justify-between border-b border-slate-300 pb-4">
        <div>
          <h1 className="text-3xl font-semibold">Proposal</h1>
          <p className="mt-1 text-sm text-slate-600">Done Budget — Client Cost Proposal</p>
        </div>
        <div className="logo-placeholder flex h-16 w-40 items-center justify-center rounded border border-dashed border-slate-400 text-xs text-slate-500">
          Logo Placeholder
        </div>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Project</p>
          <p className="text-lg font-semibold">{project.name}</p>
          {project.location ? <p className="text-slate-600">{project.location}</p> : null}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Filters Applied</p>
          <p>Area: {filters.areaId === 'all' ? 'All' : areas.find((area) => area.id === filters.areaId)?.name ?? 'Unknown'}</p>
          <p>Scope: {filters.scopeId === 'all' ? 'All' : scopes.find((scope) => scope.id === filters.scopeId)?.name ?? 'Unknown'}</p>
          <p>Cost Type: {filters.costType === 'all' ? 'All' : filters.costType}</p>
        </div>
      </section>

      <section className="space-y-4">
        {grouped.map((areaGroup) => (
          <article key={areaGroup.areaId} className="rounded border border-slate-300">
            <div className="flex items-center justify-between bg-slate-100 px-4 py-2">
              <h2 className="font-semibold">{areaGroup.areaName}</h2>
              <p className="font-semibold">{usd.format(areaGroup.areaSubtotal)}</p>
            </div>

            {areaGroup.scopes.map((scopeGroup) => (
              <div key={`${areaGroup.areaId}-${scopeGroup.scopeId}`} className="border-t border-slate-200 px-4 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-medium text-slate-700">{scopeGroup.scopeName}</h3>
                  <span className="font-medium text-slate-700">{usd.format(scopeGroup.scopeSubtotal)}</span>
                </div>
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="py-1">Description</th>
                      <th className="py-1">Type</th>
                      {!hideUnitPricing ? <th className="py-1">Unit Pricing</th> : null}
                      <th className="py-1 text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scopeGroup.items.map((item) => (
                      <tr key={item.id} className="border-t border-slate-100">
                        <td className="py-2">{item.description}</td>
                        <td className="py-2 capitalize">{item.costType}</td>
                        {!hideUnitPricing ? (
                          <td className="py-2 text-slate-600">
                            {item.costType === 'labor' ? `${item.hours ?? 0}h × ${usd.format(item.hourlyRate ?? 0)}` : null}
                            {item.costType === 'material'
                              ? `${item.qty ?? 0} × ${unitNameById.get(item.unitId ?? '') ?? 'unit'} × ${usd.format(item.unitCost ?? 0)}`
                              : null}
                            {item.costType === 'sub' ? `Allowance: ${usd.format(item.subAmount ?? 0)}` : null}
                          </td>
                        ) : null}
                        <td className="py-2 text-right font-medium">{usd.format(computeLineItemDirectCost(item))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </article>
        ))}
      </section>

      <section className="mt-8 ml-auto w-full max-w-md rounded border border-slate-300 p-4">
        <h2 className="mb-2 text-lg font-semibold">Markup Summary</h2>
        <dl className="space-y-1 text-sm">
          <SummaryRow label="Direct Subtotal" value={summary.directSubtotal} />
          <SummaryRow label="Insurance" value={summary.insurance} />
          <SummaryRow label="OH&P" value={summary.ohp} />
          <SummaryRow label="Tax" value={summary.tax} />
          <SummaryRow label="Contingency" value={summary.contingency} />
          <SummaryRow label="Escalation" value={summary.escalation} />
          <SummaryRow label="Grand Total" value={summary.totalBudget} bold />
        </dl>
      </section>

      <style>{`
        @media print {
          .proposal-page {
            padding: 0.5in;
            color: #0f172a;
          }

          @page {
            size: Letter;
            margin: 0.5in;
          }

          .logo-placeholder {
            border-style: solid;
          }
        }
      `}</style>
    </main>
  );
}

function SummaryRow({ label, value, bold = false }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? 'border-t border-slate-300 pt-2 font-semibold' : ''}`}>
      <dt className="text-slate-600">{label}</dt>
      <dd>{usd.format(value)}</dd>
    </div>
  );
}
