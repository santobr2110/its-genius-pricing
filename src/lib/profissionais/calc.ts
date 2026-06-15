export interface CalcInput {
  salario: number;
  encargosPct: number;
  overheadPct: number;
  horasMensais: number;
  /** Markup divisor: somatório de % sobre o PV (PIS+COFINS+ISS+Comissão+ROI+IR/CSLL+EncFin). */
  markupDivisorPct: number;
}

export interface CalcOutput {
  custoTotal: number;
  valorVenda: number;
  valorHora: number;
  valorSprint: number;
  markupDivisorPct: number;
}

export function calcularPrecificacao(input: CalcInput): CalcOutput {
  const { salario, encargosPct, overheadPct, horasMensais, markupDivisorPct } = input;
  const custoTotal = salario * (1 + encargosPct / 100) * (1 + overheadPct / 100);
  const denom = 1 - Math.min(99, Math.max(0, markupDivisorPct)) / 100;
  const valorVenda = denom > 0 ? custoTotal / denom : custoTotal;
  const valorHora = horasMensais > 0 ? valorVenda / horasMensais : 0;
  const valorSprint = valorHora * 80;
  return { custoTotal, valorVenda, valorHora, valorSprint, markupDivisorPct };
}

export const NIVEIS = ["Júnior", "Pleno", "Sênior", "Especialista", "Coordenador", "Gerente"] as const;
export const REGIMES = ["Integral (100%)", "Meio período (50%)", "Por Sprint (quinzenal)"] as const;
export const DURACOES = ["3 meses", "6 meses", "12 meses", "24 meses ou mais"] as const;

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}