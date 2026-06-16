-- 1) Add source profile reference to app_defaults
ALTER TABLE public.app_defaults
  ADD COLUMN IF NOT EXISTS source_profile_id uuid REFERENCES public.parameter_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_profile_name text;

-- 2) Singleton-per-offering table: which profile is the active "default"
CREATE TABLE IF NOT EXISTS public.app_default_profile (
  offering_slug text PRIMARY KEY,
  profile_id uuid REFERENCES public.parameter_profiles(id) ON DELETE SET NULL,
  profile_name text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  applied_by uuid
);

GRANT SELECT ON public.app_default_profile TO authenticated;
GRANT ALL ON public.app_default_profile TO service_role;

ALTER TABLE public.app_default_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone authenticated can read default profile"
  ON public.app_default_profile FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "only admins can insert default profile"
  ON public.app_default_profile FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "only admins can update default profile"
  ON public.app_default_profile FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "only admins can delete default profile"
  ON public.app_default_profile FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));