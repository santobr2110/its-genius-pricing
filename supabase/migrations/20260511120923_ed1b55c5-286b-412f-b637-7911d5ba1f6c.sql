GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated;