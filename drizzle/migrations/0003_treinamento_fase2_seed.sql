INSERT INTO public.training_courses (slug,fabricante,nome,tipo,part_number_interno,horas_execucao,dias,nivel_instrutor,custo_material_aluno,custo_cloud_aluno,min_alunos,max_alunos,valor_fabricante,permite_somente_exame,custo_pendente,campos_a_confirmar,ativo,ordem) VALUES
('zcu','zabbix','Zabbix Certified User','curso','TRN-OFC-ZCU',8,1,'A',350,0,20,NULL,2480,true,false,'{max_alunos}',true,10),
('zcs','zabbix','Zabbix Certified Specialist','curso','TRN-OFC-ZCS',40,5,'A',1300,0,10,NULL,8090,true,false,'{max_alunos}',true,20),
('zcp','zabbix','Zabbix Certified Professional','curso','TRN-OFC-ZCP',24,3,'B',1300,0,10,NULL,7430,true,false,'{max_alunos}',true,30),
('zcs-zcp','zabbix','Combo ZCS + ZCP','combo','TRN-OFC-ZCS-ZCP',64,8,'B',2250,0,10,NULL,13040,false,false,'{max_alunos,nivel_instrutor}',true,40),
('zce','zabbix','Zabbix Certified Expert','curso','TRN-OFC-ZCE',40,5,'B',2200,0,5,NULL,12870,false,false,'{max_alunos}',true,50),
('zcs-zcp-zce','zabbix','Combo ZCS + ZCP + ZCE','combo',NULL,104,13,NULL,0,0,5,NULL,NULL,false,true,'{custo}',false,60),
('zextra','zabbix','Zabbix Extras (especialização, 1 dia)','extra','TRN-OFC-ZEXTRA',8,1,'B',300,0,5,NULL,1950,false,false,'{max_alunos}',true,70),
('zextra-api','zabbix','Automation and Integration with Zabbix API','extra',NULL,8,1,'B',300,0,5,NULL,1950,false,false,'{max_alunos,ementa,preco,part_number_interno}',true,71),
('zextra-preproc','zabbix','Advanced Zabbix Data Pre-processing','extra',NULL,8,1,'B',300,0,5,NULL,1950,false,false,'{max_alunos,ementa,preco,part_number_interno}',true,72),
('zextra-security','zabbix','Advanced Zabbix Security Administration','extra',NULL,8,1,'B',300,0,5,NULL,1950,false,false,'{max_alunos,ementa,preco,part_number_interno}',true,73),
('zextra-anomaly','zabbix','Advanced Problem and Anomaly Detection','extra',NULL,8,1,'B',300,0,5,NULL,1950,false,false,'{max_alunos,ementa,preco,part_number_interno}',true,74),
('zextra-snmp','zabbix','Advanced Zabbix SNMP monitoring','extra',NULL,8,1,'B',300,0,5,NULL,1950,false,false,'{max_alunos,ementa,preco,part_number_interno}',true,75),
('grafana-corp','grafana','Grafana Corporate','curso','TRN-CORP-ONL-GRF',20,NULL,'A',0,120,10,25,NULL,false,false,'{dias}',true,80),
('exm-zcu','zabbix','Exame ZCU','exame','EXM-ZCU',0,NULL,NULL,120,0,1,NULL,360,false,false,'{}',true,110),
('exm-zcs','zabbix','Exame ZCS','exame','EXM-ZCS',0,NULL,NULL,900,0,1,NULL,1820,false,false,'{}',true,120),
('exm-zcp','zabbix','Exame ZCP','exame','EXM-ZCP',0,NULL,NULL,900,0,1,NULL,1820,false,false,'{}',true,130),
('exm-rtk','zabbix','Exame Retake','exame','EXM-RTK',0,NULL,NULL,600,0,1,NULL,1160,false,false,'{}',true,140);
UPDATE public.training_courses c SET exame_course_id=e.id FROM public.training_courses e WHERE (c.slug,e.slug) IN (('zcu','exm-zcu'),('zcs','exm-zcs'),('zcp','exm-zcp'));
UPDATE public.training_courses c SET prerequisito_course_id=p.id FROM public.training_courses p WHERE (c.slug,p.slug) IN (('zcp','zcs'),('zce','zcp'));
INSERT INTO public.training_combo_items (combo_id,course_id,ordem)
SELECT cb.id, it.id, x.o FROM (VALUES ('zcs-zcp','zcs',1),('zcs-zcp','zcp',2),('zcs-zcp-zce','zcs',1),('zcs-zcp-zce','zcp',2),('zcs-zcp-zce','zce',3)) x(c,i,o)
JOIN public.training_courses cb ON cb.slug=x.c JOIN public.training_courses it ON it.slug=x.i;
INSERT INTO public.training_course_content (course_id, pre_requisito, a_confirmar)
SELECT id, CASE slug WHEN 'zcs' THEN 'Conhecimentos básicos de Linux.' WHEN 'zcp' THEN 'Certificação ZCS da mesma versão.' WHEN 'zce' THEN 'Certificação ZCP.' END,
  slug LIKE 'zextra-%' FROM public.training_courses;
INSERT INTO public.training_params (key,label,value,tipo,status,ordem,descricao) VALUES
('taxa_hora_instrutor_A','Taxa/hora instrutor nível A','150','number','planilha',10,NULL),
('taxa_hora_instrutor_B','Taxa/hora instrutor nível B','180','number','planilha',20,NULL),
('taxa_hora_gestao','Taxa/hora de gestão','150','number','planilha',30,NULL),
('pct_horas_gestao','Horas de gestão (% das horas de execução)','20','percent','planilha',40,NULL),
('taxa_hora_instrutor_in_company','Taxa/hora instrutor In Company','250','number','simulado',50,NULL),
('locacao_diaria','Locação de sala (diária)','1800','number','simulado',60,NULL),
('in_company_inclui_gestao','In Company inclui gestão','true','boolean','a_confirmar',70,NULL),
('horas_por_dia','Horas por dia','8','number','planilha',80,NULL),
('validade_proposta_dias','Validade da proposta (dias)','30','number','proposta',90,NULL),
('irpjCsllConvencao','Convenção de IR/CSLL','"padrao_site"','text','decisao',100,'padrao_site ou roi_ito'),
('arredondamento_preco_aluno','Arredondamento do preço por aluno (R$, 0 = sem)','0','number','decisao',110,NULL),
('comissao_regra','Comissão','"comissaoRentabilidade"','text','reuso',120,'Mesma regra de comissão por rentabilidade do site'),
('encargos_lucro_regra','Encargos financeiros / lucro','"defaults_site"','text','reuso',130,'Mesmos defaults do site');