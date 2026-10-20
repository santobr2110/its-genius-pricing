CREATE TABLE public.bodyshop_cargos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE,
  cargo text NOT NULL,
  area text,
  nivel_num integer NOT NULL,
  senioridade text NOT NULL,
  salario_c1 numeric, salario_c2 numeric, salario_c3 numeric,
  salario_c4 numeric, salario_c5 numeric, salario_c6 numeric,
  beneficios_mensais numeric,
  encargos_perc numeric,
  indiretos_perc numeric,
  horas_mensais integer,
  piso_rentabilidade_perc numeric,
  part_number_interno text,
  codigo_produto text,
  vigencia_inicio date NOT NULL DEFAULT '2000-01-01',
  vigencia_fim date,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  campos_a_confirmar text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON COLUMN public.bodyshop_cargos.beneficios_mensais IS 'NULL = herda bodyshop_params.beneficios_padrao; valor (inclusive 0) = exceção do cargo.';
COMMENT ON COLUMN public.bodyshop_cargos.encargos_perc IS 'NULL = herda bodyshop_params.encargos_perc; valor (inclusive 0) = exceção do cargo.';
COMMENT ON COLUMN public.bodyshop_cargos.indiretos_perc IS 'NULL = herda bodyshop_params.indiretos_perc; valor (inclusive 0) = exceção do cargo.';
COMMENT ON COLUMN public.bodyshop_cargos.horas_mensais IS 'NULL = herda bodyshop_params.horas_mensais_integral; valor = exceção do cargo.';
COMMENT ON COLUMN public.bodyshop_cargos.piso_rentabilidade_perc IS 'NULL = herda bodyshop_params.piso_rentabilidade_perc; valor (inclusive 0) = exceção do cargo.';
COMMENT ON COLUMN public.bodyshop_cargos.codigo_produto IS 'NULL = herda bodyshop_params.produto_padrao; valor = SKU fiscal próprio do cargo.';
COMMENT ON COLUMN public.bodyshop_cargos.vigencia_fim IS 'NULL = vigente; preenchido quando um novo import (dissídio) fecha a vigência.';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bodyshop_cargos TO authenticated;
GRANT ALL ON public.bodyshop_cargos TO service_role;
ALTER TABLE public.bodyshop_cargos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bs cargos read" ON public.bodyshop_cargos FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'page.prof.view') OR public.has_permission(auth.uid(),'page.prof.admin'));
CREATE POLICY "bs cargos write" ON public.bodyshop_cargos FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(),'page.prof.admin')) WITH CHECK (public.has_permission(auth.uid(),'page.prof.admin'));
CREATE TRIGGER bs_cargos_touch BEFORE UPDATE ON public.bodyshop_cargos FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.bodyshop_cargo_content (
  cargo_id uuid PRIMARY KEY REFERENCES public.bodyshop_cargos(id) ON DELETE CASCADE,
  descricao text, atividades text, competencias text, formacao text, certificacoes text,
  entregaveis text, pre_requisitos text, observacoes text,
  a_confirmar boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bodyshop_cargo_content TO authenticated;
GRANT ALL ON public.bodyshop_cargo_content TO service_role;
ALTER TABLE public.bodyshop_cargo_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bs content read" ON public.bodyshop_cargo_content FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'page.prof.view') OR public.has_permission(auth.uid(),'page.prof.admin'));
CREATE POLICY "bs content write" ON public.bodyshop_cargo_content FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(),'page.prof.admin')) WITH CHECK (public.has_permission(auth.uid(),'page.prof.admin'));
CREATE TRIGGER bs_content_touch BEFORE UPDATE ON public.bodyshop_cargo_content FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.bodyshop_params (
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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bodyshop_params TO authenticated;
GRANT ALL ON public.bodyshop_params TO service_role;
ALTER TABLE public.bodyshop_params ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bs params read" ON public.bodyshop_params FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'page.prof.view') OR public.has_permission(auth.uid(),'page.prof.admin'));
CREATE POLICY "bs params write" ON public.bodyshop_params FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(),'page.prof.admin')) WITH CHECK (public.has_permission(auth.uid(),'page.prof.admin'));
CREATE TRIGGER bs_params_touch BEFORE UPDATE ON public.bodyshop_params FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();