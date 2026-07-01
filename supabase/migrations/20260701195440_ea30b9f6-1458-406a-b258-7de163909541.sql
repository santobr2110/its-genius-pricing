CREATE POLICY approval_decisions_admin_insert
  ON public.approval_decisions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY approval_decisions_admin_delete
  ON public.approval_decisions
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));