import { describe, it, expect } from "vitest";
import { mesesDoPrazo, formatarPrazo } from "@/lib/prazoContrato";
describe("prazo de contrato", () => {
  it.each([["36", 36], ["36 meses", 36], ["3 anos", 36], ["1 mês", 1], ["1 ano", 12], [" 24 Meses ", 24]])("%s → %d", (t, n) => {
    expect(mesesDoPrazo(t)).toBe(n);
  });
  it.each(["24/36 meses", "dois anos", "", "0", "200", "1,5 ano", null])("%s → null", (t) => {
    expect(mesesDoPrazo(t as string)).toBeNull();
  });
  it("formata", () => { expect(formatarPrazo(1)).toBe("1 mês"); expect(formatarPrazo(36)).toBe("36 meses"); });
});
