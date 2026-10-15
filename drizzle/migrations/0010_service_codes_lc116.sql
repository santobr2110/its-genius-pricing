CREATE TABLE public.service_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lc116_item text NOT NULL UNIQUE,
  descricao text,
  pis_perc numeric NOT NULL DEFAULT 0,
  cofins_perc numeric NOT NULL DEFAULT 0,
  a_confirmar boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_codes TO authenticated;
GRANT ALL ON public.service_codes TO service_role;
ALTER TABLE public.service_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY sc_select ON public.service_codes FOR SELECT TO authenticated USING (true);
CREATE POLICY sc_admin_write ON public.service_codes FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.service_code_iss (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_code_id uuid NOT NULL REFERENCES public.service_codes(id) ON DELETE CASCADE,
  municipio text NOT NULL,
  iss_perc numeric NOT NULL DEFAULT 0,
  vigencia_inicio date NOT NULL DEFAULT CURRENT_DATE,
  vigencia_fim date,
  a_confirmar boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_code_iss TO authenticated;
GRANT ALL ON public.service_code_iss TO service_role;
ALTER TABLE public.service_code_iss ENABLE ROW LEVEL SECURITY;
CREATE POLICY sci_select ON public.service_code_iss FOR SELECT TO authenticated USING (true);
CREATE POLICY sci_admin_write ON public.service_code_iss FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

ALTER TABLE public.tax_product_codes
  ADD COLUMN service_code_id uuid REFERENCES public.service_codes(id) ON DELETE SET NULL,
  ADD COLUMN usa_aliquota_propria boolean NOT NULL DEFAULT false;
COMMENT ON TABLE public.tax_product_code_rates IS 'Product-level rate overrides; used only when tax_product_codes.usa_aliquota_propria = true';

-- Backfill: one service code per LC116 item, using the dominant (confirmed, most products) PIS/COFINS group
WITH g AS (
  SELECT c.lc116_item, r.pis_perc, r.cofins_perc,
         bool_or(r.a_confirmar OR c.a_confirmar) AS conf,
         count(DISTINCT c.id) AS n
  FROM public.tax_product_codes c JOIN public.tax_product_code_rates r ON r.tax_product_code_id = c.id
  WHERE coalesce(c.lc116_item,'') <> ''
  GROUP BY 1,2,3
), best AS (
  SELECT DISTINCT ON (lc116_item) * FROM g ORDER BY lc116_item, conf ASC, n DESC
)
INSERT INTO public.service_codes (lc116_item, descricao, pis_perc, cofins_perc, a_confirmar)
SELECT lc116_item, CASE WHEN lc116_item = '.' THEN 'Sem item LC 116 (sem ISS)' END, pis_perc, cofins_perc, conf FROM best;

INSERT INTO public.service_code_iss (service_code_id, municipio, iss_perc, vigencia_inicio, a_confirmar)
SELECT s.id, r.municipio, max(r.iss_perc), min(r.vigencia_inicio), bool_or(r.a_confirmar)
FROM public.service_codes s
JOIN public.tax_product_codes c ON c.lc116_item = s.lc116_item
JOIN public.tax_product_code_rates r ON r.tax_product_code_id = c.id
 AND r.pis_perc = s.pis_perc AND r.cofins_perc = s.cofins_perc
GROUP BY s.id, r.municipio;

UPDATE public.tax_product_codes c SET service_code_id = s.id
FROM public.service_codes s WHERE s.lc116_item = c.lc116_item;

-- Products whose current rates differ from their service code keep their own rates (no price change)
UPDATE public.tax_product_codes c SET usa_aliquota_propria = true
WHERE EXISTS (
  SELECT 1 FROM public.tax_product_code_rates r
  LEFT JOIN public.service_codes s ON s.id = c.service_code_id
  LEFT JOIN public.service_code_iss i ON i.service_code_id = s.id AND i.municipio = r.municipio
  WHERE r.tax_product_code_id = c.id
    AND (s.id IS NULL OR r.pis_perc <> s.pis_perc OR r.cofins_perc <> s.cofins_perc OR i.id IS NULL OR i.iss_perc <> r.iss_perc)
);