DROP POLICY IF EXISTS "Admins can view all cotacoes" ON public.cotacoes;
CREATE POLICY "Admins can view all cotacoes"
  ON public.cotacoes
  FOR SELECT
  TO authenticated
  USING (app_private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all cotacoes" ON public.cotacoes;
CREATE POLICY "Admins can update all cotacoes"
  ON public.cotacoes
  FOR UPDATE
  TO authenticated
  USING (app_private.is_admin(auth.uid()))
  WITH CHECK (
    app_private.is_admin(auth.uid())
    AND user_id = (SELECT c.user_id FROM public.cotacoes c WHERE c.id = cotacoes.id)
  );