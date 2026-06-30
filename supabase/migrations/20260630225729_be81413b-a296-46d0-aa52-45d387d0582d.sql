
-- Fix 1: token_hash on approval_decisions must not be readable by clients.
-- Revoke table-level SELECT from authenticated/anon and re-grant column-level
-- SELECT on every column EXCEPT token_hash. Service role keeps full access
-- via the existing GRANT ALL.
REVOKE SELECT ON public.approval_decisions FROM authenticated;
REVOKE SELECT ON public.approval_decisions FROM anon;
GRANT SELECT (id, request_id, role_id, approver_user_id, approver_email, decision, decided_at, comment, created_at)
  ON public.approval_decisions TO authenticated;

-- Fix 2: approval_role_members exposed emails to every authenticated user.
-- Restrict reads to admins only. Non-admin client code that fetched members
-- will simply receive an empty list (members are only consumed by the admin
-- approvals page).
DROP POLICY IF EXISTS approval_role_members_read ON public.approval_role_members;
CREATE POLICY approval_role_members_admin_read
  ON public.approval_role_members
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));
