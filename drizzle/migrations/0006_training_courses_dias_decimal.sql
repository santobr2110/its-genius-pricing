ALTER TABLE public.training_courses ADD COLUMN IF NOT EXISTS dias_decimal numeric;
UPDATE public.training_courses SET dias_decimal = dias WHERE dias_decimal IS NULL;
COMMENT ON COLUMN public.training_courses.dias IS 'DEPRECATED: rounded-up copy of dias_decimal';