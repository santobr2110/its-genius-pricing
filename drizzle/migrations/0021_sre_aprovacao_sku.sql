INSERT INTO public.approval_tiers (offering, label, min_pct, max_pct, mode, ativo, sort_order)
SELECT 'consultivo-sre', 'Sem faixa (operação sem piso) — inativa', NULL, NULL, 'all', false, 0
WHERE NOT EXISTS (SELECT 1 FROM public.approval_tiers WHERE offering = 'consultivo-sre');

UPDATE public.sre_params
SET status = 'a_confirmar',
    descricao = 'A definir. SKU único de faturamento da oferta (Família Observabilidade, TIPO SERV, oferta pontual, Tecnologia ZABBIX; descrição até 100 caracteres, sem modelo de cobrança no nome). Part numbers HRS-ZBX-* são códigos internos. Vínculo fiscal: código SRE → LC 116 1.06.'
WHERE key = 'sku_faturamento' AND (value IS NULL OR value = '""'::jsonb);