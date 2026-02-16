'use client';

import { useEffect, useState } from 'react';
import type { CostType, LineItem, ProjectReferenceRecord } from '@/types/budget';
import { CreateOptionSelect } from '@/components/projects/create-option-select';

interface LineItemModalProps {
  open: boolean;
  title: string;
  projectId: string;
  areas: ProjectReferenceRecord[];
  scopes: ProjectReferenceRecord[];
  units: ProjectReferenceRecord[];
  initialValue?: LineItem;
  onClose: () => void;
  onSave: (lineItem: LineItem) => Promise<void> | void;
  onCreateArea: (name: string) => Promise<ProjectReferenceRecord>;
  onCreateScope: (name: string) => Promise<ProjectReferenceRecord>;
  onCreateUnit: (name: string) => Promise<ProjectReferenceRecord>;
}

const emptyLineItem = (projectId: string): LineItem => ({
  id: crypto.randomUUID(),
  projectId,
  costType: 'labor',
  description: '',
});

export function LineItemModal({
  open,
  title,
  projectId,
  areas,
  scopes,
  units,
  initialValue,
  onClose,
  onSave,
  onCreateArea,
  onCreateScope,
  onCreateUnit,
}: LineItemModalProps) {
  const [draft, setDraft] = useState<LineItem>(emptyLineItem(projectId));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(initialValue ? { ...initialValue } : emptyLineItem(projectId));
  }, [initialValue, open, projectId]);

  if (!open) return null;

  const update = <K extends keyof LineItem>(key: K, value: LineItem[K]) => {
    setDraft((previous) => ({ ...previous, [key]: value }));
  };

  const costType = draft.costType as CostType;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} className="text-sm text-slate-600">
            Close
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Description</label>
            <input
              value={draft.description}
              onChange={(event) => update('description', event.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <CreateOptionSelect
            label="Areas"
            value={draft.areaId ?? ''}
            options={areas}
            onChange={(next) => update('areaId', next === 'all' ? null : next)}
            onCreate={onCreateArea}
          />

          <CreateOptionSelect
            label="Scopes"
            value={draft.scopeId ?? ''}
            options={scopes}
            onChange={(next) => update('scopeId', next === 'all' ? null : next)}
            onCreate={onCreateScope}
          />

          <div>
            <label className="text-sm font-medium text-slate-700">Cost Type</label>
            <select
              value={costType}
              onChange={(event) => update('costType', event.target.value as CostType)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="labor">Labor</option>
              <option value="material">Material</option>
              <option value="sub">Subcontractor</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Vendor</label>
            <input
              value={draft.vendor ?? ''}
              onChange={(event) => update('vendor', event.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          {costType === 'labor' ? (
            <>
              <div>
                <label className="text-sm font-medium text-slate-700">Hours</label>
                <input
                  type="number"
                  value={draft.hours ?? ''}
                  onChange={(event) => update('hours', Number(event.target.value || 0))}
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Hourly Rate</label>
                <input
                  type="number"
                  value={draft.hourlyRate ?? ''}
                  onChange={(event) => update('hourlyRate', Number(event.target.value || 0))}
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </>
          ) : null}

          {costType === 'material' ? (
            <>
              <div>
                <label className="text-sm font-medium text-slate-700">Material</label>
                <input
                  value={draft.material ?? ''}
                  onChange={(event) => update('material', event.target.value)}
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Qty</label>
                <input
                  type="number"
                  value={draft.qty ?? ''}
                  onChange={(event) => update('qty', Number(event.target.value || 0))}
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <CreateOptionSelect
                label="Units"
                value={draft.unitId ?? ''}
                options={units}
                onChange={(next) => update('unitId', next === 'all' ? null : next)}
                onCreate={onCreateUnit}
              />
              <div>
                <label className="text-sm font-medium text-slate-700">Unit Cost</label>
                <input
                  type="number"
                  value={draft.unitCost ?? ''}
                  onChange={(event) => update('unitCost', Number(event.target.value || 0))}
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </>
          ) : null}

          {costType === 'sub' ? (
            <div>
              <label className="text-sm font-medium text-slate-700">Sub Amount</label>
              <input
                type="number"
                value={draft.subAmount ?? ''}
                onChange={(event) => update('subAmount', Number(event.target.value || 0))}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          ) : null}

          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Notes</label>
            <textarea
              value={draft.notes ?? ''}
              onChange={(event) => update('notes', event.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-slate-300 px-3 py-2 text-sm" disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            onClick={async () => {
              setSaving(true);
              await onSave(draft);
              setSaving(false);
            }}
            className="rounded bg-slate-900 px-4 py-2 text-sm text-white"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Line Item'}
          </button>
        </div>
      </div>
    </div>
  );
}
