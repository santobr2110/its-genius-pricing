-- 1. Tabela de histórico
CREATE TABLE public.app_defaults_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  value jsonb NOT NULL,
  version bigint NOT NULL,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now(),
  change_kind text NOT NULL CHECK (change_kind IN ('insert','update','revert')),
  UNIQUE (key, version)
);

CREATE INDEX idx_app_defaults_history_key_version ON public.app_defaults_history (key, version DESC);
CREATE INDEX idx_app_defaults_history_changed_at ON public.app_defaults_history (changed_at DESC);

-- 2. GRANTs
GRANT SELECT ON public.app_defaults_history TO authenticated;
GRANT ALL ON public.app_defaults_history TO service_role;

-- 3. RLS
ALTER TABLE public.app_defaults_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY adh_select_auth ON public.app_defaults_history
  FOR SELECT TO authenticated USING (true);

CREATE POLICY adh_admin_delete ON public.app_defaults_history
  FOR DELETE TO authenticated USING (app_private.is_admin(auth.uid()));

-- 4. Trigger function
CREATE OR REPLACE FUNCTION public.app_defaults_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_version bigint;
  kind text;
BEGIN
  SELECT COALESCE(MAX(version), 0) + 1 INTO next_version
    FROM public.app_defaults_history WHERE key = NEW.key;

  IF TG_OP = 'INSERT' THEN
    kind := 'insert';
  ELSE
    kind := COALESCE(current_setting('app.defaults_change_kind', true), 'update');
  END IF;

  INSERT INTO public.app_defaults_history (key, value, version, changed_by, change_kind)
  VALUES (NEW.key, NEW.value, next_version, NEW.updated_by, kind);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_app_defaults_snapshot
AFTER INSERT OR UPDATE OF value ON public.app_defaults
FOR EACH ROW EXECUTE FUNCTION public.app_defaults_snapshot();

-- 5. Backfill — versão 1 para cada chave existente
INSERT INTO public.app_defaults_history (key, value, version, changed_by, changed_at, change_kind)
SELECT key, value, 1, updated_by, updated_at, 'insert'
FROM public.app_defaults
ON CONFLICT (key, version) DO NOTHING;

-- 6. Função utilitária para reverter (admin only) — registra como 'revert'
CREATE OR REPLACE FUNCTION public.revert_app_default(_key text, _version bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_value jsonb;
BEGIN
  IF NOT app_private.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can revert defaults';
  END IF;

  SELECT value INTO target_value
    FROM public.app_defaults_history
    WHERE key = _key AND version = _version;

  IF target_value IS NULL THEN
    RAISE EXCEPTION 'Version % not found for key %', _version, _key;
  END IF;

  PERFORM set_config('app.defaults_change_kind', 'revert', true);
  UPDATE public.app_defaults
    SET value = target_value, updated_by = auth.uid(), updated_at = now()
    WHERE key = _key;
  PERFORM set_config('app.defaults_change_kind', 'update', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.revert_app_default(text, bigint) TO authenticated;