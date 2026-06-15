-- 1) app_defaults_history: deny direct INSERT/UPDATE from clients.
-- Writes happen via SECURITY DEFINER trigger app_defaults_snapshot, which bypasses RLS.
DROP POLICY IF EXISTS "Deny direct inserts on app_defaults_history" ON public.app_defaults_history;
CREATE POLICY "Deny direct inserts on app_defaults_history"
  ON public.app_defaults_history
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (false);

DROP POLICY IF EXISTS "Deny direct updates on app_defaults_history" ON public.app_defaults_history;
CREATE POLICY "Deny direct updates on app_defaults_history"
  ON public.app_defaults_history
  FOR UPDATE
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);

-- 2) cotacoes: admins can view and update all quotes (mirrors pricing_presets pattern).
DROP POLICY IF EXISTS "Admins can view all cotacoes" ON public.cotacoes;
CREATE POLICY "Admins can view all cotacoes"
  ON public.cotacoes
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all cotacoes" ON public.cotacoes;
CREATE POLICY "Admins can update all cotacoes"
  ON public.cotacoes
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
