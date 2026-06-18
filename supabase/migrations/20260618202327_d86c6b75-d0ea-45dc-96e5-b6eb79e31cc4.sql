-- 1) app_default_profile: switch write policies to app_private.is_admin
DROP POLICY IF EXISTS "only admins can insert default profile" ON public.app_default_profile;
CREATE POLICY "only admins can insert default profile"
  ON public.app_default_profile
  FOR INSERT
  TO authenticated
  WITH CHECK (app_private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "only admins can update default profile" ON public.app_default_profile;
CREATE POLICY "only admins can update default profile"
  ON public.app_default_profile
  FOR UPDATE
  TO authenticated
  USING (app_private.is_admin(auth.uid()))
  WITH CHECK (app_private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "only admins can delete default profile" ON public.app_default_profile;
CREATE POLICY "only admins can delete default profile"
  ON public.app_default_profile
  FOR DELETE
  TO authenticated
  USING (app_private.is_admin(auth.uid()));

-- 2) app_defaults_history: restrict SELECT to admins only
DROP POLICY IF EXISTS "adh_select_roled" ON public.app_defaults_history;
CREATE POLICY "adh_admin_select"
  ON public.app_defaults_history
  FOR SELECT
  TO authenticated
  USING (app_private.is_admin(auth.uid()));