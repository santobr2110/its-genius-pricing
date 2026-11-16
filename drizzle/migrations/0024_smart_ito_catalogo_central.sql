CREATE TABLE public.smart_ito_catalogo (
  tipo text PRIMARY KEY CHECK (tipo IN ('rotinas','gmuds')),
  conteudo jsonb NOT NULL,
  versao integer NOT NULL,
  updated_by uuid,
  autor_nome text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.smart_ito_catalogo TO authenticated;
GRANT ALL ON public.smart_ito_catalogo TO service_role;
ALTER TABLE public.smart_ito_catalogo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados leem o catálogo central" ON public.smart_ito_catalogo
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE TABLE public.smart_ito_catalogo_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('rotinas','gmuds')),
  versao integer NOT NULL,
  conteudo jsonb NOT NULL,
  updated_by uuid,
  autor_nome text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  comentario text,
  UNIQUE (tipo, versao)
);
GRANT SELECT ON public.smart_ito_catalogo_historico TO authenticated;
GRANT ALL ON public.smart_ito_catalogo_historico TO service_role;
ALTER TABLE public.smart_ito_catalogo_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados leem o histórico do catálogo" ON public.smart_ito_catalogo_historico
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.publicar_catalogo_smart_ito(_tipo text, _conteudo jsonb, _versao_base integer, _comentario text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  atual integer;
  nova integer;
  nome text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  IF NOT public.has_permission(auth.uid(), 'smart_ito.catalogo.write') THEN
    RAISE EXCEPTION 'Sem permissão para publicar o catálogo central';
  END IF;
  IF _tipo NOT IN ('rotinas','gmuds') THEN
    RAISE EXCEPTION 'Tipo de catálogo inválido';
  END IF;
  IF _conteudo IS NULL OR jsonb_typeof(_conteudo) <> 'array' THEN
    RAISE EXCEPTION 'Conteúdo do catálogo inválido';
  END IF;

  SELECT versao INTO atual FROM public.smart_ito_catalogo WHERE tipo = _tipo FOR UPDATE;
  IF COALESCE(atual, 0) <> COALESCE(_versao_base, -1) THEN
    RAISE EXCEPTION 'CONFLITO_VERSAO: O catálogo foi alterado por outra pessoa. Recarregue e refaça suas alterações.';
  END IF;

  nova := COALESCE(atual, 0) + 1;
  SELECT COALESCE(NULLIF(full_name, ''), email) INTO nome FROM public.profiles WHERE id = auth.uid();

  IF atual IS NULL THEN
    BEGIN
      INSERT INTO public.smart_ito_catalogo (tipo, conteudo, versao, updated_by, autor_nome, updated_at)
      VALUES (_tipo, _conteudo, nova, auth.uid(), nome, now());
    EXCEPTION WHEN unique_violation THEN
      RAISE EXCEPTION 'CONFLITO_VERSAO: O catálogo foi alterado por outra pessoa. Recarregue e refaça suas alterações.';
    END;
  ELSE
    UPDATE public.smart_ito_catalogo
      SET conteudo = _conteudo, versao = nova, updated_by = auth.uid(), autor_nome = nome, updated_at = now()
      WHERE tipo = _tipo;
  END IF;

  INSERT INTO public.smart_ito_catalogo_historico (tipo, versao, conteudo, updated_by, autor_nome, updated_at, comentario)
  VALUES (_tipo, nova, _conteudo, auth.uid(), nome, now(), NULLIF(btrim(COALESCE(_comentario, '')), ''));

  RETURN nova;
END;
$$;

REVOKE ALL ON FUNCTION public.publicar_catalogo_smart_ito(text, jsonb, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publicar_catalogo_smart_ito(text, jsonb, integer, text) TO authenticated;