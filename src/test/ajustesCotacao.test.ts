import { describe, it, expect } from "vitest";
import { aplicarAjustesCotacao, resumoAjustes } from "@/lib/ajustesCotacao";
import type { Rotina } from "@/data/rotinas";
import type { Gmud } from "@/data/gmuds";

const rot = (id: string, extra: Partial<Rotina> = {}): Rotina => ({
  id, grupo: "G", rotina: id, oferta: "Operation", unidade: "por servidor", ativo: "Servidor",
  abrangencia: "Individual", automacao: false, frequencia: "Mensal", chamadosMes: 1, cac: 0.2, ...extra,
});
const gm = (id: string) => ({ id, tipo: "Padrão", descricao: id, complexidade: "Baixa", oferta: "Operation", frequencia: "Mensal", chamadosMes: 1, cac: 0.2 }) as unknown as Gmud;

describe("aplicarAjustesCotacao", () => {
  it("Mensal → Trimestral recalcula chamados e CAC e guarda o original", () => {
    const base = [rot("a")];
    const { rotinas } = aplicarAjustesCotacao(base, [], { gmudsOff: [], rotinas: { a: { frequencia: "Trimestral" } } });
    expect(rotinas[0].frequencia).toBe("Trimestral");
    expect(rotinas[0].chamadosMes).toBe(0.3);
    expect(rotinas[0].cac).toBe(0.06);
    expect(rotinas[0].original?.frequencia).toBe("Mensal");
    expect(rotinas[0].ajustadaNaCotacao).toBe(true);
    expect(base[0].frequencia).toBe("Mensal"); // catálogo intacto
  });
  it("automação e horas ajustadas só na cópia", () => {
    const { rotinas } = aplicarAjustesCotacao([rot("a"), rot("b")], [], { gmudsOff: [], rotinas: { a: { automacao: true, horasExecucao: 2 } } });
    expect(rotinas[0].automacao).toBe(true);
    expect(rotinas[0].horasExecucao).toBe(2);
    expect(rotinas[1].ajustadaNaCotacao).toBeUndefined();
  });
  it("GMUD desligada sai da lista", () => {
    const { gmuds } = aplicarAjustesCotacao([], [gm("g1"), gm("g2")], { gmudsOff: ["g1"], rotinas: {} });
    expect(gmuds.map((g) => g.id)).toEqual(["g2"]);
  });
  it("ids ausentes são ignorados e listados", () => {
    const r = aplicarAjustesCotacao([rot("a")], [gm("g1")], { gmudsOff: ["gx"], rotinas: { zz: { automacao: true } } });
    expect(r.ignorados).toEqual([{ tipo: "rotina", id: "zz" }, { tipo: "gmud", id: "gx" }]);
  });
  it("sem a chave (cotação antiga) devolve as mesmas listas", () => {
    const rs = [rot("a")]; const gs = [gm("g1")];
    const r = aplicarAjustesCotacao(rs, gs, undefined);
    expect(r.rotinas).toEqual(rs);
    expect(r.gmuds).toBe(gs);
  });
  it("resumo para o aviso de salvar", () => {
    expect(resumoAjustes({ gmudsOff: ["x"], rotinas: { a: { automacao: true }, b: { frequencia: "Anual" }, c: { horasExecucao: 1 } } }))
      .toEqual(["3 rotinas com ajuste", "1 GMUD desligada"]);
  });
});
