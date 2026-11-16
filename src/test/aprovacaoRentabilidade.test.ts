import { describe, it, expect } from "vitest";
import { aprovacaoVale } from "@/lib/approval/types";
describe("aprovação vinculada à rentabilidade aprovada", () => {
  it("subir ou manter mantém a aprovação", () => {
    expect(aprovacaoVale(15, 12)).toBe(true);
    expect(aprovacaoVale(12, 12)).toBe(true);
    expect(aprovacaoVale(11.995, 12)).toBe(true);
  });
  it("cair abaixo da aprovada desatualiza", () => {
    expect(aprovacaoVale(11.9, 12)).toBe(false);
  });
});
