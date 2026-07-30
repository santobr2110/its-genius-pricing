ALTER TABLE public.approval_decisions ALTER COLUMN role_id DROP NOT NULL;
ALTER TABLE public.approval_decisions DROP CONSTRAINT approval_decisions_role_id_fkey;
ALTER TABLE public.approval_decisions ADD CONSTRAINT approval_decisions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.approval_roles(id) ON DELETE SET NULL;