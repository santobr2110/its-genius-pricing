import { describe, it, expect } from "vitest";
import { corrigirEscopoLegado, limparCatalogoLegado, TEXTO_OPERATION_TAGLINE, TEXTO_OPERATION_DESCRICAO, TEXTO_FLOW_RESTRICAO } from "@/lib/normalizacoesLegado";
import { ESCOPO_DEFAULT } from "@/data/escopoProposicao";

describe("correção global Service Desk", () => {
  const antigo = {
    operation: { tagline: "Service Desk humano N1 e N2", descricao: "Service Desk gerenciado", incluidos: ["x"] },
    flow: { restricoes: ["a", "Não inclui Service Desk humano N1/N2 reativo", "b"] },
  };
  it("substitui os três textos antigos e preserva o resto", () => {
    const n = corrigirEscopoLegado(antigo);
    expect(n.operation.tagline).toBe(TEXTO_OPERATION_TAGLINE);
    expect(n.operation.descricao).toBe(TEXTO_OPERATION_DESCRICAO);
    expect(n.operation.incluidos).toEqual(["x"]);
    expect(n.flow.restricoes).toEqual(["a", TEXTO_FLOW_RESTRICAO, "b"]);
  });
  it("é idempotente e não altera o padrão novo (cita Smart Service Desk)", () => {
    const n = corrigirEscopoLegado(antigo);
    expect(corrigirEscopoLegado(n)).toBe(n);
    expect(corrigirEscopoLegado(ESCOPO_DEFAULT)).toBe(ESCOPO_DEFAULT);
  });
  it("remove invisíveis só do campo indicado", () => {
    const l = [{ descricao: "\u2060 Troca\u200B ", outro: "\u2060" }];
    const n = limparCatalogoLegado(l, "descricao");
    expect(n[0]).toEqual({ descricao: "Troca", outro: "\u2060" });
    expect(limparCatalogoLegado(n, "descricao")).toBe(n);
  });
});

import { FLOW_INCLUIDOS, FLOW_RESTRICOES, FLOW_TAGLINE } from "@/lib/normalizacoesLegado";
describe("correção global Smart Flow", () => {
  it("substitui o bloco antigo inteiro e é idempotente", () => {
    const v = { flow: { titulo: "Smart Flow", tagline: "Monitoramento integrado ao ITSM e atendentes dedicados", descricao: "x", incluidos: ["a"], restricoes: ["b"] } };
    const n = corrigirEscopoLegado(v);
    expect(n.flow.tagline).toBe(FLOW_TAGLINE);
    expect(n.flow.incluidos).toEqual([...FLOW_INCLUIDOS]);
    expect(n.flow.restricoes).toEqual([...FLOW_RESTRICOES]);
    expect(n.flow.titulo).toBe("Smart Flow");
    expect(corrigirEscopoLegado(n)).toBe(n);
  });
  it("não mexe em bloco já reescrito", () => {
    const v = { flow: { tagline: "Meu texto", descricao: "outro", incluidos: ["a"], restricoes: [] } };
    expect(corrigirEscopoLegado(v)).toBe(v);
  });
  it("itens 1,2,3,4,9 escapam das regras de filtro; 5–8 casam", () => {
    const regras = [/atendent/i, /prox/i, /hora.*automa|automa.*evento|horas?\s*de\s*automa/i, /acionamento|opcional/i];
    const casa = (t: string) => regras.some((r) => r.test(t));
    expect([0, 1, 2, 3, 8].map((i) => casa(FLOW_INCLUIDOS[i]))).toEqual([false, false, false, false, false]);
    expect([4, 5, 6, 7].map((i) => casa(FLOW_INCLUIDOS[i]))).toEqual([true, true, true, true]);
  });
});
