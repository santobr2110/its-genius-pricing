-- Tighten EXECUTE on SECURITY DEFINER functions so anon and PUBLIC cannot call them.
-- has_permission/is_admin are used in RLS policies, so authenticated role keeps EXECUTE.
-- handle_new_user is only invoked by the auth trigger and does not need any role grant.

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;