import { DEFAULT_COMISSAO_TIERS, type ComissaoTier } from "@/lib/comissaoRentabilidade";

export const PARAMETROS_FINANCEIROS_KEY = "pricing.parametros_compartilhados.v1";
export const IRPJ_CSLL_PADRAO = 10.34;
export interface ParametrosFinanceiros { irpjCsllPerc: number; comissaoTiers: ComissaoTier[] }
export function parametrosFinanceiros(value: unknown): ParametrosFinanceiros {
  const v = value as Partial<ParametrosFinanceiros> | null;
  return {
    irpjCsllPerc: typeof v?.irpjCsllPerc === "number" && Number.isFinite(v.irpjCsllPerc) && v.irpjCsllPerc >= 0 && v.irpjCsllPerc < 100 ? v.irpjCsllPerc : IRPJ_CSLL_PADRAO,
    comissaoTiers: Array.isArray(v?.comissaoTiers) ? v.comissaoTiers : DEFAULT_COMISSAO_TIERS,
  };
}
/** Imposto histórico explícito prevalece; rentabilidade nunca participa desta resolução. */
export function irpjEfetivo(central: number, congelado?: number | null): number {
  return congelado != null ? congelado : central;
}