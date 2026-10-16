import type { ITSMState } from "@/hooks/useITSMCalculator";
import type { NivelObservabilidade } from "@/lib/custoObservabilidadeNiveis";
import { resolveTaxRates, codigoServeOferta, type TaxCode, type TaxRate } from "./taxRates";

export const ITO_FISCAL_KEY = "smart-ito.produtos-por-composicao";
export const ITO_CAMADAS = ["Monitor", "Flow", "Operation", "Performance", "Enterprise"] as const;
export type CamadaFiscalITO = typeof ITO_CAMADAS[number];
export type VinculosFiscaisITO = Record<string, string>;
export const COMPOSICOES_ITO = ITO_CAMADAS.flatMap((camada) =>
  (["M1", "M2", "M3", "M4"] as NivelObservabilidade[])
    .filter((nivel) => nivel !== "M1" || camada === "Monitor" || camada === "Flow")
    .map((nivel) => ({ camada, nivel, key: `${camada}.${nivel}`, label: `Smart ${camada} ${nivel}` })),
);

export interface FiscalSnapshotITO {
  composicao: string;
  codigo: string;
  sku: string;
  municipio: string;
  dataRef: string;
  pisPerc: number;
  cofinsPerc: number;
  issPerc: number;
}

export function composicaoFiscalITO(state: ITSMState): string | null {
  if (state.modeloObservabilidade !== "niveis") return null;
  const camada = [...ITO_CAMADAS].reverse().find((c) => state[`tier${c}`]);
  if (!camada) return null;
  const key = `${camada}.${state.nivelObservabilidade ?? "M2"}`;
  return COMPOSICOES_ITO.some((c) => c.key === key) ? key : null;
}

export function resolverFiscalITO(state: ITSMState, vinculos: VinculosFiscaisITO, municipio: string, dataRef: string, codes: TaxCode[], rates: TaxRate[]): FiscalSnapshotITO | null {
  const composicao = composicaoFiscalITO(state);
  if (!composicao) return null;
  const codigo = vinculos[composicao];
  const produto = codes.find((c) => c.codigo === codigo && c.ativo && codigoServeOferta(c, "smart-ito"));
  if (!produto) return null;
  const r = resolveTaxRates(codigo, municipio, dataRef, codes, rates);
  if (!r) return null;
  return { composicao, codigo, sku: produto.nome, municipio, dataRef, pisPerc: r.pisPerc, cofinsPerc: r.cofinsPerc, issPerc: r.issPerc };
}

/** Cotações antigas não são migradas implicitamente; snapshots íntegros não seguem o cadastro vivo. */
export function deveAplicarFiscalITO(state: ITSMState, next: FiscalSnapshotITO | null, salva: boolean): boolean {
  if (!next) return false;
  const frozen = state.fiscalITO;
  if (salva) return !!frozen && frozen.composicao !== next.composicao;
  return JSON.stringify(frozen) !== JSON.stringify(next);
}

export function aplicarFiscalITO(state: ITSMState, fiscal: FiscalSnapshotITO): ITSMState {
  return { ...state, fiscalITO: fiscal, pisPerc: fiscal.pisPerc, cofinsPerc: fiscal.cofinsPerc, issPerc: fiscal.issPerc };
}