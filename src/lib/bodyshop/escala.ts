// Escalas, adicional noturno e sobreaviso do BodyShop. Funções puras — ver src/test/bodyshopEscala.test.ts.
// Linhas sem `escala` (cotações antigas) continuam no cálculo por horas diretas.
export type TipoEscala = "8x5" | "12x36";
export type Sobreaviso = "semana" | "semana_sabado" | "semana_domingo" | "completo" | "sabado" | "domingo";
export interface EscalaBS { tipo: TipoEscala; inicio: string; fim: string; intervaloMin: number; sobreaviso: Sobreaviso | null }

export const DIAS_8X5 = 22;
export const HORAS_12X36 = 192;
export const PLANTOES_12X36 = 16;
export const SEMANAS_MES = 52 / 12;
export const ADICIONAL_NOTURNO = 0.4;
export const FATOR_HORA_REDUZIDA = 60 / 52.5; // 7h de relógio = 8h pagas
export const FRACAO_SOBREAVISO = 1 / 3;

export const PRESETS_ESCALA: Record<string, EscalaBS & { label: string }> = {
  "8x5_diurno": { label: "8x5 diurno", tipo: "8x5", inicio: "08:00", fim: "17:00", intervaloMin: 60, sobreaviso: null },
  "8x5_noturno": { label: "8x5 noturno", tipo: "8x5", inicio: "22:00", fim: "06:00", intervaloMin: 60, sobreaviso: null },
  "12x36_diurno": { label: "12x36 diurno", tipo: "12x36", inicio: "07:00", fim: "19:00", intervaloMin: 60, sobreaviso: null },
  "12x36_noturno": { label: "12x36 noturno", tipo: "12x36", inicio: "19:00", fim: "07:00", intervaloMin: 60, sobreaviso: null },
};
export const SOBREAVISO_LABEL: Record<Sobreaviso, string> = {
  semana: "Durante a semana", semana_sabado: "Semana + sábado", semana_domingo: "Semana + domingo",
  completo: "Completo (semana + fim de semana)", sabado: "Somente sábado", domingo: "Somente domingo",
};

const min = (hhmm: string) => { const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm ?? ""); if (!m) return NaN; const h = +m[1], mi = +m[2]; return h > 23 || mi > 59 ? NaN : h * 60 + mi; };

export function validarEscala(e: EscalaBS): string[] {
  const erros: string[] = [];
  const i = min(e.inicio), f = min(e.fim);
  if (!Number.isFinite(i) || !Number.isFinite(f)) return ["Horário inválido (use HH:MM)."];
  const dur = duracaoBrutaMin(e);
  if (dur <= 0) erros.push("Início e fim não podem ser iguais.");
  if (!(e.intervaloMin >= 0) || e.intervaloMin >= dur) erros.push("Intervalo deve ser menor que a jornada.");
  if (e.tipo === "8x5" && dur > 6 * 60 && e.intervaloMin < 60) erros.push("Jornada acima de 6h exige ao menos 1h de intervalo.");
  if (e.tipo === "8x5" && dur - e.intervaloMin > 10 * 60) erros.push("Jornada 8x5 acima de 10h líquidas.");
  if (e.tipo === "12x36" && dur > 12 * 60) erros.push("Plantão 12x36 não pode passar de 12h.");
  if (e.tipo === "12x36" && e.sobreaviso) erros.push("Sobreaviso não é oferecido na escala 12x36.");
  return erros;
}
export const duracaoBrutaMin = (e: Pick<EscalaBS, "inicio" | "fim">) => { const d = min(e.fim) - min(e.inicio); return d < 0 ? d + 1440 : d; };

/** Minutos de relógio do turno dentro de 22h–5h (o intervalo é tratado como diurno). */
export function minutosNoturnosRelogio(e: Pick<EscalaBS, "inicio" | "fim">): number {
  const i = min(e.inicio), dur = duracaoBrutaMin(e);
  let n = 0;
  for (let t = 0; t < dur; t++) { const h = (i + t) % 1440; if (h >= 22 * 60 || h < 5 * 60) n++; }
  return n;
}

export interface CalculoEscala {
  horasDia: number; diasMes: number; horasMes: number;
  horasNoturnasRelogioMes: number; horasNoturnasPagasMes: number; horasSobreavisoMes: number; erros: string[];
}
export function calcularEscala(e: EscalaBS): CalculoEscala {
  const erros = validarEscala(e);
  const dur = duracaoBrutaMin(e);
  const horasDia = Math.max(0, (dur - e.intervaloMin) / 60);
  const diasMes = e.tipo === "12x36" ? PLANTOES_12X36 : DIAS_8X5;
  const horasMes = e.tipo === "12x36" ? HORAS_12X36 : horasDia * DIAS_8X5;
  const notRel = minutosNoturnosRelogio(e) / 60 * diasMes;
  let sob = 0;
  if (e.tipo === "8x5" && e.sobreaviso) {
    const entreJornadas = (24 - dur / 60) * DIAS_8X5;
    const sab = 24 * SEMANAS_MES, dom = 24 * SEMANAS_MES;
    sob = { semana: entreJornadas, semana_sabado: entreJornadas + sab, semana_domingo: entreJornadas + dom, completo: entreJornadas + sab + dom, sabado: sab, domingo: dom }[e.sobreaviso];
  }
  return { horasDia, diasMes, horasMes, horasNoturnasRelogioMes: notRel, horasNoturnasPagasMes: notRel * FATOR_HORA_REDUZIDA, horasSobreavisoMes: sob, erros };
}

/** Valores mensais (antes de encargos) sobre o salário; valor-hora = salário ÷ horas da escala. */
export function adicionaisEscala(salario: number, e: EscalaBS) {
  const c = calcularEscala(e);
  const valorHora = c.horasMes > 0 ? salario / c.horasMes : 0;
  return { ...c, valorHora, adicionalNoturno: valorHora * ADICIONAL_NOTURNO * c.horasNoturnasPagasMes, sobreaviso: valorHora * FRACAO_SOBREAVISO * c.horasSobreavisoMes };
}

export function textoEscala(e: EscalaBS): string {
  const noturno = minutosNoturnosRelogio(e) > 0;
  return `Escala ${e.tipo} ${noturno ? "noturna" : "diurna"}, das ${e.inicio} às ${e.fim}${e.intervaloMin ? ` (intervalo ${e.intervaloMin} min)` : ""}${e.sobreaviso ? ` · sobreaviso ${SOBREAVISO_LABEL[e.sobreaviso].toLowerCase()}` : ""}`;
}

export const escalaPadrao = (): EscalaBS => { const { label: _l, ...e } = PRESETS_ESCALA["8x5_diurno"]; return e; };
