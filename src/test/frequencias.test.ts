import { describe, it, expect } from "vitest";
import { FREQ_TO_CHAMADOS, FREQUENCIAS } from "@/data/rotinas";
import { GMUD_FREQ_TO_CHAMADOS } from "@/data/gmuds";

describe("tabela de frequência", () => {
  it("rotinas e GMUDs devolvem os mesmos valores", () => {
    for (const f of FREQUENCIAS) expect(FREQ_TO_CHAMADOS[f]).toBe((GMUD_FREQ_TO_CHAMADOS as Record<string, number>)[f]);
  });
  it("Trimestral 1/3, Semestral 1/6, Anual 1/12; Semanal 4", () => {
    expect(FREQ_TO_CHAMADOS.Trimestral).toBeCloseTo(0.3333, 4);
    expect(FREQ_TO_CHAMADOS.Semestral).toBeCloseTo(0.1667, 4);
    expect(FREQ_TO_CHAMADOS.Anual).toBeCloseTo(0.0833, 4);
    expect(FREQ_TO_CHAMADOS.Semanal).toBe(4);
  });
});
