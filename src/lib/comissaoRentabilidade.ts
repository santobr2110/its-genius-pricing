export interface ComissaoTier {
  /** Mínimo de rentabilidade (% inclusive) */
  minRent: number;
  /** Máximo de rentabilidade (% inclusive). null = sem limite superior. */
  maxRent: number | null;
  /** % de comissão correspondente */
  comissao: number;
}

export const DEFAULT_COMISSAO_TIERS: ComissaoTier[] = [
  { minRent: 10, maxRent: 14.99, comissao: 3.66 },
  { minRent: 15, maxRent: 19.99, comissao: 6.10 },
  { minRent: 20, maxRent: 24.99, comissao: 7.32 },
  { minRent: 25, maxRent: 29.99, comissao: 8.54 },
  { minRent: 30, maxRent: 34.99, comissao: 9.76 },
  { minRent: 35, maxRent: null,  comissao: 10.98 },
];

/**
 * Retorna o % de comissão correspondente à rentabilidade informada,
 * com base na tabela. Se a rentabilidade for menor que o mínimo da
 * primeira faixa, retorna 0.
 */
export function comissaoFromRent(rent: number, tiers: ComissaoTier[]): number {
  // Faixas são contíguas: vale a de maior mínimo ≤ rentabilidade. Arredonda a 6 casas
  // para que 19,9999999…% (ponto flutuante) não caia no vão entre 19,99% e 20%.
  const r = Number.isFinite(rent) ? Math.round(rent * 1e6) / 1e6 : 0;
  let best: ComissaoTier | null = null;
  for (const t of tiers) if (r >= t.minRent && (!best || t.minRent > best.minRent)) best = t;
  return best ? best.comissao : 0;
}

export function formatRentLabel(t: ComissaoTier): string {
  if (t.maxRent == null) return `Acima de ${(t.minRent - 0.01).toFixed(2).replace(".", ",")}%`;
  return `Rent de ${t.minRent.toLocaleString("pt-BR")}% a ${t.maxRent.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}