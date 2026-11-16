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
