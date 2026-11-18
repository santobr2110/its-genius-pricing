import { describe, expect, it } from "vitest";
import { Packer } from "docx";
import { computeCarrinhoSre, type EntradaLinhaSre, type GlobaisSre } from "@/lib/sre/carrinho";
import { montarModeloPropostaSre, nomeArquivoSre } from "@/lib/sre/proposta";
import { documentoPropostaSre } from "@/lib/sre/propostaDocx";

const tax = { pisPerc: 0.65, cofinsPerc: 3, issPerc: 2 };
const ent = (id: string, horas: number, alvo: number, q = 1): EntradaLinhaSre => ({
  linhaId: id, pacoteId: id, partNumber: `HRS-ZBX-${horas}`, nome: `Pacote ${horas}h`, horasExecucao: horas, pctHorasGestao: 20,
  custoHoraExecucao: 135, custoHoraGestao: 135, rentabilidadeAlvoPerc: alvo, quantidade: q, descontoPerc: 0,
  codigoProduto: "SRE", tax, origemParam: {},
});
const g: GlobaisSre = { comissaoFixaPerc: 5, retencaoPerc: 5, irpjCsllPerc: 10.34, irpjCsllConvencao: "padrao_site", encFinancPerc: 0, descontoTotalPerc: 0, campanha: null };
const res = computeCarrinhoSre([ent("a", 40, 30), ent("b", 100, 25, 2)], g, []);
const base = {
  res, contents: [], params: [{ key: "validade_horas_meses", value: 12 }],
  cliente: { razao: "Acme Ltda", cnpj: "00.000.000/0001-00", endereco: "Rua X" },
  contato: { nome: "Ana", cargo: "TI", email: "a@x.com" }, consultor: { nome: "Bruno", cargo: "Especialista" },
  codigo: "ITS-SRE-20261030-001", versao: null, salesforce: "123", hojeISO: "2026-10-30", validadeDias: 30,
};

describe("Proposta SRE (Fase 5)", () => {
  const m = montarModeloPropostaSre(base);

  it("tabela de investimento bate com o Configurador", () => {
    expect(m.itens).toHaveLength(2);
    m.itens.forEach((i, k) => {
      expect(i.total).toBeCloseTo(res.linhas[k].precoFinal, 6);
      expect(i.valorHora).toBeCloseTo(res.linhas[k].precoFinal / (i.horas * i.quantidade), 6);
    });
    expect(m.total).toBeCloseTo(res.precoFinalTotal, 6);
  });

  it("nenhuma menção a horas de gestão no modelo nem no Word", async () => {
    expect(JSON.stringify(m).toLowerCase()).not.toMatch(/gest[aã]o/);
    const buf = await Packer.toBuffer(documentoPropostaSre(m));
    const PizZip = (await import("pizzip")).default;
    const xml = new PizZip(buf).file("word/document.xml")!.asText().toLowerCase();
    expect(xml).not.toMatch(/gest[aã]o/);
    expect(xml).toContain("hrs-zbx-100");
  });

  it("validade padrão = data + dias; razão social em maiúsculas; aceite pelos pacotes reais", () => {
    expect(m.dataValidade).toBe("2026-11-29");
    expect(m.cliente.razao).toBe("ACME LTDA");
    expect(m.aceite).toHaveLength(2);
    expect(m.aceite[1]).toContain("2 × HRS-ZBX-100");
    expect(m.condicoes).toContain("Impostos: inclusos.");
    expect(m.condicoes.some((c) => c.includes("12 meses"))).toBe(true);
  });

  it("pacote genérico sem conteúdo comum sai [A CONFIRMAR]", () => {
    expect(m.blocos[0].campos.map((c) => c.label)).toEqual(["Descrição", "Fora do escopo", "Restrições"]);
    expect(m.blocos[0].campos.every((c) => c.texto === "[A CONFIRMAR]")).toBe(true);
  });

  it("pacote genérico usa o conteúdo comum e só troca as horas", () => {
    const params = [{ key: "proposta_generico_titulo", value: "Consultivo ({horas} horas)" }, { key: "proposta_generico_descricao", value: "Pacote de {horas} h" }];
    const g = montarModeloPropostaSre({ ...base, params });
    const h = g.blocos[0].horas;
    expect(g.blocos[0].titulo).toBe(`Consultivo (${h} horas)`);
    expect(g.blocos[0].campos[0].texto).toBe(`Pacote de ${h} h`);
  });

  it("pacote específico usa os cinco campos próprios", () => {
    const pid = m.blocos.length ? base.res.linhas[0].entrada.pacoteId : "";
    const e = montarModeloPropostaSre({ ...base, contents: [{ pacote_id: pid, tipo: "especifico", escopo_atividades: "Upgrade", a_confirmar: false } as never] });
    expect(e.blocos[0].campos.map((c) => c.label)).toEqual(["Escopo de atividades", "Detalhes adicionais", "Restrições", "Premissas", "Fora do escopo"]);
    expect(e.blocos[0].campos[0].texto).toBe("Upgrade");
    expect(e.blocos[0].aConfirmar).toBe(false);
  });

  it("nome do arquivo segue {Cliente}_OP{sf}_ConsultivoSRE_{ddmmaaaa}", () => {
    expect(nomeArquivoSre(m)).toBe("ACME_LTDA_OP123_ConsultivoSRE_30102026.docx");
  });

  it("emissão antiga reemite o modelo congelado, não o recalculado", () => {
    const congelado = JSON.parse(JSON.stringify(m));
    const novo = montarModeloPropostaSre({ ...base, res: computeCarrinhoSre([ent("a", 40, 40)], g, []) });
    expect(novo.total).not.toBeCloseTo(congelado.total, 2);
    expect(congelado.total).toBeCloseTo(res.precoFinalTotal, 6);
  });
});
