/**
 * Catálogo central de rotinas e GMUDs do Smart ITO.
 *
 * - Fonte única (tabela `smart_ito_catalogo`), lida por todos; só a função
 *   `publicar_catalogo_smart_ito` grava (permissão `smart_ito.catalogo.write`).
 * - Fora do modo cotação, as telas leem o central; no modo cotação (`?preset=`)
 *   continuam lendo a cópia congelada na cotação.
 * - Enquanto o central não for inicializado, tudo segue usando o catálogo
 *   pessoal (comportamento anterior).
 */
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePersistentState } from "@/hooks/usePersistentState";
import { isPresetActive } from "@/lib/activePreset";
import { type Rotina, ROTINAS_DEFAULT } from "@/data/rotinas";
import { type Gmud, GMUDS_DEFAULT } from "@/data/gmuds";

export type CatalogoTipo = "rotinas" | "gmuds";

export interface CatalogoEntrada {
  conteudo: unknown[];
  versao: number;
  updatedAt: string | null;
  autorNome: string | null;
}

export interface CatalogoCentralState {
  loaded: boolean;
  rotinas: CatalogoEntrada | null;
  gmuds: CatalogoEntrada | null;
}

let estado: CatalogoCentralState = { loaded: false, rotinas: null, gmuds: null };
const ouvintes = new Set<() => void>();
let carregando: Promise<CatalogoCentralState> | null = null;
let focoRegistrado = false;

function emitir(novo: CatalogoCentralState) {
  estado = novo;
  ouvintes.forEach((l) => l());
}

export function getCatalogoCentralState(): CatalogoCentralState {
  return estado;
}

/** Busca (com dedupe) o catálogo central; atualiza o cache em memória. */
export function recarregarCatalogoCentral(): Promise<CatalogoCentralState> {
  if (carregando) return carregando;
  carregando = (async () => {
    const { data, error } = await supabase
      .from("smart_ito_catalogo")
      .select("tipo, conteudo, versao, updated_at, autor_nome");
    if (error) {
      // Falha de leitura: mantém o que havia (ou catálogo pessoal se nunca carregou).
      if (!estado.loaded) emitir({ ...estado, loaded: true });
      return estado;
    }
    const pick = (t: CatalogoTipo): CatalogoEntrada | null => {
      const r = (data ?? []).find((x) => x.tipo === t);
      if (!r) return null;
      return {
        conteudo: Array.isArray(r.conteudo) ? (r.conteudo as unknown[]) : [],
        versao: r.versao,
        updatedAt: r.updated_at,
        autorNome: r.autor_nome,
      };
    };
    const novo = { loaded: true, rotinas: pick("rotinas"), gmuds: pick("gmuds") };
    if (JSON.stringify(novo) !== JSON.stringify(estado)) emitir(novo);
    return estado;
  })().finally(() => {
    carregando = null;
  });
  return carregando;
}

function subscribe(l: () => void) {
  ouvintes.add(l);
  if (!focoRegistrado && typeof window !== "undefined") {
    focoRegistrado = true;
    window.addEventListener("focus", () => void recarregarCatalogoCentral());
  }
  return () => ouvintes.delete(l);
}

export function catalogoCentralInicializado(s: CatalogoCentralState = estado): boolean {
  return !!(s.rotinas || s.gmuds);
}

export function useCatalogoCentralState(): CatalogoCentralState {
  const s = useSyncExternalStore(subscribe, getCatalogoCentralState, getCatalogoCentralState);
  useEffect(() => {
    if (!estado.loaded) void recarregarCatalogoCentral();
  }, []);
  return s;
}

/**
 * Catálogo vigente para leitura (rotinas + GMUDs):
 * - modo cotação: cópia da cotação;
 * - fora dele: catálogo central (ou pessoal, se o central não existir).
 */
export function useCatalogoCentral() {
  const s = useCatalogoCentralState();
  const [rotinasPessoais] = usePersistentState<Rotina[]>("gestao-ti:rotinas", ROTINAS_DEFAULT);
  const [gmudsPessoais] = usePersistentState<Gmud[]>("gestao-ti:gmuds", GMUDS_DEFAULT);
  const cotacao = isPresetActive();
  return useMemo(() => {
    const usarCentral = !cotacao;
    const rotinas = usarCentral && s.rotinas ? (s.rotinas.conteudo as Rotina[]) : rotinasPessoais;
    const gmuds = usarCentral && s.gmuds ? (s.gmuds.conteudo as Gmud[]) : gmudsPessoais;
    const ultimo = [s.rotinas, s.gmuds]
      .filter(Boolean)
      .sort((a, b) => String(b!.updatedAt).localeCompare(String(a!.updatedAt)))[0] ?? null;
    return {
      rotinas,
      gmuds,
      versaoRotinas: s.rotinas?.versao ?? 0,
      versaoGmuds: s.gmuds?.versao ?? 0,
      atualizadoEm: ultimo?.updatedAt ?? null,
      atualizadoPor: ultimo?.autorNome ?? null,
      inicializado: catalogoCentralInicializado(s),
      loading: !s.loaded,
    };
  }, [s, cotacao, rotinasPessoais, gmudsPessoais]);
}

export class ConflitoCatalogoError extends Error {}

export const MSG_CONFLITO_CATALOGO =
  "O catálogo foi alterado por outra pessoa. Recarregue e refaça suas alterações.";

/** Publica uma nova versão; lança ConflitoCatalogoError se a base mudou. */
export async function publicarCatalogo(
  tipo: CatalogoTipo,
  conteudo: unknown[],
  versaoBase: number,
  comentario: string | null,
): Promise<number> {
  const { data, error } = await supabase.rpc("publicar_catalogo_smart_ito", {
    _tipo: tipo,
    _conteudo: conteudo as never,
    _versao_base: versaoBase,
    _comentario: comentario ?? "",
  });
  if (error) {
    if (error.message.includes("CONFLITO_VERSAO")) throw new ConflitoCatalogoError(MSG_CONFLITO_CATALOGO);
    throw new Error(error.message);
  }
  return data as number;
}

export interface CatalogoHistoricoItem {
  id: string;
  tipo: CatalogoTipo;
  versao: number;
  conteudo: unknown[];
  autorNome: string | null;
  updatedAt: string;
  comentario: string | null;
}

export async function listarHistoricoCatalogo(): Promise<CatalogoHistoricoItem[]> {
  const { data, error } = await supabase
    .from("smart_ito_catalogo_historico")
    .select("id, tipo, versao, conteudo, autor_nome, updated_at, comentario")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    tipo: r.tipo as CatalogoTipo,
    versao: r.versao,
    conteudo: Array.isArray(r.conteudo) ? (r.conteudo as unknown[]) : [],
    autorNome: r.autor_nome,
    updatedAt: r.updated_at,
    comentario: r.comentario,
  }));
}
