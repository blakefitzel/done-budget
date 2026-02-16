import { BudgetBuilder } from '@/components/projects/budget-builder';

export default function ProjectBudgetPage({ params }: { params: { id: string } }) {
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <BudgetBuilder projectId={params.id} />
      </div>
    </main>
  );
}
