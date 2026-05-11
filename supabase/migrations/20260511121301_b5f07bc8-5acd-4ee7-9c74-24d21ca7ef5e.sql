REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION app_private.is_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION app_private.has_permission(uuid, text) FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA app_private TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.has_permission(uuid, text) TO authenticated;