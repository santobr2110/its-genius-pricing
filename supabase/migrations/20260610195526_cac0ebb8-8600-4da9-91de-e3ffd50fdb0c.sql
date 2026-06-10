
-- Tabela: base_conhecimento
CREATE TABLE public.base_conhecimento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('cargos_salarios', 'descritivos')),
  nome_arquivo text NOT NULL,
  conteudo_texto text,
  conteudo_parsed jsonb,
  total_registros integer DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tipo)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.base_conhecimento TO authenticated;
GRANT ALL ON public.base_conhecimento TO service_role;
ALTER TABLE public.base_conhecimento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bc_select_own" ON public.base_conhecimento FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "bc_insert_own" ON public.base_conhecimento FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bc_update_own" ON public.base_conhecimento FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bc_delete_own" ON public.base_conhecimento FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER bc_touch_updated_at BEFORE UPDATE ON public.base_conhecimento
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Custom trigger to set atualizado_em (since our column is named differently)
CREATE OR REPLACE FUNCTION public.touch_atualizado_em()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.atualizado_em = now(); RETURN NEW; END;
$$;

DROP TRIGGER bc_touch_updated_at ON public.base_conhecimento;
CREATE TRIGGER bc_touch_atualizado_em BEFORE UPDATE ON public.base_conhecimento
  FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();


-- Tabela: config_precificacao
CREATE TABLE public.config_precificacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  encargos_pct numeric(5,2) NOT NULL DEFAULT 68.00,
  overhead_pct numeric(5,2) NOT NULL DEFAULT 15.00,
  margem_pct numeric(5,2) NOT NULL DEFAULT 25.00,
  horas_mensais integer NOT NULL DEFAULT 176,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.config_precificacao TO authenticated;
GRANT ALL ON public.config_precificacao TO service_role;
ALTER TABLE public.config_precificacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cp_select_own" ON public.config_precificacao FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "cp_insert_own" ON public.config_precificacao FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cp_update_own" ON public.config_precificacao FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cp_delete_own" ON public.config_precificacao FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER cp_touch_atualizado_em BEFORE UPDATE ON public.config_precificacao
  FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();


-- Tabela: cotacoes
CREATE TABLE public.cotacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente text NOT NULL,
  observacoes text,
  origem text NOT NULL CHECK (origem IN ('manual', 'ia')),
  valida_ate date NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  excluido boolean NOT NULL DEFAULT false,

  cargo text NOT NULL,
  area text NOT NULL,
  nivel text NOT NULL,
  descricao_cargo text,
  competencias text[],

  salario_base numeric(12,2) NOT NULL,
  encargos_pct numeric(5,2) NOT NULL,
  overhead_pct numeric(5,2) NOT NULL,
  margem_pct numeric(5,2) NOT NULL,
  horas_mensais integer NOT NULL,

  custo_total numeric(12,2) NOT NULL,
  valor_venda numeric(12,2) NOT NULL,
  valor_hora numeric(10,2) NOT NULL,
  valor_sprint numeric(10,2) NOT NULL,

  ia_descricao_original text,
  ia_justificativa text,
  ia_indice_aderencia integer,
  ia_competencias_chave text[]
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotacoes TO authenticated;
GRANT ALL ON public.cotacoes TO service_role;
ALTER TABLE public.cotacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cot_select_own" ON public.cotacoes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "cot_insert_own" ON public.cotacoes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cot_update_own" ON public.cotacoes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cot_delete_own" ON public.cotacoes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER cot_touch_atualizado_em BEFORE UPDATE ON public.cotacoes
  FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();

CREATE INDEX cot_user_excluido_idx ON public.cotacoes (user_id, excluido);
CREATE INDEX cot_user_criado_idx ON public.cotacoes (user_id, criado_em DESC);
