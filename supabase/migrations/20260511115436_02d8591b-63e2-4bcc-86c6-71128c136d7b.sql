
revoke execute on function public.is_admin(uuid) from public, anon, authenticated;
revoke execute on function public.has_permission(uuid, text) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
