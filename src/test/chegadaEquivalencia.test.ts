import { describe, expect, it } from "vitest";
import { aplicarDesconto } from "@/lib/treinamento/calc";
import { decomporVenda } from "@/lib/pricing/chegada";
import { comissaoFromRent, DEFAULT_COMISSAO_TIERS, type ComissaoTier } from "@/lib/comissaoRentabilidade";

const pos = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);
// Cópia fiel da implementação anterior à extração.
function aplicarDescontoLegado(custo: number, pv: number, descontoPerc: number, p: any, tiers: ComissaoTier[], comissaoFixa: number | null = null, retencaoPerc = 0) {
  const pf = pv * (1 - pos(descontoPerc) / 100);
  if (pf <= 0) return { precoFinal: 0, rentabilidadePerc: 0, comissaoPerc: 0, lucro: -custo };
  const fixos = pos(p.pisPerc) + pos(p.cofinsPerc) + pos(p.issPerc) + pos(p.irpjCsllPerc) + pos(p.encFinancPerc) + pos(retencaoPerc);
  const base = 100 - fixos - (custo / pf) * 100;
  let com = comissaoFixa ?? 0;
  for (let i = 0; comissaoFixa == null && i < 20; i++) {
    const next = comissaoFromRent(base - com, tiers);
    if (next === com) break;
    com = next;
  }
  const rent = base - com;
  return { precoFinal: pf, rentabilidadePerc: rent, comissaoPerc: com, lucro: (pf * rent) / 100 };
}

describe("motor de chegada ≡ aplicarDesconto legado", () => {
  it("grade de combinações", () => {
    const custos = [0, 1000, 10000, 85000, 500000];
    const pvs = [0, 500, 20000, 150000, 2000000];
    const descs = [0, 10, 35, 100];
    const fixosSet = [
      { pisPerc: 1.65, cofinsPerc: 7.6, issPerc: 3, irpjCsllPerc: 2.28, encFinancPerc: 1 },
      { pisPerc: 0.65, cofinsPerc: 3, issPerc: 2, irpjCsllPerc: 0, encFinancPerc: 0 },
    ];
    let n = 0;
    for (const c of custos) for (const pv of pvs) for (const d of descs) for (const f of fixosSet)
      for (const fixa of [null, 4]) for (const ret of [0, 5]) {
        const a = aplicarDescontoLegado(c, pv, d, f, DEFAULT_COMISSAO_TIERS, fixa, ret);
        const b = aplicarDesconto(c, pv, d, { ...f } as any, DEFAULT_COMISSAO_TIERS, fixa, ret);
        for (const k of ["precoFinal", "rentabilidadePerc", "comissaoPerc", "lucro"] as const)
          expect(Math.abs(a[k] - b[k])).toBeLessThan(1e-9);
        n++;
      }
    expect(n).toBeGreaterThanOrEqual(500);
  });

  it("modo fixo nunca é instável; ciclo da escala é detectado", () => {
    const f = { pisPerc: 0, cofinsPerc: 0, issPerc: 0, irpjCsllPerc: 0, encFinancPerc: 0, retencaoPerc: 0 };
    expect(decomporVenda(66.461, 100, 0, f, DEFAULT_COMISSAO_TIERS, 5).comissaoInstavel).toBe(false);
    // base 33,539%: 9,76 → 7,32 → 8,54 → 0 → 9,76 ...
    expect(decomporVenda(66.461, 100, 0, f, DEFAULT_COMISSAO_TIERS).comissaoInstavel).toBe(true);
  });
});
