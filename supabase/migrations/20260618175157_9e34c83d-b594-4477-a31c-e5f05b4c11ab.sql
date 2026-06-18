-- 1) app_defaults_history: convert deny policies to RESTRICTIVE
DROP POLICY IF EXISTS "Deny direct inserts on app_defaults_history" ON public.app_defaults_history;
DROP POLICY IF EXISTS "Deny direct updates on app_defaults_history" ON public.app_defaults_history;

CREATE POLICY "Deny direct inserts on app_defaults_history"
  ON public.app_defaults_history
  AS RESTRICTIVE
  FOR INSERT
  TO public
  WITH CHECK (false);

CREATE POLICY "Deny direct updates on app_defaults_history"
  ON public.app_defaults_history
  AS RESTRICTIVE
  FOR UPDATE
  TO public
  USING (false)
  WITH CHECK (false);

-- 2) cotacoes: prevent admins from reassigning user_id when updating
DROP POLICY IF EXISTS "Admins can update all cotacoes" ON public.cotacoes;

CREATE POLICY "Admins can update all cotacoes"
  ON public.cotacoes
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (
    public.is_admin(auth.uid())
    AND user_id = (SELECT c.user_id FROM public.cotacoes c WHERE c.id = cotacoes.id)
  );
