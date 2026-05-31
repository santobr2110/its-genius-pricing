-- Add soft-delete to pricing_presets
ALTER TABLE public.pricing_presets ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.pricing_presets ADD COLUMN IF NOT EXISTS deleted_by uuid;

CREATE INDEX IF NOT EXISTS pricing_presets_deleted_at_idx ON public.pricing_presets(deleted_at);

-- Allow admins to view all presets (including deleted ones) for the trash UI
DROP POLICY IF EXISTS pp_select_own ON public.pricing_presets;
CREATE POLICY pp_select_own_or_admin
ON public.pricing_presets
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR app_private.is_admin(auth.uid()));

-- Allow admins to update (restore / permanent delete via update) any preset
DROP POLICY IF EXISTS pp_update_own ON public.pricing_presets;
CREATE POLICY pp_update_own_or_admin
ON public.pricing_presets
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR app_private.is_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR app_private.is_admin(auth.uid()));

-- Allow admins to permanently delete from trash
DROP POLICY IF EXISTS pp_delete_own ON public.pricing_presets;
CREATE POLICY pp_delete_own_or_admin
ON public.pricing_presets
FOR DELETE
TO authenticated
USING (user_id = auth.uid() OR app_private.is_admin(auth.uid()));