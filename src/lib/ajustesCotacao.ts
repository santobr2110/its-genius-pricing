/**
 * Ajustes de rotinas e GMUDs feitos só na cotação (não tocam o catálogo central).
 * Função pura usada por todos os cálculos e relatórios do Smart ITO.
 */
import { CAC_FACTOR, FREQ_TO_CHAMADOS, FREQUENCIAS, type Frequencia, type Rotina } from "@/data/rotinas";
import type { Gmud } from "@/data/gmuds";

export const AJUSTES_COTACAO_KEY = "gestao-ti:ajustesCotacao";

export interface AjusteRotina {
  frequencia?: Frequencia;
  automacao?: boolean;
  horasExecucao?: number;
}

export interface AjustesCotacao {
  gmudsOff: string[];
  rotinas: Record<string, AjusteRotina>;
}

export const AJUSTES_COTACAO_PADRAO: AjustesCotacao = { gmudsOff: [], rotinas: {} };

export type RotinaAjustada = Rotina & {
  ajustadaNaCotacao?: true;
  original?: { frequencia: Frequencia; automacao: boolean; horasExecucao?: number };
};

export interface Ignorado { tipo: "rotina" | "gmud"; id: string }

/** Normaliza valor salvo (ausente/legado/corrompido → padrão). */
export function normalizarAjustes(v: unknown): AjustesCotacao {
  const o = (v && typeof v === "object" ? v : {}) as Partial<AjustesCotacao>;
  const gmudsOff = Array.isArray(o.gmudsOff) ? o.gmudsOff.filter((x) => typeof x === "string") : [];
  const rotinas: Record<string, AjusteRotina> = {};
  if (o.rotinas && typeof o.rotinas === "object") {
    for (const [id, a] of Object.entries(o.rotinas)) {
      if (!a || typeof a !== "object") continue;
      const aj: AjusteRotina = {};
      if (a.frequencia && FREQUENCIAS.includes(a.frequencia)) aj.frequencia = a.frequencia;
      if (typeof a.automacao === "boolean") aj.automacao = a.automacao;
      if (typeof a.horasExecucao === "number" && a.horasExecucao > 0) aj.horasExecucao = a.horasExecucao;
      if (Object.keys(aj).length) rotinas[id] = aj;
    }
  }
  return { gmudsOff, rotinas };
}

export function aplicarAjustesCotacao<R extends Rotina, G extends Gmud>(
  rotinas: R[],
  gmuds: G[],
  ajustesBrutos: AjustesCotacao | null | undefined,
): { rotinas: (R & RotinaAjustada)[]; gmuds: G[]; ignorados: Ignorado[] } {
  const ajustes = normalizarAjustes(ajustesBrutos);
  const idsRot = new Set(rotinas.map((r) => r.id));
  const idsGmud = new Set(gmuds.map((g) => g.id));
  const ignorados: Ignorado[] = [
    ...Object.keys(ajustes.rotinas).filter((id) => !idsRot.has(id)).map((id) => ({ tipo: "rotina" as const, id })),
    ...ajustes.gmudsOff.filter((id) => !idsGmud.has(id)).map((id) => ({ tipo: "gmud" as const, id })),
  ];
  const outRot = rotinas.map((r) => {
    const a = ajustes.rotinas[r.id];
    if (!a) return r as R & RotinaAjustada;
    const c: R & RotinaAjustada = {
      ...r,
      ajustadaNaCotacao: true,
      original: { frequencia: r.frequencia, automacao: r.automacao, horasExecucao: r.horasExecucao },
    };
    if (a.frequencia && a.frequencia !== r.frequencia) {
      c.frequencia = a.frequencia;
      c.chamadosMes = FREQ_TO_CHAMADOS[a.frequencia];
      c.cac = +(c.chamadosMes * CAC_FACTOR).toFixed(4);
    }
    if (a.automacao !== undefined) c.automacao = a.automacao;
    if (a.horasExecucao !== undefined) c.horasExecucao = a.horasExecucao;
    return c;
  });
  const off = new Set(ajustes.gmudsOff);
  return { rotinas: outRot, gmuds: off.size ? gmuds.filter((g) => !off.has(g.id)) : gmuds, ignorados };
}

/** Linhas de aviso para o diálogo de salvar. */
export function resumoAjustes(v: unknown): string[] {
  const a = normalizarAjustes(v);
  const out: string[] = [];
  const n = Object.keys(a.rotinas).length;
  if (n) out.push(`${n} ${n === 1 ? "rotina com ajuste" : "rotinas com ajuste"}`);
  const g = a.gmudsOff.length;
  if (g) out.push(`${g} ${g === 1 ? "GMUD desligada" : "GMUDs desligadas"}`);
  return out;
}
