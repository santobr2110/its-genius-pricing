// ============================================================
// Fonte ÚNICA da distribuição das horas N3.
//
// A soma das parcelas (Chamados + Rotinas + TAM + Owner + Melhoria +
// Horas Técnicas) é SEMPRE exatamente igual ao total contratado —
// as parcelas são alocadas em cascata (waterfall) e o resíduo vira
// "Horas Técnicas". Os percentuais derivam das horas já alocadas,
// então também fecham em 100%.
// ============================================================

export interface N3DistributionInput {
  total: number;
  horasChamados: number;
  horasRotinas?: number;
  horasTam?: number;
  horasOwner?: number;
  horasMelhoria?: number;
}

export interface N3Distribution {
  total: number;
  chamados: number;
  rotinas: number;
  tam: number;
  owner: number;
  melhoria: number;
  tecnicas: number;
  /** Horas que excederam o total contratado (déficit de capacidade). */
  excedente: number;
  pct: (horas: number) => number;
}

export function computeN3Distribution(input: N3DistributionInput): N3Distribution {
  const total = Math.max(0, input.total || 0);
  const take = (want: number, rest: number) => Math.max(0, Math.min(Math.max(0, want || 0), rest));

  let rest = total;
  const chamados = take(input.horasChamados, rest); rest -= chamados;
  const rotinas = take(input.horasRotinas ?? 0, rest); rest -= rotinas;
  const tam = take(input.horasTam ?? 0, rest); rest -= tam;
  const owner = take(input.horasOwner ?? 0, rest); rest -= owner;
  const melhoria = take(input.horasMelhoria ?? 0, rest); rest -= melhoria;
  const tecnicas = Math.max(0, rest);

  const pedido =
    Math.max(0, input.horasChamados || 0) + Math.max(0, input.horasRotinas || 0) +
    Math.max(0, input.horasTam || 0) + Math.max(0, input.horasOwner || 0);
  const excedente = Math.max(0, pedido - total);

  return {
    total,
    chamados,
    rotinas,
    tam,
    owner,
    melhoria,
    tecnicas,
    excedente,
    pct: (horas: number) => (total > 0 ? (horas / total) * 100 : 0),
  };
}

/**
 * Lê a alocação absoluta TAM/Owner (fonte canônica: `gestao-ti:smartPerf:n3AllocHoras`),
 * caindo para a distribuição percentual legada (`n3Cortes`) quando necessário.
 */
export function resolveN3Alloc(
  allocHoras: [number, number] | null | undefined,
  legacyCortes: [number, number] | null | undefined,
  total: number,
): { tam: number; owner: number } {
  const t = Math.max(0, allocHoras?.[0] || 0);
  const o = Math.max(0, allocHoras?.[1] || 0);
  if (t > 0 || o > 0) {
    const tam = Math.min(t, total);
    return { tam, owner: Math.min(o, Math.max(0, total - tam)) };
  }
  const [corteTam, corteOwner] = legacyCortes ?? [0, 0];
  const pctTam = Math.max(0, corteTam || 0);
  const pctOwner = Math.max(0, (corteOwner || 0) - pctTam);
  const tam = Math.min(total, (total * pctTam) / 100);
  return { tam, owner: Math.min(Math.max(0, total - tam), (total * pctOwner) / 100) };
}
