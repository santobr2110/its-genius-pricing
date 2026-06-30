
CREATE TABLE public.approval_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.approval_roles TO authenticated;
GRANT ALL ON public.approval_roles TO service_role;
ALTER TABLE public.approval_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approval_roles_read" ON public.approval_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "approval_roles_admin_write" ON public.approval_roles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.approval_role_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.approval_roles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role_id, user_id)
);
GRANT SELECT ON public.approval_role_members TO authenticated;
GRANT ALL ON public.approval_role_members TO service_role;
ALTER TABLE public.approval_role_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approval_role_members_read" ON public.approval_role_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "approval_role_members_admin_write" ON public.approval_role_members FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.approval_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offering text NOT NULL,
  label text NOT NULL,
  min_pct numeric(6,2),
  max_pct numeric(6,2),
  mode text NOT NULL DEFAULT 'all' CHECK (mode IN ('all','any')),
  ativo boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.approval_tiers TO authenticated;
GRANT ALL ON public.approval_tiers TO service_role;
ALTER TABLE public.approval_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approval_tiers_read" ON public.approval_tiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "approval_tiers_admin_write" ON public.approval_tiers FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER tg_approval_tiers_touch BEFORE UPDATE ON public.approval_tiers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.approval_tier_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id uuid NOT NULL REFERENCES public.approval_tiers(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.approval_roles(id) ON DELETE CASCADE,
  UNIQUE(tier_id, role_id)
);
GRANT SELECT ON public.approval_tier_roles TO authenticated;
GRANT ALL ON public.approval_tier_roles TO service_role;
ALTER TABLE public.approval_tier_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approval_tier_roles_read" ON public.approval_tier_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "approval_tier_roles_admin_write" ON public.approval_tier_roles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_id uuid REFERENCES public.cotacoes(id) ON DELETE CASCADE,
  offering text NOT NULL,
  rentabilidade_pct numeric(6,2) NOT NULL,
  tier_id uuid REFERENCES public.approval_tiers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','not_required','canceled')),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.approval_requests TO authenticated;
GRANT ALL ON public.approval_requests TO service_role;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approval_requests_insert_own" ON public.approval_requests FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());
CREATE POLICY "approval_requests_update_own_or_admin" ON public.approval_requests FOR UPDATE TO authenticated
  USING (requester_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE TABLE public.approval_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.approval_requests(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.approval_roles(id),
  approver_user_id uuid NOT NULL REFERENCES auth.users(id),
  approver_email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  decision text NOT NULL DEFAULT 'pending' CHECK (decision IN ('pending','approved','rejected')),
  decided_at timestamptz,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX approval_decisions_request_idx ON public.approval_decisions(request_id);
GRANT SELECT ON public.approval_decisions TO authenticated;
GRANT ALL ON public.approval_decisions TO service_role;
ALTER TABLE public.approval_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approval_decisions_read" ON public.approval_decisions FOR SELECT TO authenticated
  USING (approver_user_id = auth.uid() OR public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.approval_requests r WHERE r.id = approval_decisions.request_id AND r.requester_id = auth.uid()));

-- Now add the request select policy that depends on decisions
CREATE POLICY "approval_requests_read_own_or_admin_or_approver" ON public.approval_requests FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.approval_decisions d WHERE d.request_id = approval_requests.id AND d.approver_user_id = auth.uid()));

-- Seed roles
INSERT INTO public.approval_roles (slug, label) VALUES
  ('gestor_comercial', 'Gestor Comercial'),
  ('diretor_bu', 'Diretor da BU'),
  ('diretor_crescimento', 'Diretor de Crescimento');

-- Seed default tiers for smart-ito
DO $$
DECLARE
  t1 uuid; t2 uuid;
  r_gestor uuid; r_dirbu uuid; r_dircresc uuid;
BEGIN
  SELECT id INTO r_gestor FROM public.approval_roles WHERE slug = 'gestor_comercial';
  SELECT id INTO r_dirbu FROM public.approval_roles WHERE slug = 'diretor_bu';
  SELECT id INTO r_dircresc FROM public.approval_roles WHERE slug = 'diretor_crescimento';

  INSERT INTO public.approval_tiers (offering, label, min_pct, max_pct, mode, sort_order)
  VALUES ('smart-ito', 'Rentabilidade 10% a 15%', 10, 15, 'all', 10)
  RETURNING id INTO t1;
  INSERT INTO public.approval_tier_roles (tier_id, role_id) VALUES (t1, r_gestor);

  INSERT INTO public.approval_tiers (offering, label, min_pct, max_pct, mode, sort_order)
  VALUES ('smart-ito', 'Rentabilidade abaixo de 10%', NULL, 10, 'all', 20)
  RETURNING id INTO t2;
  INSERT INTO public.approval_tier_roles (tier_id, role_id) VALUES (t2, r_dirbu), (t2, r_dircresc);
END $$;
