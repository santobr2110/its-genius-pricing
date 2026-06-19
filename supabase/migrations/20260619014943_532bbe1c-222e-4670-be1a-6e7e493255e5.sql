-- Harden public.is_admin: ignore the passed UUID and always evaluate against
-- the current authenticated user. Prevents authenticated users from probing
-- whether any arbitrary UUID belongs to an admin via the Data API, while
-- keeping the existing signature so RLS policies continue to compile.
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.slug = 'admin'
  )
$function$;

COMMENT ON FUNCTION public.is_admin(uuid) IS
  'Returns whether the CURRENT authenticated user is an admin. The _user_id parameter is intentionally ignored to prevent role-membership probing of arbitrary UUIDs via the Data API.';
