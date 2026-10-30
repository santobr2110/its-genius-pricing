INSERT INTO public.service_codes (lc116_item, descricao, pis_perc, cofins_perc, a_confirmar)
SELECT '1.06','Assessoria e consultoria em informática',0.65,3.00,true
WHERE NOT EXISTS (SELECT 1 FROM public.service_codes WHERE lc116_item='1.06');
INSERT INTO public.service_code_iss (service_code_id, municipio, iss_perc, vigencia_inicio, a_confirmar)
SELECT sc.id, m.mun, 2.00, '2000-01-01', true
FROM public.service_codes sc CROSS JOIN (VALUES ('Joinville'),('Blumenau'),('Barueri')) m(mun)
WHERE sc.lc116_item='1.06'
AND NOT EXISTS (SELECT 1 FROM public.service_code_iss i WHERE i.service_code_id=sc.id);
INSERT INTO public.tax_product_codes (codigo, nome, lc116_item, ofertas, a_confirmar, ativo, service_code_id, usa_aliquota_propria)
SELECT 'SRE','Serviços profissionais consultivos Zabbix (pacote de horas)','1.06',ARRAY['consultivo-sre'],true,true,sc.id,false
FROM public.service_codes sc WHERE sc.lc116_item='1.06'
AND NOT EXISTS (SELECT 1 FROM public.tax_product_codes WHERE codigo='SRE');
INSERT INTO public.offerings (group_id, slug, name, sort_order, status)
SELECT g.id,'consultivo-sre','Pacotes Consultivos Zabbix SRE',30,'active'
FROM public.groups g WHERE g.slug='observabilidade'
AND NOT EXISTS (SELECT 1 FROM public.offerings o WHERE o.group_id=g.id AND o.slug='consultivo-sre');
INSERT INTO public.role_permissions (role_id, permission_key, allowed)
SELECT rp.role_id, k.key, true FROM public.role_permissions rp
CROSS JOIN (VALUES ('page.sre.view'),('page.sre.quote'),('page.sre.proposal')) k(key)
WHERE rp.permission_key='page.zbx.view' AND rp.allowed
ON CONFLICT (role_id, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_key, allowed)
SELECT rp.role_id, k.key, true FROM public.role_permissions rp
CROSS JOIN (VALUES ('page.sre.params'),('page.sre.admin'),('page.sre.approve')) k(key)
WHERE rp.permission_key='admin.roles.manage' AND rp.allowed
ON CONFLICT (role_id, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_key, allowed)
SELECT rp.role_id, 'offering.observabilidade.consultivo-sre.access', true FROM public.role_permissions rp
WHERE rp.permission_key='offering.observabilidade.subscricoes-zabbix.access' AND rp.allowed
ON CONFLICT (role_id, permission_key) DO NOTHING;