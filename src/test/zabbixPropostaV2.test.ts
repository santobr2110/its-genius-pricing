import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { montarModeloProposta, type LinhaMatrizNivel } from "@/lib/zabbix/proposta";
import { celulaMatrizXml, montarDadosTemplateV2, realcarPendencias, renderizarTemplateV2, nomeArquivoV2 } from "@/lib/zabbix/propostaDocxV2";
import * as docxMod from "@/lib/zabbix/propostaDocx";

const TPL = readFileSync(resolve(__dirname, "../../public/templates/proposta-zabbix-template.docx"));
const linha = (pn: string, nome: string, q: number, total: number) => ({
  erros: [], precoFinal: total, listaUnitariaBrl: 0,
  entrada: { subscriptionId: pn, partNumber: pn, nome, quantidade: q, listaUsd: null, listaBrl: null },
});
const MATRIZ: LinhaMatrizNivel[] = [
  { secao: "recursos", ordem: 1, recurso: "Autenticação única", silver: "✓", gold: "✓", platinum: "✓", enterprise: "✓", global: "✓", ativo: true },
  { secao: "extras", ordem: 1, recurso: "Sessão anual de Q&A", silver: "–", gold: "–", platinum: "–", enterprise: "✓", global: "✓", ativo: true },
];
const PARAMS = [
  { key: "proposta_prazo_pagamento", value: "30 DDF." },
  { key: "proposta_pagamento_academy", value: "Upfront." },
  { key: "proposta_numeros", value: "+ 15 ANOS|DE EXPERIÊNCIA\n1º|PARTNER" },
  { key: "proposta_diferenciais", value: "Primeiro\nCondições|Em reais." },
];
const modelo = (linhas: ReturnType<typeof linha>[], params: { key: string; value: unknown }[] = PARAMS) => montarModeloProposta({
  res: { linhas, precoFinalTotal: linhas.reduce((s, l) => s + l.precoFinal, 0) } as never,
  contents: [], params, cliente: "Hughes Ltda", contato: "Ana", email: "a@x.com", consultor: "Bruno",
  codigo: "ZBX-1", versao: 1, hojeISO: "2026-10-15", validadeDias: 15,
  niveis: { "SUP-ZBX-SVR-GLD": "Gold", "SUP-ZBX-PRX-GLD": "Gold", "SUP-ZBX-SVR-PLT": "Platinum" }, matriz: MATRIZ, salesforce: "123",
});
const SUP = [linha("SUP-ZBX-SVR-GLD", "Servidor Gold", 1, 36480), linha("SUP-ZBX-PRX-GLD", "Proxy Gold", 1, 6000)];
const ACA = [linha("ACA-ZBX-ANN", "Academy anual", 1, 7415)];

describe("Proposta Word v2", () => {
  it("só suporte", () => {
    const d = montarDadosTemplateV2(modelo(SUP));
    expect(d.tem_suporte).toBe(true); expect(d.tem_academy).toBe(false);
    expect(d.pagamentos).toEqual([{ rotulo: "Pagamento:", texto: "30 DDF." }]);
    expect(d.titulo_oferta_nivel).toBe("Subscrição Oficial Zabbix – Nível Gold");
    expect(d.total).toBe("R$ 42.480,00");
    expect(d.linha_capa).toBe("Nível Gold  ·  Hughes Ltda  ·  OP-123");
    expect(d.cliente_razao).toBe("HUGHES LTDA");
  });
  it("dois níveis", () => {
    const d = montarDadosTemplateV2(modelo([...SUP, linha("SUP-ZBX-SVR-PLT", "Plat", 1, 1)]));
    expect(d.titulo_oferta_nivel).toBe("Subscrição Oficial Zabbix – Níveis Gold e Platinum");
  });
  it("só Academy", () => {
    const d = montarDadosTemplateV2(modelo(ACA));
    expect(d.tem_suporte).toBe(false); expect(d.tem_academy).toBe(true);
    expect(d.pagamentos[0].texto).toBe("Upfront."); expect(d.recursos).toEqual([]);
    expect(d.linha_capa).toBe("Hughes Ltda  ·  OP-123");
  });
  it("ambos", () => {
    const d = montarDadosTemplateV2(modelo([...SUP, ...ACA]));
    expect(d.quebra_academy).toBe(true); expect(d.pagamentos).toHaveLength(2);
    expect(d.total).toBe("R$ 49.895,00");
  });
  it("params vazios viram [A CONFIRMAR]", () => {
    const d = montarDadosTemplateV2(modelo(SUP, []));
    expect(d.num1_valor).toBe("[A CONFIRMAR]"); expect(d.confidencialidade).toBe("[A CONFIRMAR]");
    expect(d.pagamentos[0].texto).toBe("[A CONFIRMAR]");
    expect(JSON.stringify(d)).not.toContain("undefined");
  });
  it("celulaMatrizXml escapa &", () => {
    expect(celulaMatrizXml("Q&A")).toContain("Q&amp;A");
    expect(celulaMatrizXml("✓")).toContain("00754A");
  });
  it("realcarPendencias", () => {
    const a = realcarPendencias("<w:r><w:t>[A CONFIRMAR]</w:t></w:r>");
    expect(a).toContain('<w:rPr><w:highlight w:val="yellow"/></w:rPr>');
    const b = realcarPendencias("<w:r><w:rPr><w:b/></w:rPr><w:t>[A CONFIRMAR]</w:t></w:r>");
    expect(b).toBe('<w:r><w:rPr><w:highlight w:val="yellow"/><w:b/></w:rPr><w:t>[A CONFIRMAR]</w:t></w:r>');
    expect(realcarPendencias(b)).toBe(b);
    expect(realcarPendencias("<w:r><w:t>ok</w:t></w:r>")).toBe("<w:r><w:t>ok</w:t></w:r>");
  });
  it("nome do arquivo", () => {
    expect(nomeArquivoV2(modelo(SUP))).toBe("Hughes_Ltda_OP123_Subscricao_Zabbix_Gold_15102026.docx");
  });
  it.each([["suporte", SUP], ["academy", ACA], ["ambos", [...SUP, ...ACA]]])("renderiza template real: %s", (nome, ls) => {
    const xml = renderizarTemplateV2(TPL, modelo(ls as never)).file("word/document.xml")!.asText();
    expect(xml).not.toMatch(/\{[#/@]/);
    for (const l of ls as ReturnType<typeof linha>[]) expect(xml).toContain(l.entrada.partNumber);
    if (nome === "suporte") expect(xml).toContain("R$ 42.480,00");
    if (nome === "academy") expect(xml).not.toContain("Recursos suportados");
    if (nome === "suporte") expect(xml).not.toContain("Módulos disponíveis");
  });
  it("template contém o laço de itens", () => {
    expect(TPL.toString("binary").length).toBeGreaterThan(0);
  });
  it("emissão antiga cai no gerador legado", async () => {
    const m = modelo(SUP); delete m.layoutVersao; delete m.v2;
    const blob = await docxMod.gerarPropostaZbxDocx(m);
    expect(blob.size).toBeGreaterThan(0);
    vi.restoreAllMocks();
  });
});
