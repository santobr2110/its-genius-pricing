ALTER TABLE public.zabbix_subscriptions ADD COLUMN IF NOT EXISTS custo_brl numeric;
INSERT INTO public.zabbix_params(key,label,value,tipo,status,descricao,ordem)
VALUES ('margem_custo_direto_perc','Margem padrão — SKUs de custo direto','30'::jsonb,'percent','a_confirmar','Rentabilidade inicial para SKUs cadastrados com custo em R$ (preço pela cascata).',200)
ON CONFLICT (key) DO NOTHING;