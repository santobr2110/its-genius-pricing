import { describe, it, expect } from "vitest";
import { horasN3DaRotina } from "@/lib/rotinasHoras";

describe("horasN3DaRotina", () => {
  it("rotina automatizada de 2h semanais consome as horas cheias", () => {
    expect(horasN3DaRotina({ horasExecucao: 2 }, 4)).toBe(8);
  });
  it("rotina sem horas (por chamado) não consome horas N3", () => {
    expect(horasN3DaRotina({}, 4)).toBe(0);
  });
  it("gerencial não consome horas N3", () => {
    expect(horasN3DaRotina({ horasExecucao: 2, gerencial: true }, 4)).toBe(0);
  });
});
