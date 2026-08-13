/**
 * Cascata financeira do Smart Service Desk (markup divisor único),
 * espelhando a composição usada no Smart ITO, porém isolada por namespace.
 *
 * PV = Custo / (1 - Σ% / 100)
 * Σ% = PIS + COFINS + ISS + Comissão + IRPJ/CSLL + Enc. Financeiros + Lucro
 */

export interface CascataPercentuais {
  pisPerc: number;
  cofinsPerc: number;
  issPerc: number;
  comissaoPerc: number;
  irpjCsllPerc: number;
  encFinancPerc: number;
  lucroPerc: number;
}

export const DEFAULT_CASCATA: CascataPercentuais = {
  pisPerc: 0.65,
  cofinsPerc: 3,
  issPerc: 2,
  comissaoPerc: 8.54,
  irpjCsllPerc: 10.3,
  encFinancPerc: 1.5,
  lucroPerc: 20,
};

export interface CascataResultado {
  pis: number;
  cofins: number;
  iss: number;
  comissao: number;
  irpjCsll: number;
  encFinanc: number;
  lucro: number;
  precoVenda: number;
  fatorVenda: number;
  totalPercentuais: number;
  receitaLiquida: number;
  margemContribuicao: number;
  resultadoOperacional: number;
  rentabilidadePct: number;
}

export function somaPercentuais(p: CascataPercentuais): number {
  return (
    Math.max(0, p.pisPerc || 0) +
    Math.max(0, p.cofinsPerc || 0) +
    Math.max(0, p.issPerc || 0) +
    Math.max(0, p.comissaoPerc || 0) +
    Math.max(0, p.irpjCsllPerc || 0) +
    Math.max(0, p.encFinancPerc || 0) +
    Math.max(0, p.lucroPerc || 0)
  );
}

export function computeCascata(custo: number, p: CascataPercentuais): CascataResultado {
  const custoTotal = Math.max(0, custo || 0);
  const total = somaPercentuais(p);
  const divisor = 1 - total / 100;
  const precoVenda = divisor > 0 ? custoTotal / divisor : 0;
  const val = (perc: number) => (precoVenda * Math.max(0, perc || 0)) / 100;
  const pis = val(p.pisPerc);
  const cofins = val(p.cofinsPerc);
  const iss = val(p.issPerc);
  const comissao = val(p.comissaoPerc);
  const irpjCsll = val(p.irpjCsllPerc);
  const encFinanc = val(p.encFinancPerc);
  const lucro = val(p.lucroPerc);
  return {
    pis,
    cofins,
    iss,
    comissao,
    irpjCsll,
    encFinanc,
    lucro,
    precoVenda,
    fatorVenda: divisor > 0 ? 1 / divisor : 0,
    totalPercentuais: total,
    receitaLiquida: precoVenda - (pis + cofins + iss),
    margemContribuicao: precoVenda - custoTotal - (pis + cofins + iss + comissao),
    resultadoOperacional: lucro,
    rentabilidadePct: precoVenda > 0 ? (lucro / precoVenda) * 100 : 0,
  };
}