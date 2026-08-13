import {
  CAC_FACTOR_SD,
  FREQ_SD_TO_CHAMADOS,
  type RotinaSD,
} from "@/data/rotinasServiceDesk";

export interface RotinaSDContexto {
  qtdEstacoes: number;
  qtdUsuarios: number;
  valorHora: number;
}

export interface RotinaSDCalculada {
  rotina: RotinaSD;
  /** Ocorrências previstas no mês (já multiplicadas pela abrangência). */
  demandaMes: number;
  horasMes: number;
  custoMes: number;
}

function multiplicador(r: RotinaSD, ctx: RotinaSDContexto): number {
  switch (r.abrangencia) {
    case "Estação":
      return Math.max(0, ctx.qtdEstacoes || 0);
    case "Usuário":
      return Math.max(0, ctx.qtdUsuarios || 0);
    default:
      return 1;
  }
}

/**
 * demanda × horas × valorHora × fatorAutomação, com CAC aplicado —
 * mesma fórmula usada nos extras operacionais do Smart ITO.
 */
export function computeRotinaSD(r: RotinaSD, ctx: RotinaSDContexto): RotinaSDCalculada {
  const freq = FREQ_SD_TO_CHAMADOS[r.frequencia] ?? 0;
  const demandaMes = freq * multiplicador(r, ctx);
  const fatorAutomacao = Math.max(0, 1 - (r.automacaoPct || 0) / 100);
  const horasMes = demandaMes * (r.horasExecucao || 0) * fatorAutomacao * (1 + CAC_FACTOR_SD);
  const custoMes = horasMes * Math.max(0, ctx.valorHora || 0);
  return { rotina: r, demandaMes, horasMes, custoMes };
}

export interface RotinasSDResultado {
  base: RotinaSDCalculada[];
  avancado: RotinaSDCalculada[];
  horasBase: number;
  horasAvancado: number;
  custoAvancado: number;
}

/**
 * Rotinas "Base" consomem a bolsa de horas técnicas já contratada;
 * rotinas "Avançado" são cobradas à parte.
 */
export function computeRotinasSD(
  rotinas: RotinaSD[],
  offSet: Set<string>,
  ctx: RotinaSDContexto,
): RotinasSDResultado {
  const ativas = rotinas.filter((r) => !offSet.has(r.id));
  const base: RotinaSDCalculada[] = [];
  const avancado: RotinaSDCalculada[] = [];
  for (const r of ativas) {
    const calc = computeRotinaSD(r, ctx);
    (r.nivel === "Avançado" ? avancado : base).push(calc);
  }
  return {
    base,
    avancado,
    horasBase: base.reduce((s, c) => s + c.horasMes, 0),
    horasAvancado: avancado.reduce((s, c) => s + c.horasMes, 0),
    custoAvancado: avancado.reduce((s, c) => s + c.custoMes, 0),
  };
}