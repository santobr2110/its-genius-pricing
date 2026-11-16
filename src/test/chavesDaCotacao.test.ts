import { describe, it, expect } from "vitest";
import { isPricingOwnedKey, stripPricingOwnedKeys } from "@/lib/paramKeys";

describe("chaves da cotação fora de perfis/padrão", () => {
  it("reconhece as três formas", () => {
    expect(isPricingOwnedKey("escopo:proposicao")).toBe(true);
    expect(isPricingOwnedKey("ito.smart-ito.gestao-ti:rotinasOff")).toBe(true);
    expect(isPricingOwnedKey("ito.smart-ito.preset.abc-123.gestao-ti:smartPerf:n3Cortes")).toBe(true);
    expect(isPricingOwnedKey("ito.smart-ito.gestao-ti:rotinas")).toBe(false);
    expect(isPricingOwnedKey("ito.smart-ito.gestao-ti:gmuds")).toBe(false);
  });
  it("remove só as chaves da cotação", () => {
    const p = { "ito.smart-ito.escopo:proposicao": 1, "escopo:itensAdicionais": 2, "ito.smart-ito.gestao-ti:rotinas": [1] };
    expect(stripPricingOwnedKeys(p)).toEqual({ "ito.smart-ito.gestao-ti:rotinas": [1] });
  });
});
