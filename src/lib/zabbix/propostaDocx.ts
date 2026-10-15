// Word da proposta das Subscrições Zabbix, gerado do mesmo modelo da pré-visualização.
import {
  AlignmentType, BorderStyle, Document, HeadingLevel, Packer, PageBreak, Paragraph, Table, TableCell, TableRow, TextRun, WidthType,
} from "docx";
import { A_CONFIRMAR, dataExtenso, type ModeloPropostaZbx } from "./proposta";

const COR = "17392F";
const FONTE = "Segoe UI";
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const run = (t: string, o: { bold?: boolean; size?: number; color?: string } = {}) =>
  new TextRun({ text: t, bold: o.bold, size: o.size ?? 22, color: t.includes(A_CONFIRMAR) ? "B45309" : o.color, font: FONTE });
const p = (t: string, o: { bold?: boolean; size?: number; color?: string; after?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) =>
  new Paragraph({ children: [run(t, o)], spacing: { after: o.after ?? 120 }, alignment: o.align });
const blocoTexto = (t: string) => t.split(/\n+/).map((l) => l.trim()).filter(Boolean).map((l) => p(l));
const titulo = (t: string, quebra = true) => new Paragraph({
  heading: HeadingLevel.HEADING_1, pageBreakBefore: quebra, spacing: { before: 0, after: 200 },
  children: [new TextRun({ text: t, bold: true, size: 32, color: COR, font: FONTE })],
});
const sub = (t: string) => new Paragraph({ spacing: { before: 200, after: 80 }, keepNext: true, children: [new TextRun({ text: t, bold: true, size: 24, color: COR, font: FONTE })] });

const borda = { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" };
const cel = (t: string, o: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; fill?: string } = {}) => new TableCell({
  children: [new Paragraph({ alignment: o.align ?? AlignmentType.LEFT, children: [run(t, { bold: o.bold, size: 20 })] })],
  shading: o.fill ? { fill: o.fill } : undefined,
  borders: { top: borda, bottom: borda, left: borda, right: borda },
  margins: { top: 60, bottom: 60, left: 100, right: 100 },
});

/** Despachante: emissões novas (layoutVersao 2) usam o template Selbetti; antigas, o gerador legado. */
export async function gerarPropostaZbxDocx(m: ModeloPropostaZbx): Promise<Blob> {
  if (m.layoutVersao === 2) return (await import("./propostaDocxV2")).gerarPropostaZbxDocxV2(m);
  return gerarPropostaZbxDocxLegado(m);
}

export async function gerarPropostaZbxDocxLegado(m: ModeloPropostaZbx): Promise<Blob> {
  const C = AlignmentType.CENTER, R = AlignmentType.RIGHT;
  const cab = ["Descrição", "Quantidade", ...(m.exibirLista ? ["Valor de lista Zabbix"] : []), "Valor Unitário Selbetti", "Valor Total"];
  const tabela = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: cab.map((h) => cel(h, { bold: true, align: C, fill: "E7EFEA" })) }),
      ...m.itens.map((i) => new TableRow({ children: [
        cel(i.descricao), cel(String(i.quantidade), { align: C }),
        ...(m.exibirLista ? [cel(i.listaUnitarioBrl == null ? "—" : brl(i.listaUnitarioBrl), { align: R })] : []),
        cel(brl(i.unitario), { align: R }), cel(brl(i.total), { align: R }),
      ] })),
      new TableRow({ children: [
        new TableCell({ columnSpan: cab.length - 1, children: [new Paragraph({ alignment: R, children: [run("Total geral", { bold: true, size: 20 })] })], borders: { top: borda, bottom: borda, left: borda, right: borda }, margins: { top: 60, bottom: 60, left: 100, right: 100 } }),
        cel(brl(m.total), { bold: true, align: R }),
      ] }),
    ],
  });

  const children = [
    // 1. Capa e carta
    p("PROPOSTA COMERCIAL", { bold: true, size: 44, color: COR, after: 80 }),
    p("Subscrições Oficiais Zabbix", { size: 32, color: COR, after: 600 }),
    p(m.cliente || A_CONFIRMAR, { bold: true, size: 28 }),
    p(`${m.codigo ?? ""}${m.versao ? ` · versão ${m.versao}` : ""}`, { size: 20 }),
    new Paragraph({ children: [new PageBreak()] }),
    p(`${m.cidade}, ${dataExtenso(m.dataEmissao)}.`, { after: 300 }),
    p(m.cliente || A_CONFIRMAR, { bold: true, after: 40 }),
    ...(m.contato ? [p(`A/C ${m.contato}`, { after: 40 })] : []),
    ...(m.email ? [p(m.email, { after: 240 })] : [p("", { after: 200 })]),
    p("Prezado(a),"),
    p("Agradecemos a oportunidade de apresentar nossa proposta para fornecimento de subscrições oficiais Zabbix. Nas próximas páginas detalhamos o escopo, as condições comerciais e os investimentos."),
    p("Permanecemos à disposição para quaisquer esclarecimentos.", { after: 400 }),
    p("Atenciosamente,"),
    p(m.consultor || A_CONFIRMAR, { bold: true, after: 40 }),
    p("Selbetti IT Solutions"),
    // 2. Quem somos
    titulo("Quem somos"),
    ...blocoTexto(m.quemSomos),
    ...m.numeros.map((n) => new Paragraph({ bullet: { level: 0 }, children: [run(n)] })),
    // 3. Objeto
    titulo("Objeto e escopo"),
    ...blocoTexto(m.objeto),
    // 4. Blocos por subscrição
    ...m.blocos.flatMap((b, i) => [
      i === 0 ? sub(`${b.titulo}${b.aConfirmar ? `  ${A_CONFIRMAR}` : ""}`) : sub(`${b.titulo}${b.aConfirmar ? `  ${A_CONFIRMAR}` : ""}`),
      p(b.partNumber + (b.tagline ? ` · ${b.tagline}` : ""), { size: 18 }),
      ...b.campos.flatMap((c) => [p(c.label, { bold: true, after: 40 }), ...blocoTexto(c.texto)]),
    ]),
    // 5. Preços
    titulo("Investimento"),
    tabela,
    // 6. Condições comerciais
    sub("Condições comerciais"),
    ...[
      `Vigência: ${m.vigenciaMeses} meses.`,
      `Validade da proposta: ${m.validadeDias} dias (até ${dataExtenso(m.dataValidade)}).`,
      `Prazo de pagamento: ${m.prazoPagamento}`,
      "Impostos: inclusos.",
      "Faturamento sujeito à aprovação de crédito.",
    ].map((t) => new Paragraph({ bullet: { level: 0 }, children: [run(t)] })),
    // 7. Observações e tributário
    ...(m.observacoes ? [sub("Observações"), ...blocoTexto(m.observacoes)] : []),
    sub("Informações tributárias"),
    ...blocoTexto(m.textoTributario),
    // 8. Faturamento
    sub("Dados de faturamento da Selbetti"),
    ...m.dadosFaturamento.map((l) => p(l, { after: 40 })),
    // 9. Aceite
    titulo("Aceite"),
    p(`Declaramos estar de acordo com a proposta ${m.codigo ?? ""}${m.versao ? ` (versão ${m.versao})` : ""}, contemplando:`),
    ...m.itens.map((i) => new Paragraph({ bullet: { level: 0 }, children: [run(`${i.quantidade} × ${i.descricao} — ${brl(i.total)}`)] })),
    p(`Valor total: ${brl(m.total)}`, { bold: true, after: 600 }),
    p("_____________________________________________", { after: 40 }),
    p(m.cliente || A_CONFIRMAR, { bold: true, after: 40 }),
    p("Nome / Cargo / Data", { size: 18 }),
  ];

  const doc = new Document({
    styles: { default: { document: { run: { font: FONTE, size: 22 } } } },
    sections: [{ properties: { page: { margin: { top: 1418, bottom: 1418, left: 1418, right: 1418 } } }, children }],
  });
  return Packer.toBlob(doc);
}
