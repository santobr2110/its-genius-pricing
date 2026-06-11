
ALTER TABLE public.pricing_presets
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS account_manager text,
  ADD COLUMN IF NOT EXISTS bu_specialist text,
  ADD COLUMN IF NOT EXISTS contract_term text,
  ADD COLUMN IF NOT EXISTS bu_architect text,
  ADD COLUMN IF NOT EXISTS quote_code text;

CREATE UNIQUE INDEX IF NOT EXISTS pricing_presets_quote_code_key
  ON public.pricing_presets(quote_code) WHERE quote_code IS NOT NULL;
