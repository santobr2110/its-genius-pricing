create table if not exists public.zabbix_matriz_niveis (
  id uuid primary key default gen_random_uuid(),
  secao text not null check (secao in ('recursos','apoio','servicos','extras')),
  ordem int not null default 0,
  recurso text not null,
  silver text not null default '–', gold text not null default '–', platinum text not null default '–',
  enterprise text not null default '–', global text not null default '–',
  ativo boolean not null default true,
  updated_at timestamptz not null default now(), updated_by uuid,
  unique (secao, recurso)
);
grant select, insert, update, delete on public.zabbix_matriz_niveis to authenticated;
grant all on public.zabbix_matriz_niveis to service_role;
alter table public.zabbix_matriz_niveis enable row level security;
drop policy if exists "zbx matriz read" on public.zabbix_matriz_niveis;
create policy "zbx matriz read" on public.zabbix_matriz_niveis for select to authenticated
  using (has_permission(auth.uid(),'page.zbx.view') or has_permission(auth.uid(),'page.zbx.admin'));
drop policy if exists "zbx matriz write" on public.zabbix_matriz_niveis;
create policy "zbx matriz write" on public.zabbix_matriz_niveis for all to authenticated
  using (has_permission(auth.uid(),'page.zbx.admin')) with check (has_permission(auth.uid(),'page.zbx.admin'));
create index if not exists zabbix_matriz_niveis_secao_ordem on public.zabbix_matriz_niveis (secao, ordem);

insert into public.zabbix_matriz_niveis (secao, ordem, recurso, silver, gold, platinum, enterprise, global) values
('recursos',1,'Autenticação única','✓','✓','✓','✓','✓'),
('recursos',2,'Dispositivos e métricas monitoradas','Ilimitado','Ilimitado','Ilimitado','Ilimitado','Ilimitado'),
('recursos',3,'Zabbix servers suportados','1','Preço por servidor','Preço por servidor','Ilimitado','Ilimitado'),
('recursos',4,'Zabbix proxies suportados','–','Preço por proxy','Preço por proxy','Ilimitado','Ilimitado'),
('recursos',5,'HA nativo','–','Opcional','Opcional','✓','✓'),
('recursos',6,'Múltiplas entidades legais','–','–','–','–','✓'),
('apoio',1,'Suporte online','✓','✓','✓','✓','✓'),
('apoio',2,'Suporte por telefone','–','–','–','✓','✓'),
('apoio',3,'Número de casos de suporte','8','Ilimitado','Ilimitado','Ilimitado','Ilimitado'),
('apoio',4,'Disponibilidade de suporte','8 x 5','8 x 5','24 x 7','24 x 7','24 x 7'),
('apoio',5,'Tempo de resposta inicial (máx.)','1 dia','4 horas','4 horas','4 horas','2 horas'),
('apoio',6,'Tempo de resposta para emergências','–','–','2 horas','1,5 hora','1 hora'),
('apoio',7,'Contatos de suporte','1','2','3','7','20'),
('servicos',1,'Gerente de Sucesso do Cliente designado','–','✓','✓','✓','✓'),
('servicos',2,'Solução de problemas remoto','–','✓','✓','✓','✓'),
('servicos',3,'Ajuste de desempenho','–','–','✓','✓','✓'),
('servicos',4,'Revisão ambiental','–','–','–','✓','✓'),
('servicos',5,'Atualizações pela equipe Zabbix','–','–','–','✓','✓'),
('servicos',6,'Horas de consultoria remota','–','–','–','40 horas','80 horas'),
('extras',1,'Zabbix Academy','–','✓','✓','✓','✓'),
('extras',2,'Vouchers de treinamento online Zabbix – Nível 1','–','–','5','30','100'),
('extras',3,'Vouchers de treinamento online Zabbix – Nível 2','–','–','1','10','30'),
('extras',4,'Ingresso Zabbix Summit','–','–','–','1','3'),
('extras',5,'Sessão anual de Q&A com o time de Produto','–','–','–','✓','✓'),
('extras',6,'Serviço de integração (dias)','–','–','–','–','20')
on conflict (secao, recurso) do nothing;

insert into public.zabbix_params (key,label,value,tipo,status,descricao,ordem) values
('proposta_consultor_cargo','Cargo do consultor','"Especialista IT Solutions"','text','reuso','Cargo exibido abaixo do nome do consultor.',209),
('proposta_confidencialidade','Confidencialidade','"Todas as informações contidas neste documento são consideradas privilegiadas e confidenciais. O uso ou a liberação das informações aqui contidas só deverão ser praticados com o objetivo de analisar seu conteúdo com vistas a responder a esta solicitação. Nenhuma parte deste documento e das informações contidas nele e em seus anexos poderá ser reproduzida, por quaisquer meios, sem a prévia permissão por escrito."','text','reuso','Texto de confidencialidade.',210),
('proposta_diferenciais','Diferenciais','"Primeiro Zabbix Premium Partner das Américas\nPrimeiro Zabbix Training Partner Global\nCondições comerciais vantajosas|Cobrança em reais e flexibilidade para aumentar ou reduzir consumo a qualquer momento.\nSimplicidade e centralização|Processo técnico, comercial e financeiro feito diretamente com a Selbetti, em uma única fatura.\nExpertise comprovada|Equipe certificada com mais de 15 anos de experiência em Zabbix e diversos cases em ambientes híbridos."','text','reuso','Uma linha por diferencial; use Título|Texto.',211),
('proposta_intro_suporte','Introdução do suporte','"As subscrições Zabbix combinam compromissos de suporte especializado com um modelo de assinatura previsível para as operações da sua empresa.\nReduza a sobrecarga administrativa, simplifique o planejamento e adote um preço anual fixo, sem limites por dispositivo e sem necessidade de reconciliação de métricas ou armazenamento.\nSegurança e estabilidade já estão incluídas.\nCada subscrição do Zabbix inclui SLAs de resposta definidos, acesso direto a especialistas do Zabbix, garantia de manutenção e correções de segurança garantidas.\nO software de código aberto Zabbix não tem taxa de licença. A precificação da subscrição é baseada na cobertura de respostas, acessos e compromissos. Hosts, dispositivos e aplicações ilimitados. Usuários, métricas e alertas ilimitados."','text','reuso','Um parágrafo por linha.',212),
('proposta_pagamento_academy','Pagamento Academy','"Subscrição anual – pagamento integral antecipado (upfront)."','text','reuso','Condição de pagamento dos itens Academy.',213),
('proposta_academy_modulos','Módulos do Academy','"01 Introdução ao Zabbix — Visão geral da plataforma, conceitos fundamentais e arquitetura.\n02 Instalação e Configuração — Instalação do Zabbix Server, agentes e componentes principais.\n03 Monitoramento Básico — Hosts, itens, tipos de itens e coleta de dados.\n04 Templates — Criação, importação e uso de templates para padronizar o monitoramento.\n05 Triggers — Criação de triggers, expressões, dependências e recuperação.\n06 Alertas e Notificações — Ações, mídias de notificação e escalonamento de alertas.\n07 Descoberta Automática (LLD) — Configuração da descoberta de dispositivos e serviços.\n08 Dashboards e Visualizações — Criação de dashboards, gráficos, mapas e widgets.\n09 Histórico e Retenção — Armazenamento de dados, políticas de retenção e tabelas de históricos.\n10 Administração do Zabbix — Usuários, permissões, autenticação e configuração avançada.\n11 Integrações — Integrações nativas, APIs e extensões do Zabbix.\n12 Boas Práticas e Troubleshooting — Otimização, desempenho, high availability e solução de problemas."','text','reuso','Uma linha por módulo: NN Nome — descrição.',214)
on conflict (key) do nothing;

update public.zabbix_params set value = to_jsonb(E'+ 15 ANOS|DE EXPERIÊNCIA EM ZABBIX\n1º|ZABBIX PREMIUM PARTNER DAS AMÉRICAS\n+ 22 MIL|USUÁRIOS\n+500|PROFISSIONAIS CERTIFICADOS\n+360|PROJETOS IMPLEMENTADOS'::text)
  where key='proposta_numeros' and coalesce(value #>> '{}','')='';
update public.zabbix_params set value = to_jsonb(E'Razão social:|SELBETTI TECNOLOGIA S.A.  |  CNPJ: 83.483.230/0001-86\nInscrição municipal:|56368  |  Inscrição estadual: 250515016\nEndereço:|Rua Padre Kolb, 723 – CEP: 89202-350 – Bairro: Bucarein – Joinville/SC'::text)
  where key='proposta_dados_faturamento' and coalesce(value #>> '{}','')='';