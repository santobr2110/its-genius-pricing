import { comissaoFromRent, type ComissaoTier } from "@/lib/comissaoRentabilidade";

/**
 * Motor de "chegada": dado custo e preço de venda (PV) fixos, decompõe a venda
 * (após desconto) em tributos, comissão, retenção e lucro. Extraído linha a linha
 * de `aplicarDesconto` (Treinamento) — não alterar a ordem das operações.
 */
export interface ChegadaFixos {
  pisPerc: number; cofinsPerc: number; issPerc: number;
  irpjCsllPerc: number; encFinancPerc: number; retencaoPerc: number;
}
export interface ChegadaResult {
  precoFinal: number;
  rentabilidadePerc: number;
  comissaoPerc: number;
  lucro: number;
  /** true quando o laço da escala de comissão entra em ciclo (nunca no modo fixo). */
  comissaoInstavel: boolean;
}

const pos = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

export function decomporVenda(
  custo: number, pv: number, descontoPerc: number,
  f: ChegadaFixos, tiers: ComissaoTier[], comissaoFixa: number | null = null,
): ChegadaResult {
  const pf = pv * (1 - pos(descontoPerc) / 100);
  if (pf <= 0) return { precoFinal: 0, rentabilidadePerc: 0, comissaoPerc: 0, lucro: -custo, comissaoInstavel: false };
  const fixos = pos(f.pisPerc) + pos(f.cofinsPerc) + pos(f.issPerc) + pos(f.irpjCsllPerc) + pos(f.encFinancPerc) + pos(f.retencaoPerc);
  const base = 100 - fixos - (custo / pf) * 100; // rent + comissão
  let com = comissaoFixa ?? 0;
  let convergiu = comissaoFixa != null;
  for (let i = 0; comissaoFixa == null && i < 20; i++) {
    const next = comissaoFromRent(base - com, tiers);
    if (next === com) { convergiu = true; break; }
    com = next;
  }
  const rent = base - com;
  return { precoFinal: pf, rentabilidadePerc: rent, comissaoPerc: com, lucro: (pf * rent) / 100, comissaoInstavel: !convergiu };
}
