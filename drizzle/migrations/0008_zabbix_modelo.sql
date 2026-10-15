CREATE TABLE public.zabbix_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  part_number text NOT NULL,
  nome text NOT NULL,
  categoria text NOT NULL CHECK (categoria IN ('suporte','academy')),
  unidade text NOT NULL CHECK (unidade IN ('server','proxy','tier','aluno','assinatura')),
  nivel text,
  venda_brl numeric NOT NULL,
  lista_usd numeric,
  lista_brl numeric,
  ro_perc numeric NOT NULL,
  sem_ro_perc numeric NOT NULL,
  pgto30_ro_perc numeric NOT NULL DEFAULT 0,
  pgto30_sem_ro_perc numeric NOT NULL DEFAULT 0,
  permite_quantidade boolean NOT NULL DEFAULT true,
  quantidade_maxima integer,
  codigo_produto text NOT NULL DEFAULT 'ZBX',
  descricao text,
  piso_rentabilidade_perc numeric,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  campos_a_confirmar text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zabbix_subscriptions TO authenticated;
GRANT ALL ON public.zabbix_subscriptions TO service_role;
ALTER TABLE public.zabbix_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "zbx subs read" ON public.zabbix_subscriptions FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'page.zbx.view') OR public.has_permission(auth.uid(),'page.zbx.admin'));
CREATE POLICY "zbx subs write" ON public.zabbix_subscriptions FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(),'page.zbx.admin')) WITH CHECK (public.has_permission(auth.uid(),'page.zbx.admin'));
CREATE TRIGGER zbx_subs_touch BEFORE UPDATE ON public.zabbix_subscriptions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.zabbix_subscription_content (
  subscription_id uuid PRIMARY KEY REFERENCES public.zabbix_subscriptions(id) ON DELETE CASCADE,
  tagline text, descricao text, escopo_atendimento text, sla text, canais_atendimento text,
  idioma text, abrangencia text, entregavel text, pre_requisito text, observacoes text,
  link_mais_informacoes text,
  a_confirmar boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zabbix_subscription_content TO authenticated;
GRANT ALL ON public.zabbix_subscription_content TO service_role;
ALTER TABLE public.zabbix_subscription_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "zbx content read" ON public.zabbix_subscription_content FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'page.zbx.view') OR public.has_permission(auth.uid(),'page.zbx.admin'));
CREATE POLICY "zbx content write" ON public.zabbix_subscription_content FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(),'page.zbx.admin')) WITH CHECK (public.has_permission(auth.uid(),'page.zbx.admin'));
CREATE TRIGGER zbx_content_touch BEFORE UPDATE ON public.zabbix_subscription_content FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.zabbix_params (
  key text PRIMARY KEY,
  label text NOT NULL,
  value jsonb NOT NULL DEFAULT 'null'::jsonb,
  tipo text NOT NULL DEFAULT 'number',
  status text NOT NULL DEFAULT 'a_confirmar',
  descricao text,
  ordem integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zabbix_params TO authenticated;
GRANT ALL ON public.zabbix_params TO service_role;
ALTER TABLE public.zabbix_params ENABLE ROW LEVEL SECURITY;
CREATE POLICY "zbx params read" ON public.zabbix_params FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'page.zbx.view') OR public.has_permission(auth.uid(),'page.zbx.admin'));
CREATE POLICY "zbx params write" ON public.zabbix_params FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(),'page.zbx.admin')) WITH CHECK (public.has_permission(auth.uid(),'page.zbx.admin'));
CREATE TRIGGER zbx_params_touch BEFORE UPDATE ON public.zabbix_params FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();