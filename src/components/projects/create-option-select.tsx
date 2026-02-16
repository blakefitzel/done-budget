'use client';

import { useMemo, useState } from 'react';
import type { ProjectReferenceRecord } from '@/types/budget';

interface CreateOptionSelectProps {
  label: string;
  value: string | 'all' | '';
  options: ProjectReferenceRecord[];
  includeAll?: boolean;
  onChange: (next: string | 'all') => void;
  onCreate: (name: string) => Promise<ProjectReferenceRecord>;
}

export function CreateOptionSelect({
  label,
  value,
  options,
  includeAll = false,
  onChange,
  onCreate,
}: CreateOptionSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const sorted = useMemo(
    () => [...options].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name)),
    [options],
  );

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <select
        value={value}
        onChange={(event) => {
          const selected = event.target.value;
          if (selected === '__create__') {
            setIsOpen(true);
            return;
          }
          onChange(selected as string | 'all');
        }}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
      >
        {includeAll ? <option value="all">All</option> : null}
        <option value="">Select {label}</option>
        {sorted.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
        <option value="__create__">+ Add {label.slice(0, -1)}</option>
      </select>

      {isOpen ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-2">
            <input
              placeholder={`New ${label.slice(0, -1)} name`}
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
            />
            <button
              type="button"
              disabled={!draftName.trim() || isSaving}
              onClick={async () => {
                setIsSaving(true);
                try {
                  const created = await onCreate(draftName.trim());
                  onChange(created.id);
                  setDraftName('');
                  setIsOpen(false);
                } finally {
                  setIsSaving(false);
                }
              }}
              className="rounded bg-slate-900 px-3 py-1 text-sm text-white disabled:opacity-50"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setDraftName('');
              }}
              className="rounded border border-slate-300 px-3 py-1 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
