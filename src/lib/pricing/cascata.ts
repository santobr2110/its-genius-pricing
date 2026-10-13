// Motor de cascata compartilhado (markup divisor): PV = custo / (1 − Σ%/100).
// Mesma fórmula do Smart ITO (useITSMCalculator / recomputeComposicaoComExtras).
// Fase 1A: usado apenas pelo Treinamento; Smart ITO e BodyShop seguem com o código atual.

export interface CascataParams {
  pisPerc: number; cofinsPerc: number; issPerc: number;
  comissaoPerc: number; irpjCsllPerc: number;
  encFinancPerc: number; lucroPerc: number;
}

export interface CascataResult {
  custo: number; precoVenda: number; markup: number;
  pis: number; cofins: number; iss: number; comissao: number;
  irpjCsll: number; encFinanc: number; lucro: number;
  totalEncargosPerc: number; margemContribuicao: number;
  /** True quando Σ% ≥ 100 (não há preço possível). */
  invalido: boolean;
}

const pos = (n: number) => Math.max(0, Number.isFinite(n) ? n : 0);

export function computeCascata(custo: number, p: CascataParams): CascataResult {
  const perc = {
    pis: pos(p.pisPerc), cofins: pos(p.cofinsPerc), iss: pos(p.issPerc),
    comissao: pos(p.comissaoPerc), irpjCsll: pos(p.irpjCsllPerc),
    encFinanc: pos(p.encFinancPerc), lucro: pos(p.lucroPerc),
  };
  const totalEncargosPerc = Object.values(perc).reduce((s, v) => s + v, 0);
  const c = pos(custo);
  if (totalEncargosPerc >= 100) {
    return {
      custo: c, precoVenda: 0, markup: 0, pis: 0, cofins: 0, iss: 0, comissao: 0,
      irpjCsll: 0, encFinanc: 0, lucro: 0, totalEncargosPerc, margemContribuicao: 0, invalido: true,
    };
  }
  const pv = c / (1 - totalEncargosPerc / 100);
  const v = (x: number) => (pv * x) / 100;
  const pis = v(perc.pis), cofins = v(perc.cofins), iss = v(perc.iss), comissao = v(perc.comissao);
  return {
    custo: c,
    precoVenda: pv,
    markup: c > 0 ? pv / c : 0,
    pis, cofins, iss, comissao,
    irpjCsll: v(perc.irpjCsll),
    encFinanc: v(perc.encFinanc),
    lucro: v(perc.lucro),
    totalEncargosPerc,
    margemContribuicao: pv - c - (pis + cofins + iss + comissao),
    invalido: false,
  };
}

// ---------- Convenção de IR/CSLL ----------

export type IrpjCsllConvencao = "padrao_site" | "roi_ito";

export interface IrpjCsllParams {
  /** Percentual fixo sobre o PV na convenção padrao_site (default 10,30). */
  padraoPerc?: number;
  /** ROI desejado (% do PV) na convenção roi_ito (default 20). */
  roiPerc?: number;
  /** Alíquota efetiva de IR+CSLL sobre o lucro pré-imposto (fração). [A CONFIRMAR] */
  aliquotaEfetiva?: number;
}

export const DEFAULT_IRPJ_CSLL_PADRAO = 10.3;
export const DEFAULT_IRPJ_CSLL_ROI = 20;
/** Calibrada para ≈13,8% do PV com ROI 20% (valor do documento). [A CONFIRMAR] */
export const DEFAULT_IRPJ_CSLL_ALIQUOTA_ROI = 0.4083;

/**
 * Percentual de IR/CSLL a injetar na cascata.
 * - padrao_site: percentual fixo sobre o PV.
 * - roi_ito: imposto sobre o lucro pré-imposto (ROI + IR/CSLL), ou seja
 *   ir = a × (roi + ir) ⇒ ir = a·roi / (1 − a).
 */
export function resolveIrpjCsllPerc(convencao: IrpjCsllConvencao, params: IrpjCsllParams = {}): number {
  if (convencao === "roi_ito") {
    const roi = pos(params.roiPerc ?? DEFAULT_IRPJ_CSLL_ROI);
    const a = Math.min(0.99, pos(params.aliquotaEfetiva ?? DEFAULT_IRPJ_CSLL_ALIQUOTA_ROI));
    return (a * roi) / (1 - a);
  }
  return pos(params.padraoPerc ?? DEFAULT_IRPJ_CSLL_PADRAO);
}
