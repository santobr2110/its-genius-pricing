
-- Enum for system role slugs
create type public.app_role as enum ('admin', 'arquiteto', 'gestor_operacao', 'custom');

-- Roles (profiles) table
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

-- Permissions assigned to roles
create table public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_key text not null,
  allowed boolean not null default true,
  unique (role_id, permission_key)
);

-- Profile per user
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now()
);

-- Many-to-one user -> role assignment (modelled as N:N for future)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, role_id)
);

-- Helper functions (SECURITY DEFINER to avoid recursive RLS)
create or replace function public.is_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = _user_id and r.slug = 'admin'
  )
$$;

create or replace function public.has_permission(_user_id uuid, _permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.is_admin(_user_id) then true
    else exists (
      select 1
      from public.user_roles ur
      join public.role_permissions rp on rp.role_id = ur.role_id
      where ur.user_id = _user_id
        and rp.permission_key = _permission_key
        and rp.allowed = true
    )
  end
$$;

-- Enable RLS
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

-- RLS: roles
create policy "roles_select_authenticated" on public.roles
  for select to authenticated using (true);
create policy "roles_admin_insert" on public.roles
  for insert to authenticated with check (public.is_admin(auth.uid()));
create policy "roles_admin_update" on public.roles
  for update to authenticated using (public.is_admin(auth.uid()) and is_system = false)
  with check (public.is_admin(auth.uid()) and is_system = false);
create policy "roles_admin_delete" on public.roles
  for delete to authenticated using (public.is_admin(auth.uid()) and is_system = false);

-- RLS: role_permissions
create policy "rp_select_authenticated" on public.role_permissions
  for select to authenticated using (true);
create policy "rp_admin_insert" on public.role_permissions
  for insert to authenticated with check (
    public.is_admin(auth.uid())
    and not exists (select 1 from public.roles r where r.id = role_id and r.slug = 'admin')
  );
create policy "rp_admin_update" on public.role_permissions
  for update to authenticated using (
    public.is_admin(auth.uid())
    and not exists (select 1 from public.roles r where r.id = role_id and r.slug = 'admin')
  );
create policy "rp_admin_delete" on public.role_permissions
  for delete to authenticated using (
    public.is_admin(auth.uid())
    and not exists (select 1 from public.roles r where r.id = role_id and r.slug = 'admin')
  );

-- RLS: profiles
create policy "profiles_select_self_or_admin" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin(auth.uid()));
create policy "profiles_update_self_or_admin" on public.profiles
  for update to authenticated using (id = auth.uid() or public.is_admin(auth.uid()));
create policy "profiles_admin_delete" on public.profiles
  for delete to authenticated using (public.is_admin(auth.uid()));
create policy "profiles_insert_self_or_admin" on public.profiles
  for insert to authenticated with check (id = auth.uid() or public.is_admin(auth.uid()));

-- RLS: user_roles
create policy "ur_select_self_or_admin" on public.user_roles
  for select to authenticated using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "ur_admin_insert" on public.user_roles
  for insert to authenticated with check (public.is_admin(auth.uid()));
create policy "ur_admin_update" on public.user_roles
  for update to authenticated using (public.is_admin(auth.uid()));
create policy "ur_admin_delete" on public.user_roles
  for delete to authenticated using (public.is_admin(auth.uid()));

-- Trigger to create profile (and make first user admin)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first boolean;
  admin_role_id uuid;
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', new.email));

  select count(*) = 1 into is_first from auth.users;

  if is_first then
    select id into admin_role_id from public.roles where slug = 'admin' limit 1;
    if admin_role_id is not null then
      insert into public.user_roles (user_id, role_id) values (new.id, admin_role_id);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Seed system roles
insert into public.roles (slug, name, description, is_system) values
  ('admin', 'Administrador', 'Acesso total ao sistema', true),
  ('arquiteto', 'Arquiteto', 'Perfil sem permissões iniciais', false),
  ('gestor_operacao', 'Gestor de Operação', 'Perfil sem permissões iniciais', false);
