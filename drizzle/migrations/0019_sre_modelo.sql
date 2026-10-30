CREATE TABLE public.sre_pacotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  part_number text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,
  horas_execucao numeric NOT NULL,
  pct_horas_gestao numeric,
  custo_hora_execucao numeric,
  custo_hora_gestao numeric,
  rentabilidade_alvo_perc numeric NOT NULL,
  codigo_produto text,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  campos_a_confirmar text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON COLUMN public.sre_pacotes.pct_horas_gestao IS 'NULL = herda sre_params.pct_horas_gestao. Valor preenchido = exceção deste pacote (inclusive 0).';
COMMENT ON COLUMN public.sre_pacotes.custo_hora_execucao IS 'NULL = herda sre_params.custo_hora_execucao. Valor preenchido = exceção deste pacote (inclusive 0).';
COMMENT ON COLUMN public.sre_pacotes.custo_hora_gestao IS 'NULL = herda sre_params.custo_hora_gestao. Valor preenchido = exceção deste pacote (inclusive 0).';
COMMENT ON COLUMN public.sre_pacotes.codigo_produto IS 'NULL = herda sre_params.produto_padrao. Valor preenchido = código fiscal próprio deste pacote.';
COMMENT ON COLUMN public.sre_pacotes.descricao IS 'Opcional; descrição interna do pacote.';
COMMENT ON COLUMN public.sre_pacotes.rentabilidade_alvo_perc IS 'Escada de volume: a rentabilidade alvo É a política de preço (não há desconto de volume nem coluna de preço). Os pacotes de 400 h para cima travam em 20,000% exatos: com a Escala Selbetti, comissaoFromRent é em degraus (19,99% → 6,10%; 20,00% → 7,32%), criando uma zona morta sem preço entre R$ 303,54 e R$ 313,41/h de execução, onde caía o piso da planilha original (R$ 373,538/h a 14% de carga). Travar em 20,000% mantém a comissão estável na tabela, ao custo de +0,07% no preço dos três maiores pacotes.';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sre_pacotes TO authenticated;
GRANT ALL ON public.sre_pacotes TO service_role;
ALTER TABLE public.sre_pacotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sre pacotes read" ON public.sre_pacotes FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'page.sre.view') OR public.has_permission(auth.uid(),'page.sre.admin'));
CREATE POLICY "sre pacotes write" ON public.sre_pacotes FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(),'page.sre.admin')) WITH CHECK (public.has_permission(auth.uid(),'page.sre.admin'));
CREATE TRIGGER sre_pacotes_touch BEFORE UPDATE ON public.sre_pacotes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.sre_pacote_content (
  pacote_id uuid PRIMARY KEY REFERENCES public.sre_pacotes(id) ON DELETE CASCADE,
  tagline text, descricao text, escopo_atividades text, perfis_envolvidos text, entregavel text,
  forma_acionamento text, sla_atendimento text, validade_horas_texto text, regra_consumo text,
  pre_requisito text, observacoes text, link_mais_informacoes text,
  a_confirmar boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sre_pacote_content TO authenticated;
GRANT ALL ON public.sre_pacote_content TO service_role;
ALTER TABLE public.sre_pacote_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sre content read" ON public.sre_pacote_content FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'page.sre.view') OR public.has_permission(auth.uid(),'page.sre.admin'));
CREATE POLICY "sre content write" ON public.sre_pacote_content FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(),'page.sre.admin')) WITH CHECK (public.has_permission(auth.uid(),'page.sre.admin'));
CREATE TRIGGER sre_content_touch BEFORE UPDATE ON public.sre_pacote_content FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.sre_params (
  key text PRIMARY KEY,
  label text NOT NULL,
  value jsonb NOT NULL DEFAULT 'null',
  tipo text NOT NULL DEFAULT 'number',
  status text NOT NULL DEFAULT 'a_confirmar',
  descricao text,
  ordem integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sre_params TO authenticated;
GRANT ALL ON public.sre_params TO service_role;
ALTER TABLE public.sre_params ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sre params read" ON public.sre_params FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'page.sre.view') OR public.has_permission(auth.uid(),'page.sre.admin'));
CREATE POLICY "sre params write" ON public.sre_params FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(),'page.sre.admin')) WITH CHECK (public.has_permission(auth.uid(),'page.sre.admin'));
CREATE TRIGGER sre_params_touch BEFORE UPDATE ON public.sre_params FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.sre_campanhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  desconto_perc numeric NOT NULL,
  vigencia_inicio date NOT NULL,
  vigencia_fim date,
  ativo boolean NOT NULL DEFAULT true,
  observacao text,
  a_confirmar boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sre_campanhas_perc_chk CHECK (desconto_perc >= 0 AND desconto_perc < 100)
);
CREATE UNIQUE INDEX sre_campanha_vigente_unica ON public.sre_campanhas ((true)) WHERE ativo AND vigencia_fim IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sre_campanhas TO authenticated;
GRANT ALL ON public.sre_campanhas TO service_role;
ALTER TABLE public.sre_campanhas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sre campanhas read" ON public.sre_campanhas FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'page.sre.view') OR public.has_permission(auth.uid(),'page.sre.admin'));
CREATE POLICY "sre campanhas write" ON public.sre_campanhas FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(),'page.sre.admin')) WITH CHECK (public.has_permission(auth.uid(),'page.sre.admin'));
CREATE TRIGGER sre_campanhas_touch BEFORE UPDATE ON public.sre_campanhas FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();