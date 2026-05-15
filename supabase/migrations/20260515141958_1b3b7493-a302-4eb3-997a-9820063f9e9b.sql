GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon;