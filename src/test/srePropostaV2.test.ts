import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { computeCarrinhoSre, type EntradaLinhaSre, type GlobaisSre } from "@/lib/sre/carrinho";
import { montarModeloPropostaSre } from "@/lib/sre/proposta";
import { renderizarTemplateSre } from "@/lib/sre/propostaDocxV2";

const tax = { pisPerc: 0.65, cofinsPerc: 3, issPerc: 2 };
const ent = (id: string, horas: number): EntradaLinhaSre => ({
  linhaId: id, pacoteId: id, partNumber: `TKY-${horas}`, nome: `Pacote ${horas}h`, horasExecucao: horas, pctHorasGestao: 20,
  custoHoraExecucao: 95, custoHoraGestao: 95, rentabilidadeAlvoPerc: 35, quantidade: 1, descontoPerc: 0, codigoProduto: "SRE", tax, origemParam: {},
});
const g: GlobaisSre = { comissaoFixaPerc: 5, retencaoPerc: 5, irpjCsllPerc: 10.34, irpjCsllConvencao: "padrao_site", encFinancPerc: 0, descontoTotalPerc: 0, campanha: null };
const res = computeCarrinhoSre([ent("a", 12), ent("b", 40)], g, []);
const m = montarModeloPropostaSre({
  res, contents: [], params: [{ key: "validade_horas_meses", value: 12 }],
  cliente: { razao: "Acme", cnpj: "", endereco: "" }, contato: { nome: "Ana", cargo: "", email: "a@x.com" }, consultor: { nome: "Bruno", cargo: "Especialista" },
  codigo: "X", versao: null, salesforce: "9", hojeISO: "2026-11-23", validadeDias: 30,
});

describe("Word SRE no template Selbetti (layout 2)", () => {
  const xml = renderizarTemplateSre(readFileSync("public/templates/proposta-sre-template.docx"), m).file("word/document.xml")!.asText();
  const texto = xml.replace(/<[^>]+>/g, "");
  it("novas emissões usam o layout 2", () => expect(m.layoutVersao).toBe(2));
  it("sem tags sobrando e sem conteúdo de subscrição", () => {
    expect(texto).not.toMatch(/\{[#/@]?[a-z_0-9.]+\}/);
    expect(texto).not.toMatch(/Silver|12 meses\)|Subscrição Oficial/);
  });
  it("traz pacotes, total e validade das horas", () => {
    expect(texto).toContain("TKY-40");
    expect(texto).toContain("Pacotes Consultivos Zabbix SRE");
    expect(texto).toContain("12 meses a partir da contratação");
    expect(texto).toContain(m.total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    expect(texto.toLowerCase()).not.toMatch(/horas de gest/);
  });
});
