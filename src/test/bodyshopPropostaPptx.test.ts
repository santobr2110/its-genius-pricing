import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import PizZip from "pizzip";
import { congelar, CONFIG_BS_PADRAO, type EntradaLinhaBS } from "@/lib/bodyshop/carrinho";
import { DEFAULT_COMISSAO_TIERS } from "@/lib/comissaoRentabilidade";
import { substituirTokensXml, textoSlides, tokensPendentes } from "@/lib/bodyshop/pptxTemplate";
import { dividirColunas, horaExtra, montarModeloPropostaPptx, numeralPalavras, preencherPptx, vazamentos, type ModeloPropostaPptx } from "@/lib/bodyshop/propostaPptx";
import type { BodyshopContent } from "@/lib/bodyshop/calc";

const FIXTURE = readFileSync(resolve(__dirname, "fixtures/bs-template-min.pptx"));
const g = { rentabilidadeAlvoPerc: 20, comissaoFixaPerc: 7.32, retencaoPerc: 5, irpjCsllPerc: 10.3, encFinancPerc: 0, descontoTotalPerc: 0, duracaoMeses: 12 };
const ent = (o: Partial<EntradaLinhaBS> = {}): EntradaLinhaBS => ({ linhaId: "l1", cargoId: "c1", cargo: "Analista de Redes", area: "Infraestrutura", senioridade: "Sênior", nivelNum: 3, faixa: "c3", salarioBase: 10000, encargosPerc: 62, indiretosPerc: 5, beneficiosMensais: 1000, beneficiosProporcionais: true, horasPadrao: 176, horasLinha: 176, regime: "integral", quantidade: 1, descontoPerc: 0, codigoProduto: "BS", tax: { pisPerc: 1.65, cofinsPerc: 7.6, issPerc: 2 }, pisoRentabilidadePerc: null, origemParam: {}, local: "Curitiba/PR", ...o });
const params = [
  ["proposta_modalidade_padrao", "Dedicado"], ["proposta_formato_padrao", "Presencial"], ["proposta_horario_padrao", "das 8h às 17h"],
  ["proposta_objetivo_modelo", "Alocação de {perfis}."], ["proposta_despesas_impostos", "Impostos inclusos;"], ["reajuste_indice", "IPCA"], ["prazo_disponibilizacao_dias", 30],
  ["proposta_inst_numeros", "1|a\n2|b\n3|c"], ["proposta_inst_destaque", "QUASE|50|anos"],
].map(([key, value]) => ({ key: key as string, value }));
const contents: BodyshopContent[] = [{ cargo_id: "c1", descricao: null, atividades: null, competencias: "• Redes\n• Firewall", formacao: "Superior em TI", certificacoes: "CCNA; NSE4", escopo_atuacao: "• Item A\n• Item B\n• Item C", pre_requisitos: null, observacoes: null, a_confirmar: false }];
const modelo = (es: EntradaLinhaBS[], extra: { key: string; value: unknown }[] = []): ModeloPropostaPptx => montarModeloPropostaPptx({
  snapshot: congelar(es, g, CONFIG_BS_PADRAO, "u", DEFAULT_COMISSAO_TIERS), contents, params: [...params, ...extra],
  cliente: "Cliente Fictício SA", salesforce: "OP1", especialista: "Maria Silva", amNome: "João Souza", amEmail: "joao@selbetti.com.br", hojeISO: "2026-10-21",
});
const gerar = (m: ModeloPropostaPptx) => preencherPptx(new PizZip(FIXTURE), m);
const slidesXml = (z: PizZip) => Object.keys(z.files).filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f));

describe("BodyShop · proposta PowerPoint", () => {
  it("1. achata runs partidos e preserva o rPr do primeiro run", () => {
    const xml = '<a:p><a:pPr marL="1"/><a:r><a:rPr lang="pt-BR" b="1"/><a:t>CLIENTE: {{CLI</a:t></a:r><a:r><a:rPr lang="en-US"/><a:t>EN</a:t></a:r><a:r><a:rPr/><a:t>TE}} Ltda</a:t></a:r></a:p>';
    const out = substituirTokensXml(xml, { CLIENTE: "ACME" });
    expect(out).toBe('<a:p><a:pPr marL="1"/><a:r><a:rPr lang="pt-BR" b="1"/><a:t>CLIENTE: ACME Ltda</a:t></a:r></a:p>');
  });
  it("2. nenhum marcador sobra no pacote", () => { expect(tokensPendentes(gerar(modelo([ent()])))).toEqual([]); });
  it("3. integridade do pacote para 1, 2 e 4 perfis", () => {
    for (const n of [1, 2, 4]) {
      const z = gerar(modelo(Array.from({ length: n }, (_, i) => ent({ linhaId: `l${i}`, cargoId: `c${i}`, local: `Cidade ${i}` }))));
      const pres = z.file("ppt/presentation.xml")!.asText(), rels = z.file("ppt/_rels/presentation.xml.rels")!.asText(), ct = z.file("[Content_Types].xml")!.asText();
      const ids = [...pres.matchAll(/<p:sldId\b[^>]*r:id="([^"]+)"/g)].map(m => m[1]);
      expect(ids.length).toBe(12 + (n - 1) * 3);
      expect((ct.match(/presentationml\.slide\+xml/g) ?? []).length).toBe(ids.length);
      expect(slidesXml(z).length).toBe(ids.length);
      for (const id of ids) expect(rels).toContain(`Id="${id}"`);
      const relsSlides = Object.keys(z.files).filter(f => /^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/.test(f));
      for (const r of relsSlides) expect(z.file(r.replace("_rels/", "").replace(".rels", ""))).toBeTruthy();
    }
  });
  it("4. consolida mesmo cargo/senioridade/formato/local/horário; local diferente separa", () => {
    expect(modelo([ent({ quantidade: 2 }), ent({ linhaId: "l2", quantidade: 1 })]).perfis).toHaveLength(1);
    expect(modelo([ent({ quantidade: 2 }), ent({ linhaId: "l2" })]).perfis[0].intro).toContain("considerando 3 ");
    expect(modelo([ent(), ent({ linhaId: "l2", local: "Joinville/SC" })]).perfis).toHaveLength(2);
  });
  it("5. slide 9 único quando formato/local/horário coincidem", () => {
    const iguais = [ent(), ent({ linhaId: "l2", cargoId: "c2" }), ent({ linhaId: "l3", cargoId: "c3" })];
    expect(slidesXml(gerar(modelo(iguais))).length).toBe(12 + 2 * 2);
    const dif = [ent(), ent({ linhaId: "l2", cargoId: "c2", horario: "noturno" }), ent({ linhaId: "l3", cargoId: "c3" })];
    expect(modelo(dif).slideLocalUnico).toBeNull();
    expect(slidesXml(gerar(modelo(dif))).length).toBe(12 + 2 * 3);
  });
  it("6. tabela: N itens + total, soma = totalMensal", () => {
    const m = modelo([ent(), ent({ linhaId: "l2", cargoId: "c2" }), ent({ linhaId: "l3", cargoId: "c3", quantidade: 2 })]);
    expect(m.itens.reduce((s, i) => s + i.valorMensal, 0)).toBeCloseTo(m.totalMensal, 6);
    const xml = gerar(m).file("ppt/slides/slide11.xml")!.asText();
    expect((xml.match(/<a:tr\b/g) ?? []).length).toBe(1 + 3 + 1);
  });
  it("7. divide o escopo por caracteres acumulados", () => {
    const itens = ["a".repeat(200), "b".repeat(30), "c".repeat(40), "d".repeat(50), "e".repeat(60), "f".repeat(20), "g".repeat(90), "h".repeat(70), "i".repeat(40)];
    const [a, b] = dividirColunas(itens); const va = a.join("").length, vb = b.join("").length;
    expect(a.length + b.length).toBe(9);
    expect(Math.abs(va - vb) / Math.max(va, vb)).toBeLessThan(0.2);
  });
  it("8. hora extra: vazio omite; 1,7765 × 13.369,46/176 = R$ 134,95", () => {
    expect(modelo([ent()]).observacoesComerciais.some(o => o.includes("hora extra"))).toBe(false);
    expect(horaExtra(13369.46, 176, 1.7765)).toBeCloseTo(134.95, 2);
    expect(modelo([ent()], [{ key: "fator_hora_extra", value: 1.7765 }]).observacoesComerciais[0]).toMatch(/hora extra .*R\$/);
  });
  it("9. numeral por extenso só de 1 a 20", () => { expect(numeralPalavras(1)).toBe("um"); expect(numeralPalavras(20)).toBe("vinte"); expect(numeralPalavras(21)).toBeNull(); });
  it("10. escopo longo gera aviso e não trunca", () => {
    const longo = Array.from({ length: 14 }, (_, i) => `${i} ${"x".repeat(118)}`).join("\n");
    const m = montarModeloPropostaPptx({ snapshot: congelar([ent()], g, CONFIG_BS_PADRAO, "u", DEFAULT_COMISSAO_TIERS), contents: [{ ...contents[0], escopo_atuacao: longo }], params, cliente: "X", salesforce: "", especialista: "Y", amNome: "Z", amEmail: "z@x", hojeISO: "2026-10-21" });
    expect(m.avisos.some(a => a.includes("escopo"))).toBe(true);
    expect(m.perfis[0].escopoCol1.length + m.perfis[0].escopoCol2.length).toBe(14);
  });
  it("11. reemitir usa o modelo congelado, não os parâmetros atuais", () => {
    const congelado = JSON.parse(JSON.stringify(modelo([ent()])));
    modelo([ent()], [{ key: "reajuste_indice", value: "IGPM" }]);
    expect(textoSlides(gerar(congelado))).toContain("IPCA");
  });
  it("12. nenhum termo do deck de referência vaza", () => {
    const z = gerar(modelo([ent(), ent({ linhaId: "l2", cargoId: "c2", local: "Joinville/SC" })]));
    expect(vazamentos(textoSlides(z))).toEqual([]);
    for (const f of slidesXml(z)) expect(vazamentos(z.file(f)!.asText())).toEqual([]);
  });
});
