
-- Restrict SELECT on sensitive configuration tables to authenticated users
-- who have an assigned role. Newly-registered users without a role assignment
-- should not be able to read pricing defaults or the role/permission catalogue.

DROP POLICY IF EXISTS ad_select_auth ON public.app_defaults;
CREATE POLICY ad_select_roled ON public.app_defaults
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()));

DROP POLICY IF EXISTS adh_select_auth ON public.app_defaults_history;
CREATE POLICY adh_select_roled ON public.app_defaults_history
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()));

DROP POLICY IF EXISTS roles_select_authenticated ON public.roles;
CREATE POLICY roles_select_roled ON public.roles
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()));

DROP POLICY IF EXISTS rp_select_authenticated ON public.role_permissions;
CREATE POLICY rp_select_roled ON public.role_permissions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()));
