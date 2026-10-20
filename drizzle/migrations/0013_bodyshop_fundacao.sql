INSERT INTO public.role_permissions (role_id, permission_key, allowed)
SELECT rp.role_id, k.key, true FROM public.role_permissions rp
CROSS JOIN (VALUES ('page.prof.view'),('page.prof.quote')) k(key)
WHERE rp.permission_key='page.prof.selecao_manual' AND rp.allowed
ON CONFLICT (role_id, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_key, allowed)
SELECT rp.role_id, 'page.prof.proposal', true FROM public.role_permissions rp
WHERE rp.permission_key='prof.pricing.export' AND rp.allowed
ON CONFLICT (role_id, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_key, allowed)
SELECT rp.role_id, k.key, true FROM public.role_permissions rp
CROSS JOIN (VALUES ('page.prof.admin'),('page.prof.params'),('page.prof.approve')) k(key)
WHERE rp.permission_key='admin.roles.manage' AND rp.allowed
ON CONFLICT (role_id, permission_key) DO NOTHING;
INSERT INTO public.tax_product_codes (codigo, nome, lc116_item, ofertas, a_confirmar, ativo, service_code_id, usa_aliquota_propria)
SELECT 'BS','Alocação de profissionais de TI','17.05',ARRAY['bodyshop'],true,true,sc.id,false
FROM public.service_codes sc WHERE sc.lc116_item='17.05'
AND NOT EXISTS (SELECT 1 FROM public.tax_product_codes WHERE codigo='BS');
INSERT INTO public.offerings (group_id, slug, name, sort_order, status)
SELECT g.id,'profissionais-alocados','BodyShop - Alocação de Profissionais',
 COALESCE((SELECT max(sort_order)+1 FROM public.offerings WHERE group_id=g.id),0),'active'
FROM public.groups g WHERE g.slug='ito'
AND NOT EXISTS (SELECT 1 FROM public.offerings WHERE slug='profissionais-alocados');
