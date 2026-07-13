DROP POLICY IF EXISTS "Admins can update all cotacoes" ON public.cotacoes;
CREATE POLICY "Admins can update all cotacoes"
ON public.cotacoes
FOR UPDATE
TO authenticated
USING (app_private.is_admin(auth.uid()))
WITH CHECK (app_private.is_admin(auth.uid()));