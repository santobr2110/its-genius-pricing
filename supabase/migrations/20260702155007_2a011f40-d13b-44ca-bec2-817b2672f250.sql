-- 1) Hide sensitive columns on approval_decisions from clients (token_hash, approver_email).
REVOKE SELECT (approver_email, token_hash) ON public.approval_decisions FROM authenticated;
REVOKE SELECT (approver_email, token_hash) ON public.approval_decisions FROM anon;

-- 2) Lock down approval_role_members: no anonymous access; authenticated goes through RLS only.
REVOKE ALL ON public.approval_role_members FROM anon;
REVOKE ALL ON public.approval_role_members FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_role_members TO authenticated;
GRANT ALL ON public.approval_role_members TO service_role;