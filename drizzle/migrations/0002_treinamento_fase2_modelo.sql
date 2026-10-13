CREATE TABLE public.training_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  fabricante text NOT NULL CHECK (fabricante IN ('zabbix','grafana')),
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('curso','exame','combo','extra')),
  part_number_interno text,
  catalog_product_id uuid REFERENCES public.catalog_products(id) ON DELETE SET NULL,
  horas_execucao numeric NOT NULL DEFAULT 0,
  dias integer,
  nivel_instrutor text CHECK (nivel_instrutor IN ('A','B')),
  valor_fabricante numeric,
  custo_material_aluno numeric NOT NULL DEFAULT 0,
  custo_cloud_aluno numeric NOT NULL DEFAULT 0,
  min_alunos integer NOT NULL DEFAULT 1,
  max_alunos integer,
  preco_referencia_mercado numeric,
  piso_preco_aluno numeric,
  exame_course_id uuid REFERENCES public.training_courses(id) ON DELETE SET NULL,
  prerequisito_course_id uuid REFERENCES public.training_courses(id) ON DELETE SET NULL,
  permite_somente_exame boolean NOT NULL DEFAULT false,
  custo_pendente boolean NOT NULL DEFAULT false,
  campos_a_confirmar text[] NOT NULL DEFAULT '{}',
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_courses TO authenticated;
GRANT ALL ON public.training_courses TO service_role;
ALTER TABLE public.training_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trn courses read" ON public.training_courses FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'page.trn.view') OR public.has_permission(auth.uid(),'page.trn.admin'));
CREATE POLICY "trn courses write" ON public.training_courses FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(),'page.trn.admin')) WITH CHECK (public.has_permission(auth.uid(),'page.trn.admin'));
CREATE TRIGGER trn_courses_touch BEFORE UPDATE ON public.training_courses FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.training_course_content (
  course_id uuid PRIMARY KEY REFERENCES public.training_courses(id) ON DELETE CASCADE,
  tagline text, descricao text, produtos_cobertos text, formato text, horario text,
  pre_requisito text, entregavel text, exame_descricao text, publico_alvo text,
  disponibilidade_texto text, link_mais_informacoes text,
  cronograma jsonb NOT NULL DEFAULT '[]'::jsonb,
  habilidades jsonb NOT NULL DEFAULT '[]'::jsonb,
  impacto_organizacional text, impacto_individual text,
  a_confirmar boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_course_content TO authenticated;
GRANT ALL ON public.training_course_content TO service_role;
ALTER TABLE public.training_course_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trn content read" ON public.training_course_content FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'page.trn.view') OR public.has_permission(auth.uid(),'page.trn.admin'));
CREATE POLICY "trn content write" ON public.training_course_content FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(),'page.trn.admin')) WITH CHECK (public.has_permission(auth.uid(),'page.trn.admin'));
CREATE TRIGGER trn_content_touch BEFORE UPDATE ON public.training_course_content FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.training_combo_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_id uuid NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 0,
  UNIQUE (combo_id, course_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_combo_items TO authenticated;
GRANT ALL ON public.training_combo_items TO service_role;
ALTER TABLE public.training_combo_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trn combo read" ON public.training_combo_items FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'page.trn.view') OR public.has_permission(auth.uid(),'page.trn.admin'));
CREATE POLICY "trn combo write" ON public.training_combo_items FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(),'page.trn.admin')) WITH CHECK (public.has_permission(auth.uid(),'page.trn.admin'));

CREATE TABLE public.training_params (
  key text PRIMARY KEY,
  label text NOT NULL,
  value jsonb NOT NULL,
  tipo text NOT NULL DEFAULT 'number' CHECK (tipo IN ('number','percent','boolean','text')),
  status text NOT NULL DEFAULT 'planilha' CHECK (status IN ('planilha','simulado','a_confirmar','decisao','reuso','proposta','confirmado')),
  descricao text,
  ordem integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_params TO authenticated;
GRANT ALL ON public.training_params TO service_role;
ALTER TABLE public.training_params ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trn params read" ON public.training_params FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'page.trn.view') OR public.has_permission(auth.uid(),'page.trn.admin'));
CREATE POLICY "trn params write" ON public.training_params FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(),'page.trn.admin')) WITH CHECK (public.has_permission(auth.uid(),'page.trn.admin'));
CREATE TRIGGER trn_params_touch BEFORE UPDATE ON public.training_params FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();