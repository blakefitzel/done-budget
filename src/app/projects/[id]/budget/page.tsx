import { BudgetBuilder } from '@/components/projects/budget-builder';
import type { ProjectMarkups } from '@/types/budget';

const defaultMarkups: ProjectMarkups = {
  insurance: { mode: 'percent', value: 2 },
  ohp: { mode: 'percent', value: 10 },
  tax: { mode: 'percent', value: 8.25 },
  contingency: { mode: 'percent', value: 5 },
  escalation: { mode: 'fixed', value: 1000 },
};

export default function ProjectBudgetPage({ params }: { params: { id: string } }) {
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <BudgetBuilder
          projectId={params.id}
          markups={defaultMarkups}
          initialAreas={[
            { id: 'a-1', name: 'Building Exterior', sortOrder: 1 },
            { id: 'a-2', name: 'Interior', sortOrder: 2 },
          ]}
          initialScopes={[
            { id: 's-1', name: 'Demolition', sortOrder: 1 },
            { id: 's-2', name: 'Framing', sortOrder: 2 },
          ]}
          initialUnits={[
            { id: 'u-1', name: 'ea' },
            { id: 'u-2', name: 'lf' },
            { id: 'u-3', name: 'sf' },
          ]}
          initialItems={[
            {
              id: 'li-1',
              projectId: params.id,
              areaId: 'a-1',
              scopeId: 's-1',
              costType: 'labor',
              description: 'Crew demo and haul-off',
              hours: 40,
              hourlyRate: 55,
            },
            {
              id: 'li-2',
              projectId: params.id,
              areaId: 'a-2',
              scopeId: 's-2',
              costType: 'material',
              description: '2x4 lumber package',
              qty: 220,
              unitId: 'u-2',
              unitCost: 3.25,
            },
            {
              id: 'li-3',
              projectId: params.id,
              areaId: 'a-2',
              scopeId: 's-2',
              costType: 'sub',
              description: 'Electrical subcontract allowance',
              subAmount: 15000,
            },
          ]}
        />
      </div>
    </main>
  );
}
