ALTER TABLE public.cotacoes ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'smart-ito';
CREATE INDEX IF NOT EXISTS cot_user_scope_idx ON public.cotacoes (user_id, scope, excluido);

-- Optional new columns to persist a richer breakdown for the new Profissionais pricing engine
ALTER TABLE public.cotacoes ADD COLUMN IF NOT EXISTS impostos_pct numeric(5,2);
ALTER TABLE public.cotacoes ADD COLUMN IF NOT EXISTS comissao_pct numeric(5,2);
ALTER TABLE public.cotacoes ADD COLUMN IF NOT EXISTS extras jsonb;