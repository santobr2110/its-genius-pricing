/**
 * Prazo de contrato (Smart ITO): única regra de conversão texto → meses.
 * Aceita só formas sem ambiguidade; qualquer outra coisa é "a confirmar" (null).
 */
export function mesesDoPrazo(texto: string | null | undefined): number | null {
  if (texto == null) return null;
  const t = String(texto).trim().toLowerCase();
  const m = t.match(/^(\d+)\s*(m[eê]s|meses|anos?)?$/);
  if (!m) return null;
  const n = Number(m[1]);
  const meses = m[2]?.startsWith("ano") ? n * 12 : n;
  return Number.isInteger(meses) && meses >= 1 && meses <= 120 ? meses : null;
}

export function formatarPrazo(meses: number): string {
  return meses === 1 ? "1 mês" : `${meses} meses`;
}
