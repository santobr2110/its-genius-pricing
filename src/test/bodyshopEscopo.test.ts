import { describe, it, expect } from "vitest";
import { indexarConteudo, campoDoCabecalho } from "@/lib/bodyshop/import";

describe("BodyShop: escopo de atuação × entregáveis contratuais", () => {
  it("coluna 'Entregáveis contratuais (oferta)' é ignorada", () => {
    expect(campoDoCabecalho("Entregáveis contratuais (oferta)")).toBeNull();
  });
  it("coluna 'Escopo de atuação' vai para escopo_atuacao", () => {
    expect(campoDoCabecalho("Escopo de atuação")).toBe("escopo_atuacao");
  });
  it("Revisão do Arquiteto = Revisado marca como revisado; outro valor não", () => {
    const idx = indexarConteudo([
      { "Nome do cargo na Empresa": "Analista X", "Nível": 1, "Escopo de atuação": "Frentes", "Revisão do Arquiteto": "Revisado" },
      { "Nome do cargo na Empresa": "Analista Y", "Nível": 1, "Escopo de atuação": "Frentes", "Revisão do Arquiteto": "Pendente" },
    ]);
    expect(idx.get("analista x|1")?.revisado).toBe(true);
    expect(idx.get("analista y|1")?.revisado).toBe(false);
  });
});
