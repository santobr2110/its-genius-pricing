REVOKE ALL ON FUNCTION public.app_defaults_snapshot() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.revert_app_default(text, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revert_app_default(text, bigint) TO authenticated;