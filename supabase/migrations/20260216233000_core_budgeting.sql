-- Core budgeting schema
create extension if not exists "pgcrypto";

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  tax_mode text not null default 'percent' check (tax_mode in ('percent', 'fixed')),
  tax_value numeric(12,2) not null default 0,
  ohp_mode text not null default 'percent' check (ohp_mode in ('percent', 'fixed')),
  ohp_value numeric(12,2) not null default 0,
  insurance_mode text not null default 'percent' check (insurance_mode in ('percent', 'fixed')),
  insurance_value numeric(12,2) not null default 0,
  contingency_mode text not null default 'percent' check (contingency_mode in ('percent', 'fixed')),
  contingency_value numeric(12,2) not null default 0,
  escalation_mode text not null default 'percent' check (escalation_mode in ('percent', 'fixed')),
  escalation_value numeric(12,2) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.project_areas (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique (project_id, name)
);

create table if not exists public.project_scopes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique (project_id, name)
);

create table if not exists public.project_units (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (project_id, name)
);

do $$
begin
  if not exists (select 1 from pg_type where typname = 'line_item_cost_type') then
    create type public.line_item_cost_type as enum ('labor', 'material', 'sub');
  end if;
end
$$;

create table if not exists public.line_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  area_id uuid references public.project_areas(id) on delete set null,
  scope_id uuid references public.project_scopes(id) on delete set null,
  cost_type public.line_item_cost_type not null,
  description text not null,
  vendor text,
  material text,
  qty numeric(12,3),
  unit_id uuid references public.project_units(id) on delete set null,
  unit_cost numeric(12,2),
  hours numeric(12,2),
  hourly_rate numeric(12,2),
  sub_amount numeric(12,2),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists line_items_project_id_idx on public.line_items(project_id);
create index if not exists line_items_area_id_idx on public.line_items(area_id);
create index if not exists line_items_scope_id_idx on public.line_items(scope_id);
create index if not exists line_items_cost_type_idx on public.line_items(cost_type);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

create trigger projects_set_updated_at
before update on public.projects
for each row execute procedure public.set_updated_at();

create trigger line_items_set_updated_at
before update on public.line_items
for each row execute procedure public.set_updated_at();
