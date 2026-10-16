CREATE OR REPLACE FUNCTION public.has_any_role()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
$$;
REVOKE EXECUTE ON FUNCTION public.has_any_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_any_role() TO authenticated;

DROP POLICY IF EXISTS "anyone authenticated can read default profile" ON public.app_default_profile;
CREATE POLICY "role holders can read default profile" ON public.app_default_profile FOR SELECT TO authenticated USING (public.has_any_role());
DROP POLICY IF EXISTS approval_roles_read ON public.approval_roles;
CREATE POLICY approval_roles_read ON public.approval_roles FOR SELECT TO authenticated USING (public.has_any_role());
DROP POLICY IF EXISTS approval_tier_roles_read ON public.approval_tier_roles;
CREATE POLICY approval_tier_roles_read ON public.approval_tier_roles FOR SELECT TO authenticated USING (public.has_any_role());
DROP POLICY IF EXISTS approval_tiers_read ON public.approval_tiers;
CREATE POLICY approval_tiers_read ON public.approval_tiers FOR SELECT TO authenticated USING (public.has_any_role());
DROP POLICY IF EXISTS cp_select ON public.catalog_products;
CREATE POLICY cp_select ON public.catalog_products FOR SELECT TO authenticated USING (public.has_any_role());
DROP POLICY IF EXISTS groups_select_auth ON public.groups;
CREATE POLICY groups_select_auth ON public.groups FOR SELECT TO authenticated USING (public.has_any_role());
DROP POLICY IF EXISTS offerings_select_auth ON public.offerings;
CREATE POLICY offerings_select_auth ON public.offerings FOR SELECT TO authenticated USING (public.has_any_role());
DROP POLICY IF EXISTS sci_select ON public.service_code_iss;
CREATE POLICY sci_select ON public.service_code_iss FOR SELECT TO authenticated USING (public.has_any_role());
DROP POLICY IF EXISTS sc_select ON public.service_codes;
CREATE POLICY sc_select ON public.service_codes FOR SELECT TO authenticated USING (public.has_any_role());
DROP POLICY IF EXISTS tpcr_select ON public.tax_product_code_rates;
CREATE POLICY tpcr_select ON public.tax_product_code_rates FOR SELECT TO authenticated USING (public.has_any_role());
DROP POLICY IF EXISTS tpc_select ON public.tax_product_codes;
CREATE POLICY tpc_select ON public.tax_product_codes FOR SELECT TO authenticated USING (public.has_any_role());