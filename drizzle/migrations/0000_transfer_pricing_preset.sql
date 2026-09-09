-- Lista de destinatários possíveis para transferência de precificação
CREATE OR REPLACE FUNCTION public.list_pricing_transfer_targets()
RETURNS TABLE (id uuid, full_name text, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.email
  FROM public.profiles p
  WHERE EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id)
    AND p.id <> auth.uid()
  ORDER BY COALESCE(p.full_name, p.email)
$$;

REVOKE ALL ON FUNCTION public.list_pricing_transfer_targets() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_pricing_transfer_targets() TO authenticated;

-- Transfere a titularidade de uma precificação para outro usuário
CREATE OR REPLACE FUNCTION public.transfer_pricing_preset(_preset_id uuid, _new_owner uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_owner uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT user_id INTO current_owner
  FROM public.pricing_presets
  WHERE id = _preset_id AND deleted_at IS NULL;

  IF current_owner IS NULL THEN
    RAISE EXCEPTION 'Precificação não encontrada';
  END IF;

  IF current_owner <> auth.uid() AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para transferir esta precificação';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _new_owner) THEN
    RAISE EXCEPTION 'Usuário de destino inválido';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _new_owner) THEN
    RAISE EXCEPTION 'Usuário de destino não possui perfil de acesso';
  END IF;

  UPDATE public.pricing_presets
  SET user_id = _new_owner, updated_at = now()
  WHERE id = _preset_id;
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_pricing_preset(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_pricing_preset(uuid, uuid) TO authenticated;