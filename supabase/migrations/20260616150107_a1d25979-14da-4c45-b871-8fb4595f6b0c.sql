CREATE POLICY "pprof_select_default" ON public.parameter_profiles
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.app_default_profile dp WHERE dp.profile_id = parameter_profiles.id));