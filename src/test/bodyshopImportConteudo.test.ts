import { describe, it, expect } from "vitest";
import { indexarConteudo, conteudoDoCargo } from "@/lib/bodyshop/import";

describe("importação de conteúdo BodyShop", () => {
  it("lê campos de conteúdo por cargo e nível", () => {
    const idx = indexarConteudo([
      { Cargo: "Analista de Suporte", Nível: "2", Descrição: "Atende chamados", Atividades: "Triagem", Competências: "ITIL", Formação: "TI", Certificações: "ITIL 4", "Pré-requisitos": "2 anos" },
      { Cargo: "Analista de Suporte", Nível: "Sênior", Descrição: "Lidera" },
    ]);
    const c = conteudoDoCargo(idx, "Analista de Suporte", 2, "Pleno")!;
    expect(c).toMatchObject({ descricao: "Atende chamados", atividades: "Triagem", competencias: "ITIL", formacao: "TI", certificacoes: "ITIL 4", pre_requisitos: "2 anos" });
    expect(conteudoDoCargo(idx, "Analista de Suporte", 3, "Sênior")?.descricao).toBe("Lidera");
    expect(conteudoDoCargo(idx, "Analista de Suporte", 1, "Júnior")).toBeUndefined();
  });
});
