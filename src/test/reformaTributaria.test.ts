import { describe, it, expect } from "vitest";
import { calcPrecoReforma, textoPrecoReforma } from "@/lib/pricing/reformaTributaria";

const p = [{ preco: 1000, pisPerc: 0.65, cofinsPerc: 3, issPerc: 2 }];

describe("Preço pós-reforma (CBS)", () => {
  it("líquido remove PIS, COFINS e ISS do preço atual", () => {
    expect(calcPrecoReforma(p, null).liquidoSemImpostos).toBeCloseTo(943.5, 6);
  });
  it("sem alíquota: mostra preço sem PIS/COFINS + CBS", () => {
    const r = calcPrecoReforma(p, null);
    expect(r.precoReforma).toBeNull();
    expect(textoPrecoReforma(r, (v) => v.toFixed(2))).toBe("963.50 + CBS");
  });
  it("com alíquota: preço atual − PIS − COFINS + CBS sobre o líquido", () => {
    const r = calcPrecoReforma(p, 10);
    expect(r.cbs).toBeCloseTo(94.35, 6);
    expect(r.precoReforma).toBeCloseTo(1057.85, 6);
  });
  it("não altera o preço atual", () => {
    expect(calcPrecoReforma(p, 10).precoAtual).toBe(1000);
  });
});
