CREATE TABLE public.tax_product_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,
  lc116_item text,
  ativo boolean NOT NULL DEFAULT true,
  a_confirmar boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tax_product_codes TO authenticated;
GRANT ALL ON public.tax_product_codes TO service_role;
ALTER TABLE public.tax_product_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tpc_select ON public.tax_product_codes FOR SELECT TO authenticated USING (true);
CREATE POLICY tpc_admin_write ON public.tax_product_codes FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.tax_product_code_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_product_code_id uuid NOT NULL REFERENCES public.tax_product_codes(id) ON DELETE CASCADE,
  municipio text NOT NULL,
  pis_perc numeric NOT NULL DEFAULT 0,
  cofins_perc numeric NOT NULL DEFAULT 0,
  iss_perc numeric NOT NULL DEFAULT 0,
  vigencia_inicio date NOT NULL DEFAULT '2000-01-01',
  vigencia_fim date,
  a_confirmar boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tax_product_code_rates TO authenticated;
GRANT ALL ON public.tax_product_code_rates TO service_role;
ALTER TABLE public.tax_product_code_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY tpcr_select ON public.tax_product_code_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY tpcr_admin_write ON public.tax_product_code_rates FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.catalog_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_faturamento text,
  part_number_interno text,
  nome text NOT NULL,
  grupo_slug text NOT NULL,
  offering_slug text NOT NULL,
  tax_product_code_id uuid REFERENCES public.tax_product_codes(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT true,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalog_products TO authenticated;
GRANT ALL ON public.catalog_products TO service_role;
ALTER TABLE public.catalog_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY cp_select ON public.catalog_products FOR SELECT TO authenticated USING (true);
CREATE POLICY cp_admin_write ON public.catalog_products FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.tax_product_codes (codigo, nome, lc116_item, a_confirmar) VALUES
('900-0173P','SELB - IT SOLUTIONS - ANALISE E DESENVOLVIMENTO DE SISTEMAS','1.05',false),('900-0434P','SELB - IT SOLUTIONS - BILLING VIA SELBETTI + CLOUDABILITY BASIC','1.05',false),('900-0463P','SELB - IT SOLUTIONS - LICENCIAMENTO MIMIX','1.05',false),('900-0179P','SELB - IT SOLUTIONS - ASSESSORIA E CONSULTORIA','1.06',false),('900-0321P','SELB - IT SOLUTIONS - ITO FIELD SERVICE EITI','1.06',false),('900-0322P','SELB - IT SOLUTIONS - ITO EITI','1.06',false),('900-0323P','SELB - IT SOLUTIONS - LICENCAS CLOUDBERRY EITI','1.06',false),('900-0184P','SELB - IT SOLUTIONS - SUPORTE TECNICO EM INFORMATICA (INCLUSO INSTALACAO)','1.07',false),('900-0427P','SELB - IT SOLUTIONS - ITO FIELD SERVICE EITI SUPORTE TECNICO','1.07',false),('900-0428P','SELB - IT SOLUTIONS - ITO EITI SUPORTE TECNICO','1.07',false),('900-0324P','SELB - IT SOLUTIONS - ATIVIDADE DE INTERMEDIACAO E AGENCIAMENTO','10.05',false),('900-0201P','SELB - IT SOLUTIONS - REPRESENTACAO COMERCIAL','10.09',false),('900-0376P','SELB - MAO-DE-OBRA RESIDENTE - IT SOLUTIONS','17.05',false),('900-0202P','SELB - IT SOLUTIONS - LOCACAO C/ FATURA','.',false),('900-0168P','SELB - IT SOLUTIONS - MULTA CONTRATUAL','.',false),('900-0465P','SELB - IT SOLUTIONS - INCENTIVO','.',false),('TRN','Treinamento e capacitação técnica','8.02',true);

INSERT INTO public.tax_product_code_rates (tax_product_code_id, municipio, pis_perc, cofins_perc, iss_perc, a_confirmar)
SELECT c.id, v.m, v.p, v.co, v.iss, v.ac FROM (VALUES
('900-0173P','Joinville',0.65,3,2,false),('900-0173P','Blumenau',0.65,3,2,false),('900-0173P','Barueri',0.65,3,2,false),('900-0434P','Joinville',0.65,3,2,false),('900-0434P','Blumenau',0.65,3,2,false),('900-0434P','Barueri',0.65,3,2,false),('900-0463P','Joinville',0.65,3,2,false),('900-0463P','Blumenau',0.65,3,2,false),('900-0463P','Barueri',0.65,3,2,false),('900-0179P','Joinville',0.65,3,2,false),('900-0179P','Blumenau',0.65,3,2,false),('900-0179P','Barueri',0.65,3,2,false),('900-0321P','Joinville',0.65,3,2,false),('900-0321P','Blumenau',0.65,3,2,false),('900-0321P','Barueri',0.65,3,2,false),('900-0322P','Joinville',0.65,3,2,false),('900-0322P','Blumenau',0.65,3,2,false),('900-0322P','Barueri',0.65,3,2,false),('900-0323P','Joinville',0.65,3,2,false),('900-0323P','Blumenau',0.65,3,2,false),('900-0323P','Barueri',0.65,3,2,false),('900-0184P','Joinville',1.65,7.6,2,false),('900-0184P','Blumenau',1.65,7.6,2,false),('900-0184P','Barueri',1.65,7.6,2,false),('900-0427P','Joinville',1.65,7.6,2,false),('900-0427P','Blumenau',1.65,7.6,2,false),('900-0427P','Barueri',1.65,7.6,2,false),('900-0428P','Joinville',1.65,7.6,2,false),('900-0428P','Blumenau',1.65,7.6,2,false),('900-0428P','Barueri',1.65,7.6,2,false),('900-0324P','Joinville',1.65,7.6,2,false),('900-0324P','Blumenau',1.65,7.6,3,false),('900-0324P','Barueri',1.65,7.6,2,false),('900-0201P','Joinville',1.65,7.6,2,false),('900-0201P','Blumenau',1.65,7.6,2,false),('900-0201P','Barueri',1.65,7.6,2,false),('900-0376P','Joinville',1.65,7.6,2.5,false),('900-0376P','Blumenau',1.65,7.6,3,false),('900-0376P','Barueri',1.65,7.6,2,false),('900-0202P','Joinville',1.65,7.6,0,false),('900-0202P','Blumenau',1.65,7.6,0,false),('900-0202P','Barueri',1.65,7.6,0,false),('900-0168P','Joinville',1.65,7.6,0,false),('900-0168P','Blumenau',1.65,7.6,0,false),('900-0168P','Barueri',1.65,7.6,0,false),('900-0465P','Joinville',1.65,7.6,0,false),('900-0465P','Blumenau',1.65,7.6,0,false),('900-0465P','Barueri',1.65,7.6,0,false),('TRN','Joinville',1.65,7.6,2,true),('TRN','Blumenau',1.65,7.6,2,true),('TRN','Barueri',1.65,7.6,2,true)
) AS v(codigo, m, p, co, iss, ac) JOIN public.tax_product_codes c ON c.codigo = v.codigo;

INSERT INTO public.catalog_products (sku_faturamento, part_number_interno, nome, grupo_slug, offering_slug, tax_product_code_id, observacao)
SELECT NULL, 'TRN-OFC', 'Treinamentos oficiais Zabbix', 'observabilidade', 'treinamento', id, 'SKU de faturamento a definir'
FROM public.tax_product_codes WHERE codigo = 'TRN';

INSERT INTO public.offerings (group_id, slug, name, sort_order, status)
VALUES ('b7265f09-164e-4e28-8995-7d011221b57b', 'treinamento', 'Treinamento', 10, 'active')
ON CONFLICT (group_id, slug) DO NOTHING;