-- ═══════════════════════════════════════════════════════════
--  Amma Cheti Ruchulu — Supabase Setup
--  Run this ONCE in: Supabase → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════

-- 1. Create the app_data table
create table if not exists public.app_data (
  key        text        primary key,
  value      jsonb       not null default '{}',
  updated_at timestamptz not null default now()
);

-- 2. Auto-update the timestamp on every change
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_data_updated_at on public.app_data;
create trigger app_data_updated_at
  before update on public.app_data
  for each row execute procedure public.set_updated_at();

-- 3. Enable Row Level Security
alter table public.app_data enable row level security;

-- 4. Allow full access via the anon (public) key
--    (the app handles its own PIN-based login)
drop policy if exists "anon_all" on public.app_data;
create policy "anon_all" on public.app_data
  for all
  to anon
  using (true)
  with check (true);
