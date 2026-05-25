
insert into public.offerings (group_id, slug, name, status, sort_order)
select g.id, v.slug, v.name, 'coming_soon', v.sort
from public.groups g
cross join (values ('pacote-horas','Pacote de Horas',2),('bodyshop','Bodyshop',3)) as v(slug,name,sort)
where g.slug = 'ito'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_key, allowed)
select r.id, k.key, true
from public.roles r
cross join (values ('offering.ito.pacote-horas.access'),('offering.ito.bodyshop.access')) as k(key)
where r.slug = 'admin'
on conflict do nothing;
