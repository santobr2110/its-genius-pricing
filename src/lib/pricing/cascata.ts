// Motor de cascata compartilhado (markup divisor): PV = custo / (1 − Σ%/100).
// Mesma fórmula do Smart ITO (useITSMCalculator / recomputeComposicaoComExtras).
// Fase 1B: Smart ITO, BodyShop e Treinamento usam este módulo (adaptadores REGRA_* abaixo).

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

// ---------- Adaptadores por oferta (Fase 1B) ----------
// Um único núcleo (cascataNucleo) com as regras de borda de cada oferta declaradas
// explicitamente. As regras reproduzem o comportamento histórico e NÃO devem ser
// "harmonizadas": fazê-lo mudaria preços já salvos (ver src/test/naoRegressao.test.ts).

export type CascataPercKey =
  | "pis" | "cofins" | "iss" | "comissao" | "irpjCsll" | "encFinanc" | "lucro";
export type CascataPercs = Record<CascataPercKey, number>;

export interface RegraTetoSigma {
  /** Componentes negativos/NaN viram 0 antes da soma. */
  zerarNegativos: boolean;
  /** Σ é limitado a [piso, teto] antes de calcular o divisor (null = sem limite). */
  sigmaPiso: number | null;
  sigmaTeto: number | null;
  /** Divisor: "restante" = (100 − Σ)/100 ; "umMenos" = 1 − Σ/100 (diferença só de ponto flutuante). */
  divisor: "restante" | "umMenos";
  /** PV quando o divisor ≤ 0: "zero" ou "custo" (repassa o custo sem markup). */
  semDivisor: "zero" | "custo";
  /** Ordem da soma de Σ (preserva o arredondamento binário histórico). */
  ordem: CascataPercKey[];
}

const ORDEM_ITSM: CascataPercKey[] = ["pis", "cofins", "iss", "comissao", "irpjCsll", "encFinanc", "lucro"];
const ORDEM_PROF: CascataPercKey[] = ["pis", "cofins", "iss", "irpjCsll", "encFinanc", "comissao", "lucro"];

/** Smart ITO (useITSMCalculator e recomputeComposicaoComExtras): sem teto; Σ ≥ 100 ⇒ PV 0. */
export const REGRA_SMART_ITO: RegraTetoSigma = {
  zerarNegativos: true, sigmaPiso: null, sigmaTeto: null, divisor: "restante", semDivisor: "zero", ordem: ORDEM_ITSM,
};
/** BodyShop — custo por profissional (lib/profissionais/calc.ts): Σ limitado a [0, 99]; nunca fica sem preço. */
export const REGRA_BODYSHOP_PROFISSIONAL: RegraTetoSigma = {
  zerarNegativos: false, sigmaPiso: 0, sigmaTeto: 99, divisor: "umMenos", semDivisor: "custo", ordem: ORDEM_ITSM,
};
/** BodyShop — composição financeira (useProfFinanceiro): Σ limitado a 99,999 (sem piso); componentes não são zerados. */
export const REGRA_BODYSHOP_FINANCEIRO: RegraTetoSigma = {
  zerarNegativos: false, sigmaPiso: null, sigmaTeto: 99.999, divisor: "umMenos", semDivisor: "zero", ordem: ORDEM_PROF,
};

export interface CascataNucleoResult {
  percs: CascataPercs;
  /** Σ antes do teto (é o que as telas exibem). */
  totalEncargosPerc: number;
  precoVenda: number;
  valores: CascataPercs;
}

export function cascataNucleo(custo: number, percsIn: CascataPercs, regra: RegraTetoSigma): CascataNucleoResult {
  const percs = { ...percsIn };
  if (regra.zerarNegativos) for (const k of regra.ordem) percs[k] = Math.max(0, percs[k] || 0);
  let total = 0;
  for (const k of regra.ordem) total += percs[k];
  let sigma = total;
  if (regra.sigmaPiso != null) sigma = Math.max(regra.sigmaPiso, sigma);
  if (regra.sigmaTeto != null) sigma = Math.min(regra.sigmaTeto, sigma);
  let pv: number;
  if (regra.divisor === "restante") {
    const restante = 100 - sigma;
    const f = restante > 0 ? restante / 100 : 0;
    pv = f > 0 ? custo / f : regra.semDivisor === "custo" ? custo : 0;
  } else {
    const d = 1 - sigma / 100;
    pv = d > 0 ? custo / d : regra.semDivisor === "custo" ? custo : 0;
  }
  const valores = {} as CascataPercs;
  for (const k of regra.ordem) valores[k] = (pv * percs[k]) / 100;
  return { percs, totalEncargosPerc: total, precoVenda: pv, valores };
}

/** Composição completa do Smart ITO (mesmos campos de ITSMResults.composicaoPreco). */
export function composicaoSmartITO(custo: number, p: CascataPercs) {
  const r = cascataNucleo(custo, p, REGRA_SMART_ITO);
  const v = r.valores, pv = r.precoVenda;
  const precoPreImposto = pv - (v.pis + v.cofins + v.iss);
  return {
    precoVenda: pv,
    precoPreImposto,
    valorImpostos: v.pis + v.cofins + v.iss + v.irpjCsll + v.encFinanc,
    valorMargem: v.lucro,
    composicao: {
      custo,
      pis: v.pis, cofins: v.cofins, iss: v.iss, comissao: v.comissao,
      irpjCsll: v.irpjCsll, encFinanc: v.encFinanc, lucro: v.lucro,
      precoVenda: pv,
      totalEncargosPerc: r.totalEncargosPerc,
      custoPerc: 100 - r.totalEncargosPerc,
      receitaLiquida: precoPreImposto,
      margemContribuicao: pv - custo - (v.pis + v.cofins + v.iss + v.comissao),
      resultadoOperacional: v.lucro,
    },
  };
}

/** Lê os 7 percentuais de qualquer estado com os campos *Perc. */
export function percsFromState(s: {
  pisPerc: number; cofinsPerc: number; issPerc: number; comissaoPerc: number;
  irpjCsllPerc: number; encFinancPerc: number; lucroPerc: number;
}): CascataPercs {
  return {
    pis: s.pisPerc, cofins: s.cofinsPerc, iss: s.issPerc, comissao: s.comissaoPerc,
    irpjCsll: s.irpjCsllPerc, encFinanc: s.encFinancPerc, lucro: s.lucroPerc,
  };
}
