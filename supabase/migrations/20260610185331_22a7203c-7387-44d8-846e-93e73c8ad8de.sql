
ALTER TABLE public.pricing_presets
  ADD COLUMN IF NOT EXISTS salesforce_code text;
