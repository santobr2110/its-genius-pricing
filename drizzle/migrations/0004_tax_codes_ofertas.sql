ALTER TABLE public.tax_product_codes ADD COLUMN IF NOT EXISTS ofertas text[] NOT NULL DEFAULT '{}';
UPDATE public.tax_product_codes SET ofertas = ARRAY['smart-ito'] WHERE codigo IN ('900-0184P','900-0321P','900-0322P','900-0323P','900-0427P','900-0428P');
UPDATE public.tax_product_codes SET ofertas = ARRAY['bodyshop'] WHERE codigo IN ('900-0376P','900-0173P','900-0179P');
UPDATE public.tax_product_codes SET ofertas = ARRAY['treinamento'] WHERE codigo = 'TRN';
COMMENT ON COLUMN public.tax_product_codes.ofertas IS 'Ofertas que usam o código; vazio = geral (todas).';
COMMENT ON TABLE public.catalog_products IS 'DEPRECATED: unificado em tax_product_codes (cadastro tributário de produtos).';