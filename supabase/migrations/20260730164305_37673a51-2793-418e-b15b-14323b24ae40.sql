ALTER TABLE public.approval_role_members ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.approval_decisions ALTER COLUMN approver_user_id DROP NOT NULL;
DROP INDEX IF EXISTS public.approval_role_members_role_id_email_uidx;
CREATE UNIQUE INDEX approval_role_members_role_id_email_uidx ON public.approval_role_members (role_id, lower(email));