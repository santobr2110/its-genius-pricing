
-- 1. Hide token_hash from client roles on approval_decisions (service_role still reads it in edge functions)
REVOKE SELECT ON public.approval_decisions FROM authenticated;
GRANT SELECT (id, request_id, role_id, approver_user_id, approver_email, decision, comment, decided_at, created_at)
  ON public.approval_decisions TO authenticated;

-- 2. Restrict role_permissions read to permissions tied to caller's own role(s)
DROP POLICY IF EXISTS rp_select_roled ON public.role_permissions;
CREATE POLICY rp_select_own_roles ON public.role_permissions
FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role_id = role_permissions.role_id
  )
);
