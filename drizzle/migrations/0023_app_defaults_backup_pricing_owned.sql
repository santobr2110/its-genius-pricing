CREATE TABLE public.app_defaults_backup_pricing_owned (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz,
  updated_by uuid,
  source_profile_id uuid,
  source_profile_name text,
  backed_up_at timestamptz NOT NULL DEFAULT now(),
  motivo text NOT NULL DEFAULT 'Remoção de chaves da cotação do padrão global'
);
GRANT SELECT ON public.app_defaults_backup_pricing_owned TO authenticated;
GRANT ALL ON public.app_defaults_backup_pricing_owned TO service_role;
ALTER TABLE public.app_defaults_backup_pricing_owned ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins leem backup" ON public.app_defaults_backup_pricing_owned FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));