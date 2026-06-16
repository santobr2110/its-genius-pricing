/**
 * Catálogo de chaves de parâmetros segmentadas por oferta.
 *
 * Usado por `useParameterProfiles`, `SaveDefaultsButton` e
 * `DefaultsAdminTab` para snapshotar e aplicar parâmetros por escopo
 * (Smart ITO vs BodyShop).
 */
import { SMART_ITO_NS } from "@/lib/offerings";

export type ParamOffering = "smart-ito" | "profissionais-alocados";

// ---- Smart ITO ----
const SMART_ITO_RAW = [
  "itsm:calculator:v1",
  "itsm:n1team:v1",
  "itsm:n2team:v1",
  "itsm:fieldteams:v1",
  "gestao-ti:rotinas",
  "gestao-ti:gmuds",
  "gestao-ti:smartPerf:n3Cortes",
  "escopo:proposicao",
  "escopo:restricoesGerais",
  "escopo:itensAdicionais",
] as const;

export const SMART_ITO_PARAM_KEYS: string[] = SMART_ITO_RAW.map(
  (k) => SMART_ITO_NS + k,
);

// Chaves Smart ITO gravadas sem namespace (compatibilidade histórica:
// página `/financeiro/impostos`).
const SMART_ITO_UNNAMESPACED = [
  "financeiro.codigoProduto",
  "financeiro.cidadeIss",
] as const;
SMART_ITO_PARAM_KEYS.push(...SMART_ITO_UNNAMESPACED);

// ---- BodyShop (Profissionais Alocados) ----
// Chaves namespeadas por SMART_ITO_NS por razões históricas (usePersistentState),
// mas são parâmetros do BodyShop.
const BODYSHOP_NAMESPACED = [
  "prof.financeiro.codigoProduto",
  "prof.financeiro.cidadeIss",
] as const;
// Chaves cruas (useProfFinanceiro grava direto em localStorage).
const BODYSHOP_RAW = [
  "prof.fin.state.v1",
  "prof.fin.comissaoTiers.v1",
] as const;

export const BODYSHOP_PARAM_KEYS: string[] = [
  ...BODYSHOP_NAMESPACED.map((k) => SMART_ITO_NS + k),
  ...BODYSHOP_RAW,
];

// União usada por código legado (ex.: SaveDefaultsButton sem oferta).
export const ALL_PARAM_KEYS: string[] = [
  ...SMART_ITO_PARAM_KEYS,
  ...BODYSHOP_PARAM_KEYS,
];

export function keysForOffering(offering: ParamOffering): string[] {
  return offering === "smart-ito" ? SMART_ITO_PARAM_KEYS : BODYSHOP_PARAM_KEYS;
}

export const OFFERING_LABEL: Record<ParamOffering, string> = {
  "smart-ito": "Smart ITO",
  "profissionais-alocados": "BodyShop",
};

/** Mapeia um path do app para a oferta correspondente. */
export function offeringFromPath(pathname: string): ParamOffering {
  return pathname.startsWith("/profissionais-alocados")
    ? "profissionais-alocados"
    : "smart-ito";
}
