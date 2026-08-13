/**
 * Catálogo de chaves de parâmetros segmentadas por oferta.
 *
 * Usado por `useParameterProfiles`, `SaveDefaultsButton` e
 * `DefaultsAdminTab` para snapshotar e aplicar parâmetros por escopo
 * (Smart ITO vs BodyShop).
 */
import { SMART_ITO_NS, SMART_SERVICE_DESK_NS } from "@/lib/offerings";

export type ParamOffering = "smart-ito" | "profissionais-alocados" | "smart-service-desk";

// ---- Smart ITO ----
const SMART_ITO_RAW = [
  "itsm:calculator:v1",
  "itsm:n1team:v1",
  "itsm:n2team:v1",
  "gestao-ti:rotinas",
  "gestao-ti:gmuds",
  "gestao-ti:rotinasOff",
  "gestao-ti:smartPerf:n3Cortes",
  "gestao-ti:smartPerf:n3AllocHoras",
  "gestao-ti:smartOp:horasMelhoria",
  "gestao-ti:smartPerf:horasMelhoria",
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

// ---- Smart Service Desk ----
const SMART_SERVICE_DESK_RAW = [
  "sd:state:v1",
  "team:v1",
  "sd:itensAdicionais",
  "sd:rotinasOff",
  "sd:escopo",
] as const;

export const SMART_SERVICE_DESK_PARAM_KEYS: string[] = SMART_SERVICE_DESK_RAW.map(
  (k) => SMART_SERVICE_DESK_NS + k,
);

/** Chaves do Service Desk que pertencem à precificação (nunca ao perfil padrão). */
export const SD_PRICING_OWNED_PARAM_KEYS: string[] = [
  "sd:rotinasOff",
  "sd:escopo",
].map((k) => SMART_SERVICE_DESK_NS + k);

// União usada por código legado (ex.: SaveDefaultsButton sem oferta).
export const ALL_PARAM_KEYS: string[] = [
  ...SMART_ITO_PARAM_KEYS,
  ...BODYSHOP_PARAM_KEYS,
  ...SMART_SERVICE_DESK_PARAM_KEYS,
];

export function keysForOffering(offering: ParamOffering): string[] {
  if (offering === "smart-ito") return SMART_ITO_PARAM_KEYS;
  if (offering === "smart-service-desk") return SMART_SERVICE_DESK_PARAM_KEYS;
  return BODYSHOP_PARAM_KEYS;
}

/**
 * Chaves cujo conteúdo pertence à PRECIFICAÇÃO (e não ao perfil de parâmetros):
 * escopo da proposta, restrições, itens adicionais, distribuição das horas N3
 * e horas de melhoria. Ao abrir uma precificação salva, esses valores devem vir
 * sempre do snapshot salvo — nunca do perfil de parâmetros padrão.
 */
export const PRICING_OWNED_PARAM_KEYS: string[] = [
  "gestao-ti:rotinasOff",
  "gestao-ti:smartPerf:n3Cortes",
  "gestao-ti:smartPerf:n3AllocHoras",
  "gestao-ti:smartOp:horasMelhoria",
  "gestao-ti:smartPerf:horasMelhoria",
  "escopo:proposicao",
  "escopo:restricoesGerais",
  "escopo:itensAdicionais",
].map((k) => SMART_ITO_NS + k);

export const OFFERING_LABEL: Record<ParamOffering, string> = {
  "smart-ito": "Smart ITO",
  "profissionais-alocados": "BodyShop",
  "smart-service-desk": "Smart Service Desk",
};

/** Mapeia um path do app para a oferta correspondente. */
export function offeringFromPath(pathname: string): ParamOffering {
  if (pathname.startsWith("/profissionais-alocados")) return "profissionais-alocados";
  if (pathname.startsWith("/service-desk")) return "smart-service-desk";
  return "smart-ito";
}
