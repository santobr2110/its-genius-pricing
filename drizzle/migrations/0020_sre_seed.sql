INSERT INTO public.sre_pacotes (slug, part_number, nome, horas_execucao, rentabilidade_alvo_perc, ordem)
SELECT 'hrs-zbx-'||h, 'HRS-ZBX-'||h, 'Serviços profissionais consultivos para Zabbix ('||h||' horas) – Pacote pré-pago', h, a, o
FROM (VALUES (5,24.510,10),(10,24.459,20),(20,24.355,30),(40,24.147,40),(60,23.936,50),(80,23.723,60),(100,23.507,70),
 (120,23.290,80),(160,22.847,90),(180,22.622,100),(240,21.932,110),(360,20.478,120),(400,20.000,130),(480,20.000,140),(1500,20.000,150)) v(h,a,o)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.sre_pacote_content (pacote_id, a_confirmar)
SELECT id, true FROM public.sre_pacotes ON CONFLICT (pacote_id) DO NOTHING;

INSERT INTO public.sre_campanhas (nome, desconto_perc, vigencia_inicio, vigencia_fim, ativo, a_confirmar, observacao)
SELECT 'Campanha promocional (modelo)', 12, CURRENT_DATE, NULL, false, true,
 'Percentual da tabela promocional da planilha de origem, rotulada "Q4 2025" em arquivo de outubro/2026 — vigência a confirmar antes de ativar.'
WHERE NOT EXISTS (SELECT 1 FROM public.sre_campanhas);

INSERT INTO public.sre_params (key, label, value, tipo, status, descricao, ordem) VALUES
 ('custo_hora_execucao','Custo da hora de execução (R$)','135','number','planilha','Herdado pelos pacotes sem custo próprio.',10),
 ('custo_hora_gestao','Custo da hora de gestão (R$)','135','number','planilha','Herdado pelos pacotes sem custo próprio.',20),
 ('pct_horas_gestao','Horas de gestão sobre execução','20','percent','planilha','Herdado pelos pacotes sem percentual próprio.',30),
 ('retencao_perc','Retenção','5','percent','reuso','Sobre o valor final, impacta como comissão.',40),
 ('comissao_regra','Comissão fixa','""','text','decisao','Vazio = Escala Selbetti.',50),
 ('irpj_csll_convencao','Convenção IR/CSLL','"padrao_site"','text','decisao',NULL,60),
 ('encargos_financeiros_perc','Encargos financeiros','0','percent','reuso',NULL,70),
 ('produto_padrao','Produto fiscal padrão','"SRE"','text','a_confirmar','Código do cadastro tributário herdado pelos pacotes.',80),
 ('sku_faturamento','SKU de faturamento','""','text','a_confirmar',NULL,90),
 ('municipio_padrao','Município de faturamento padrão','"Joinville"','text','reuso',NULL,100),
 ('validade_proposta_dias','Validade da proposta (dias)','30','number','proposta',NULL,110),
 ('validade_horas_meses','Validade das horas (meses)','null','number','a_confirmar','Prazo para consumir as horas do pacote.',120),
 ('proposta_cidade','Cidade da proposta','"Joinville"','text','reuso',NULL,130),
 ('proposta_quem_somos','Quem somos', COALESCE((SELECT value FROM public.zabbix_params WHERE key='proposta_quem_somos'),'""'),'text','a_confirmar',NULL,140),
 ('proposta_numeros','Números da Selbetti', COALESCE((SELECT value FROM public.zabbix_params WHERE key='proposta_numeros'),'""'),'text','a_confirmar',NULL,150),
 ('proposta_objeto','Objeto','""','text','a_confirmar',NULL,160),
 ('proposta_observacoes','Observações','""','text','a_confirmar',NULL,170),
 ('proposta_texto_tributario','Texto tributário', COALESCE((SELECT value FROM public.zabbix_params WHERE key='proposta_texto_tributario'),'""'),'text','a_confirmar',NULL,180),
 ('proposta_dados_faturamento','Dados de faturamento', COALESCE((SELECT value FROM public.zabbix_params WHERE key='proposta_dados_faturamento'),'""'),'text','a_confirmar',NULL,190),
 ('proposta_prazo_pagamento','Prazo de pagamento','""','text','a_confirmar',NULL,200),
 ('proposta_confidencialidade','Confidencialidade', COALESCE((SELECT value FROM public.zabbix_params WHERE key='proposta_confidencialidade'),'""'),'text','a_confirmar',NULL,210)
ON CONFLICT (key) DO NOTHING;