export interface CalcInput {
  salario: number;
  encargosPct: number;
  overheadPct: number;
  margemPct: number;
  horasMensais: number;
}

export interface CalcOutput {
  custoTotal: number;
  valorVenda: number;
  valorHora: number;
  valorSprint: number;
}

export function calcularPrecificacao(input: CalcInput): CalcOutput {
  const { salario, encargosPct, overheadPct, margemPct, horasMensais } = input;
  const custoTotal = salario * (1 + encargosPct / 100) * (1 + overheadPct / 100);
  const valorVenda = custoTotal * (1 + margemPct / 100);
  const valorHora = horasMensais > 0 ? valorVenda / horasMensais : 0;
  const valorSprint = valorHora * 80;
  return { custoTotal, valorVenda, valorHora, valorSprint };
}

export const NIVEIS = ["Júnior", "Pleno", "Sênior", "Especialista", "Coordenador", "Gerente"] as const;
export const REGIMES = ["Integral (100%)", "Meio período (50%)", "Por Sprint (quinzenal)"] as const;
export const DURACOES = ["3 meses", "6 meses", "12 meses", "24 meses ou mais"] as const;

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}