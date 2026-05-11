
-- 1. user_app_state: estado por usuário, chave -> JSON
create table public.user_app_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.user_app_state enable row level security;

create policy "uas_select_own" on public.user_app_state
  for select to authenticated using (user_id = auth.uid());
create policy "uas_insert_own" on public.user_app_state
  for insert to authenticated with check (user_id = auth.uid());
create policy "uas_update_own" on public.user_app_state
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "uas_delete_own" on public.user_app_state
  for delete to authenticated using (user_id = auth.uid());

-- 2. app_defaults: padrões compartilhados (admin/permissão)
create table public.app_defaults (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.app_defaults enable row level security;

create policy "ad_select_auth" on public.app_defaults
  for select to authenticated using (true);
create policy "ad_insert_perm" on public.app_defaults
  for insert to authenticated
  with check (public.has_permission(auth.uid(), 'params.save_defaults'));
create policy "ad_update_perm" on public.app_defaults
  for update to authenticated
  using (public.has_permission(auth.uid(), 'params.save_defaults'))
  with check (public.has_permission(auth.uid(), 'params.save_defaults'));
create policy "ad_delete_perm" on public.app_defaults
  for delete to authenticated
  using (public.has_permission(auth.uid(), 'params.save_defaults'));

-- 3. pricing_presets: precificações salvas por usuário
create table public.pricing_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pricing_presets_user_idx on public.pricing_presets(user_id, created_at desc);

alter table public.pricing_presets enable row level security;

create policy "pp_select_own" on public.pricing_presets
  for select to authenticated using (user_id = auth.uid());
create policy "pp_insert_own" on public.pricing_presets
  for insert to authenticated with check (user_id = auth.uid());
create policy "pp_update_own" on public.pricing_presets
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "pp_delete_own" on public.pricing_presets
  for delete to authenticated using (user_id = auth.uid());

-- trigger genérico para updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_uas_updated_at before update on public.user_app_state
  for each row execute function public.touch_updated_at();
create trigger trg_ad_updated_at before update on public.app_defaults
  for each row execute function public.touch_updated_at();
create trigger trg_pp_updated_at before update on public.pricing_presets
  for each row execute function public.touch_updated_at();
