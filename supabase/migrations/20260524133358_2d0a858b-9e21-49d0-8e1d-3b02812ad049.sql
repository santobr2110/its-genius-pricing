
-- 1. Catálogo de Grupos e Ofertas
CREATE TABLE IF NOT EXISTS public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.offerings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, slug)
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offerings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS groups_select_auth ON public.groups;
CREATE POLICY groups_select_auth ON public.groups
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS offerings_select_auth ON public.offerings;
CREATE POLICY offerings_select_auth ON public.offerings
  FOR SELECT TO authenticated USING (true);

-- 2. Seed catálogo
INSERT INTO public.groups (slug, name, sort_order, status) VALUES
  ('ito',            'ITO',            10, 'active'),
  ('datacenter',     'Datacenter',     20, 'coming_soon'),
  ('cloud',          'Cloud',          30, 'coming_soon'),
  ('observabilidade','Observabilidade',40, 'coming_soon')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.offerings (group_id, slug, name, sort_order, status)
SELECT g.id, 'smart-ito', 'Smart ITO', 10, 'active'
FROM public.groups g WHERE g.slug = 'ito'
ON CONFLICT (group_id, slug) DO NOTHING;

-- 3. Colunas de isolamento por oferta
ALTER TABLE public.pricing_presets
  ADD COLUMN IF NOT EXISTS group_slug text NOT NULL DEFAULT 'ito',
  ADD COLUMN IF NOT EXISTS offering_slug text NOT NULL DEFAULT 'smart-ito';

ALTER TABLE public.parameter_profiles
  ADD COLUMN IF NOT EXISTS group_slug text NOT NULL DEFAULT 'ito',
  ADD COLUMN IF NOT EXISTS offering_slug text NOT NULL DEFAULT 'smart-ito';

CREATE INDEX IF NOT EXISTS pricing_presets_offering_idx
  ON public.pricing_presets (user_id, offering_slug);
CREATE INDEX IF NOT EXISTS parameter_profiles_offering_idx
  ON public.parameter_profiles (user_id, offering_slug);

-- 4. Backfill de permissões hierárquicas
-- Para cada role que já tenha QUALQUER permissão antiga da calculadora,
-- concede acesso ao Grupo ITO e à Oferta Smart ITO.
INSERT INTO public.role_permissions (role_id, permission_key, allowed)
SELECT DISTINCT rp.role_id, 'group.ito.access', true
FROM public.role_permissions rp
WHERE rp.allowed = true
ON CONFLICT (role_id, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_key, allowed)
SELECT DISTINCT rp.role_id, 'offering.ito.smart-ito.access', true
FROM public.role_permissions rp
WHERE rp.allowed = true
ON CONFLICT (role_id, permission_key) DO NOTHING;
