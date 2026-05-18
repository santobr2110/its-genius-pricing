CREATE TABLE public.parameter_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.parameter_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY pprof_select_own ON public.parameter_profiles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY pprof_insert_own ON public.parameter_profiles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY pprof_update_own ON public.parameter_profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY pprof_delete_own ON public.parameter_profiles
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER parameter_profiles_touch_updated_at
  BEFORE UPDATE ON public.parameter_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX parameter_profiles_user_idx ON public.parameter_profiles(user_id, created_at DESC);