// Word da proposta dos Pacotes Consultivos SRE, gerado do mesmo ModeloPropostaSre da pré-visualização.
// Enquanto o template .docx (public/templates/proposta-consultivo-sre-template.docx) não for entregue,
// o despachante usa este gerador programático (layoutVersao 1). [A CONFIRMAR] sai realçado em amarelo.
import {
  AlignmentType, BorderStyle, Document, HeadingLevel, Packer, PageBreak, Paragraph, Table, TableCell, TableRow, TextRun, WidthType,
} from "docx";
import { A_CONFIRMAR, dataExtenso, type ModeloPropostaSre } from "./proposta";

const COR = "17392F";
const FONTE = "Segoe UI";
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtH = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
type Al = (typeof AlignmentType)[keyof typeof AlignmentType];

const run = (t: string, o: { bold?: boolean; size?: number; color?: string } = {}) =>
  new TextRun({ text: t, bold: o.bold, size: o.size ?? 22, color: o.color, font: FONTE, highlight: t.includes(A_CONFIRMAR) ? "yellow" : undefined });
const p = (t: string, o: { bold?: boolean; size?: number; color?: string; after?: number; align?: Al } = {}) =>
  new Paragraph({ children: [run(t, o)], spacing: { after: o.after ?? 120 }, alignment: o.align });
const bloco = (t: string) => t.split(/\n+/).map((l) => l.trim()).filter(Boolean).map((l) => p(l));
const bullet = (t: string) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: [run(t)] });
const titulo = (t: string, quebra = true) => new Paragraph({
  heading: HeadingLevel.HEADING_1, pageBreakBefore: quebra, spacing: { before: 0, after: 200 },
  children: [new TextRun({ text: t, bold: true, size: 32, color: COR, font: FONTE })],
});
const sub = (t: string) => new Paragraph({ spacing: { before: 200, after: 80 }, keepNext: true, children: [run(t, { bold: true, size: 24, color: COR })] });

const borda = { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" };
const W = [1500, 3060, 900, 900, 1400, 1600]; // soma 9360 (A4 com margens de 2,5 cm ≈ 9026; ajusta pelo Word)
const cel = (t: string, w: number, o: { bold?: boolean; align?: Al; fill?: string; span?: number } = {}) => new TableCell({
  width: { size: w, type: WidthType.DXA }, columnSpan: o.span,
  children: [new Paragraph({ alignment: o.align ?? AlignmentType.LEFT, children: [run(t, { bold: o.bold, size: 19 })] })],
  shading: o.fill ? { fill: o.fill } : undefined,
  borders: { top: borda, bottom: borda, left: borda, right: borda },
  margins: { top: 60, bottom: 60, left: 100, right: 100 },
});

/** Despachante: layoutVersao 2 = template Selbetti (quando existir); demais = gerador programático. */
export async function gerarPropostaSreDocx(m: ModeloPropostaSre): Promise<Blob> {
  return gerarPropostaSreDocxProgramatico(m);
}

export function documentoPropostaSre(m: ModeloPropostaSre): Document {
  const C = AlignmentType.CENTER, R = AlignmentType.RIGHT;
  const cab = ["Part number", "Descrição", "Horas", "Quantidade", "Valor por hora", "Valor Total"];
  const tabela = new Table({
    width: { size: W.reduce((s, x) => s + x, 0), type: WidthType.DXA }, columnWidths: W,
    rows: [
      new TableRow({ tableHeader: true, children: cab.map((h, i) => cel(h, W[i], { bold: true, align: C, fill: "E7EFEA" })) }),
      ...m.itens.map((i) => new TableRow({ children: [
        cel(i.partNumber, W[0]), cel(i.descricao, W[1]), cel(fmtH(i.horas), W[2], { align: C }), cel(String(i.quantidade), W[3], { align: C }),
        cel(brl(i.valorHora), W[4], { align: R }), cel(brl(i.total), W[5], { align: R }),
      ] })),
      new TableRow({ children: [
        cel("Total geral", W.slice(0, 5).reduce((s, x) => s + x, 0), { bold: true, align: R, span: 5 }),
        cel(brl(m.total), W[5], { bold: true, align: R }),
      ] }),
    ],
  });
  const cli = m.cliente.razao || A_CONFIRMAR;
  const ref = `${m.numeroProposta}${m.versao ? ` · versão ${m.versao}` : ""}`;
  const children = [
    // 1. Capa e carta
    p("PROPOSTA COMERCIAL", { bold: true, size: 44, color: COR, after: 80 }),
    p("Pacotes Consultivos Zabbix SRE", { size: 32, color: COR, after: 600 }),
    p(cli, { bold: true, size: 28 }),
    p(ref, { size: 20 }),
    new Paragraph({ children: [new PageBreak()] }),
    p(`${m.cidade}, ${dataExtenso(m.dataEmissao)}.`, { after: 300 }),
    p(cli, { bold: true, after: 40 }),
    ...(m.cliente.cnpj ? [p(`CNPJ: ${m.cliente.cnpj}`, { after: 40 })] : []),
    ...(m.cliente.endereco ? [p(m.cliente.endereco, { after: 40 })] : []),
    ...(m.contato.nome ? [p(`A/C ${m.contato.nome}${m.contato.cargo ? ` – ${m.contato.cargo}` : ""}`, { after: 40 })] : []),
    ...(m.contato.email ? [p(m.contato.email, { after: 240 })] : [p("", { after: 200 })]),
    p("Prezado(a),"),
    p("Agradecemos a oportunidade de apresentar nossa proposta de pacotes consultivos para Zabbix. Nas próximas páginas detalhamos o escopo, as condições comerciais e os investimentos."),
    p("Permanecemos à disposição para quaisquer esclarecimentos.", { after: 400 }),
    p("Atenciosamente,"),
    p(m.consultor.nome || A_CONFIRMAR, { bold: true, after: 40 }),
    ...(m.consultor.cargo ? [p(m.consultor.cargo, { after: 40 })] : []),
    p("Selbetti IT Solutions"),
    // 2. Quem somos
    titulo("Quem somos"),
    ...bloco(m.quemSomos),
    ...m.numeros.map((n) => bullet(`${n.valor}${n.rotulo ? ` ${n.rotulo}` : ""}`)),
    // 3. Objeto
    sub("Objeto e escopo"),
    ...bloco(m.objeto),
    p(m.fraseEscopo, { bold: true }),
    // 4. Pacotes
    ...m.blocos.flatMap((b, i) => [
      i === 0 ? titulo(b.titulo) : sub(b.titulo),
      p(`${b.partNumber} · ${fmtH(b.horas)} horas${b.tagline ? ` · ${b.tagline}` : ""}`, { size: 18 }),
      ...b.campos.flatMap((c) => [p(c.label, { bold: true, after: 40 }), ...bloco(c.texto)]),
    ]),
    // 5. Investimento
    titulo("Investimento"),
    tabela,
    p("Valor por hora calculado sobre as horas do pacote.", { size: 18 }),
    // 6. Condições comerciais
    sub("Condições comerciais"),
    ...m.condicoes.map(bullet),
    // 7. Observações e tributário
    ...(m.observacoes ? [sub("Observações"), ...bloco(m.observacoes)] : []),
    sub("Informações tributárias"),
    ...bloco(m.textoTributario),
    // 8. Faturamento
    sub("Dados de faturamento da Selbetti"),
    ...m.dadosFaturamento.map((l) => p(l, { after: 40 })),
    // 9. Aceite
    titulo("Aceite"),
    p(`Declaramos estar de acordo com a proposta ${ref}, contemplando:`),
    ...m.aceite.map(bullet),
    p(`Valor total: ${brl(m.total)}`, { bold: true, after: 600 }),
    p("_____________________________________________", { after: 40 }),
    p(cli, { bold: true, after: 40 }),
    p("Nome / Cargo / Data", { size: 18 }),
  ];
  return new Document({
    styles: { default: { document: { run: { font: FONTE, size: 22 } } } },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1418, bottom: 1418, left: 1134, right: 1134 } } }, children }],
  });
}

export async function gerarPropostaSreDocxProgramatico(m: ModeloPropostaSre): Promise<Blob> {
  return Packer.toBlob(documentoPropostaSre(m));
}
