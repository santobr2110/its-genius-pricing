import { describe, it, expect } from "vitest";
import { comissaoFromRent, DEFAULT_COMISSAO_TIERS as T } from "@/lib/comissaoRentabilidade";

describe("Escala de comissão por rentabilidade", () => {
  it("20% com erro de ponto flutuante cai na faixa de 7,32%", () => {
    expect(comissaoFromRent(19.999999999, T)).toBe(7.32);
  });
  it("valor entre 19,99% e 20% fica na faixa de 6,10%", () => {
    expect(comissaoFromRent(19.995, T)).toBe(6.10);
  });
  it("abaixo de 10% não há comissão", () => {
    expect(comissaoFromRent(9.99, T)).toBe(0);
  });
});
