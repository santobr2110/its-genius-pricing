CREATE SCHEMA IF NOT EXISTS app_private;

CREATE OR REPLACE FUNCTION app_private.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = _user_id
      AND r.slug = 'admin'
  )
$$;

CREATE OR REPLACE FUNCTION app_private.has_permission(_user_id uuid, _permission_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN app_private.is_admin(_user_id) THEN true
    ELSE EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.role_permissions rp ON rp.role_id = ur.role_id
      WHERE ur.user_id = _user_id
        AND rp.permission_key = _permission_key
        AND rp.allowed = true
    )
  END
$$;

GRANT USAGE ON SCHEMA app_private TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.has_permission(uuid, text) TO authenticated;

ALTER POLICY roles_admin_insert ON public.roles
  WITH CHECK (app_private.is_admin(auth.uid()));
ALTER POLICY roles_admin_update ON public.roles
  USING (app_private.is_admin(auth.uid()) AND is_system = false)
  WITH CHECK (app_private.is_admin(auth.uid()) AND is_system = false);
ALTER POLICY roles_admin_delete ON public.roles
  USING (app_private.is_admin(auth.uid()) AND is_system = false);

ALTER POLICY rp_admin_insert ON public.role_permissions
  WITH CHECK (
    app_private.is_admin(auth.uid())
    AND NOT EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_id AND r.slug = 'admin')
  );
ALTER POLICY rp_admin_update ON public.role_permissions
  USING (
    app_private.is_admin(auth.uid())
    AND NOT EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_id AND r.slug = 'admin')
  );
ALTER POLICY rp_admin_delete ON public.role_permissions
  USING (
    app_private.is_admin(auth.uid())
    AND NOT EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_id AND r.slug = 'admin')
  );

ALTER POLICY profiles_select_self_or_admin ON public.profiles
  USING (id = auth.uid() OR app_private.is_admin(auth.uid()));
ALTER POLICY profiles_update_self_or_admin ON public.profiles
  USING (id = auth.uid() OR app_private.is_admin(auth.uid()));
ALTER POLICY profiles_admin_delete ON public.profiles
  USING (app_private.is_admin(auth.uid()));
ALTER POLICY profiles_insert_self_or_admin ON public.profiles
  WITH CHECK (id = auth.uid() OR app_private.is_admin(auth.uid()));

ALTER POLICY ur_select_self_or_admin ON public.user_roles
  USING (user_id = auth.uid() OR app_private.is_admin(auth.uid()));
ALTER POLICY ur_admin_insert ON public.user_roles
  WITH CHECK (app_private.is_admin(auth.uid()));
ALTER POLICY ur_admin_update ON public.user_roles
  USING (app_private.is_admin(auth.uid()));
ALTER POLICY ur_admin_delete ON public.user_roles
  USING (app_private.is_admin(auth.uid()));

REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text) FROM PUBLIC, anon, authenticated;