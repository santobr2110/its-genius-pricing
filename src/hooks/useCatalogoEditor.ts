/**
 * Fonte de edição da tela Gestão de TI.
 *
 * - "pessoal": catálogo central ainda não inicializado → comportamento antigo
 *   (edita o catálogo pessoal a cada alteração).
 * - "central-edicao": com `smart_ito.catalogo.write`, edita um RASCUNHO na tela
 *   e só grava ao Publicar.
 * - "central-leitura": sem a permissão, só leitura do central.
 * - "cotacao": modo cotação, só leitura da cópia congelada na cotação.
 */
import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";
import { isPresetActive } from "@/lib/activePreset";
import { useAuth } from "@/contexts/AuthContext";
import { type Rotina, ROTINAS_DEFAULT } from "@/data/rotinas";
import { type Gmud, GMUDS_DEFAULT } from "@/data/gmuds";
import {
  publicarCatalogo,
  recarregarCatalogoCentral,
  useCatalogoCentralState,
  catalogoCentralInicializado,
} from "@/hooks/useCatalogoCentral";
import { contarAlteracoesCatalogo } from "@/lib/catalogoCentral";

export type ModoCatalogo = "carregando" | "pessoal" | "central-edicao" | "central-leitura" | "cotacao";

const noop = () => undefined;

export function useCatalogoEditor() {
  const { can } = useAuth();
  const podeEditarCentral = can("smart_ito.catalogo.write");
  const cotacao = isPresetActive();
  const central = useCatalogoCentralState();
  const [rotinasPessoais, setRotinasPessoais] = usePersistentState<Rotina[]>("gestao-ti:rotinas", ROTINAS_DEFAULT);
  const [gmudsPessoais, setGmudsPessoais] = usePersistentState<Gmud[]>("gestao-ti:gmuds", GMUDS_DEFAULT);

  const inicializado = catalogoCentralInicializado(central);
  const modo: ModoCatalogo = cotacao
    ? "cotacao"
    : !central.loaded
      ? "carregando"
      : !inicializado
        ? "pessoal"
        : podeEditarCentral
          ? "central-edicao"
          : "central-leitura";

  // Base (versões) capturada ao abrir/descartar: trava contra publicação concorrente.
  const [base, setBase] = useState<{ rotinas: number; gmuds: number } | null>(null);
  const [rascunhoRotinas, setRascunhoRotinas] = useState<Rotina[] | null>(null);
  const [rascunhoGmuds, setRascunhoGmuds] = useState<Gmud[] | null>(null);

  const centralRotinas = (central.rotinas?.conteudo as Rotina[] | undefined) ?? rotinasPessoais;
  const centralGmuds = (central.gmuds?.conteudo as Gmud[] | undefined) ?? gmudsPessoais;

  const iniciarRascunho = useCallback(() => {
    setBase({ rotinas: central.rotinas?.versao ?? 0, gmuds: central.gmuds?.versao ?? 0 });
    setRascunhoRotinas(centralRotinas);
    setRascunhoGmuds(centralGmuds);
  }, [central, centralRotinas, centralGmuds]);

  const iniciadoRef = useRef(false);
  useEffect(() => {
    if (modo !== "central-edicao" || iniciadoRef.current) return;
    iniciadoRef.current = true;
    iniciarRascunho();
  }, [modo, iniciarRascunho]);

  let rotinas: Rotina[];
  let gmuds: Gmud[];
  let setRotinas: Dispatch<SetStateAction<Rotina[]>>;
  let setGmuds: Dispatch<SetStateAction<Gmud[]>>;
  if (modo === "pessoal") {
    rotinas = rotinasPessoais; gmuds = gmudsPessoais;
    setRotinas = setRotinasPessoais; setGmuds = setGmudsPessoais;
  } else if (modo === "central-edicao") {
    rotinas = rascunhoRotinas ?? centralRotinas; gmuds = rascunhoGmuds ?? centralGmuds;
    setRotinas = (v) => setRascunhoRotinas((p) => (typeof v === "function" ? (v as (x: Rotina[]) => Rotina[])(p ?? centralRotinas) : v));
    setGmuds = (v) => setRascunhoGmuds((p) => (typeof v === "function" ? (v as (x: Gmud[]) => Gmud[])(p ?? centralGmuds) : v));
  } else if (modo === "cotacao") {
    rotinas = rotinasPessoais; gmuds = gmudsPessoais; // no modo cotação = cópia da cotação
    setRotinas = noop; setGmuds = noop;
  } else {
    rotinas = centralRotinas; gmuds = centralGmuds;
    setRotinas = noop; setGmuds = noop;
  }

  const alteracoes = useMemo(() => {
    if (modo !== "central-edicao" || !rascunhoRotinas || !rascunhoGmuds) return 0;
    return (
      contarAlteracoesCatalogo(centralRotinas as unknown as { id: string }[], rascunhoRotinas as unknown as { id: string }[]) +
      contarAlteracoesCatalogo(centralGmuds as unknown as { id: string }[], rascunhoGmuds as unknown as { id: string }[])
    );
  }, [modo, centralRotinas, centralGmuds, rascunhoRotinas, rascunhoGmuds]);

  /** Publica apenas os tipos alterados. Lança ConflitoCatalogoError em caso de conflito. */
  const publicar = useCallback(async (comentario: string) => {
    if (modo !== "central-edicao" || !base || !rascunhoRotinas || !rascunhoGmuds) return;
    const alterouRotinas = contarAlteracoesCatalogo(centralRotinas as never, rascunhoRotinas as never) > 0;
    const alterouGmuds = contarAlteracoesCatalogo(centralGmuds as never, rascunhoGmuds as never) > 0;
    // Confere a versão atual antes de gravar (a função no banco também confere).
    const atual = await recarregarCatalogoCentral();
    const { ConflitoCatalogoError, MSG_CONFLITO_CATALOGO } = await import("@/hooks/useCatalogoCentral");
    if ((atual.rotinas?.versao ?? 0) !== base.rotinas || (atual.gmuds?.versao ?? 0) !== base.gmuds) {
      throw new ConflitoCatalogoError(MSG_CONFLITO_CATALOGO);
    }
    const nova = { ...base };
    if (alterouRotinas) nova.rotinas = await publicarCatalogo("rotinas", rascunhoRotinas, base.rotinas, comentario);
    if (alterouGmuds) nova.gmuds = await publicarCatalogo("gmuds", rascunhoGmuds, base.gmuds, comentario);
    await recarregarCatalogoCentral();
    setBase(nova);
  }, [modo, base, rascunhoRotinas, rascunhoGmuds, centralRotinas, centralGmuds]);

  const descartar = useCallback(async () => {
    const atual = await recarregarCatalogoCentral();
    setBase({ rotinas: atual.rotinas?.versao ?? 0, gmuds: atual.gmuds?.versao ?? 0 });
    setRascunhoRotinas((atual.rotinas?.conteudo as Rotina[] | undefined) ?? rotinasPessoais);
    setRascunhoGmuds((atual.gmuds?.conteudo as Gmud[] | undefined) ?? gmudsPessoais);
  }, [rotinasPessoais, gmudsPessoais]);

  /** Muda quando a fonte editável fica pronta — usado pelas migrações da tela. */
  const prontoParaMigrar =
    modo === "pessoal" || (modo === "central-edicao" && rascunhoRotinas !== null && rascunhoGmuds !== null);

  return {
    modo,
    central,
    rotinas,
    gmuds,
    setRotinas,
    setGmuds,
    alteracoes,
    publicar,
    descartar,
    prontoParaMigrar,
    podeEditarCentral,
    rotinasPessoais,
    gmudsPessoais,
    setRotinasPessoais,
    setGmudsPessoais,
  };
}
