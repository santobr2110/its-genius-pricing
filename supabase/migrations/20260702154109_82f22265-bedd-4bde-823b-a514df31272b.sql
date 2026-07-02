
-- Re-grant column-level SELECT on approval_decisions (excluding token_hash) plus write privileges.
GRANT SELECT (id, request_id, role_id, approver_user_id, approver_email, decision, decided_at, comment, created_at)
  ON public.approval_decisions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.approval_decisions TO authenticated;
GRANT ALL ON public.approval_decisions TO service_role;
