// Gera a proposta de Treinamento em Word (.docx) no navegador.
import { AlignmentType, BorderStyle, Document, HeadingLevel, LevelFormat, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import type { TrainingCourse, TrainingCourseContent } from "./types";

export interface PropostaDocxItem {
  curso: TrainingCourse; conteudo?: TrainingCourseContent; modalidade: string; alunos: number;
  somenteExame: boolean; precoPorAluno: number; total: number;
}
export interface PropostaDocxDados {
  cliente: string; contato: string; email: string; codigo: string | null; versao: number | null;
  emissao: string; validade: string; validadeDias: number; condicoesPagamento: string; observacoes: string;
  itens: PropostaDocxItem[]; total: number;
}

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const W = 9026; // A4, margens de 1"
const COLS = [3400, 1700, 900, 1500, 1526];
const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };

const p = (text: string, opts: { bold?: boolean; italics?: boolean; size?: number } = {}) =>
  new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text, ...opts })] });
const campo = (label: string, valor?: string | null) =>
  valor ? new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun(valor)] }) : null;
const cell = (text: string, i: number, opts: { bold?: boolean; right?: boolean; head?: boolean } = {}) =>
  new TableCell({
    borders, width: { size: COLS[i], type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
    shading: opts.head ? { fill: "E8EEF2", type: ShadingType.CLEAR } : undefined,
    children: [new Paragraph({ alignment: opts.right ? AlignmentType.RIGHT : AlignmentType.LEFT, children: [new TextRun({ text, bold: opts.bold || opts.head })] })],
  });

export async function gerarPropostaDocx(d: PropostaDocxDados): Promise<Blob> {
  const children: (Paragraph | Table)[] = [
    p("PROPOSTA COMERCIAL · TREINAMENTO", { size: 18, bold: true }),
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(d.cliente || "Cliente")] }),
  ];
  if (d.contato) children.push(p(`A/C ${d.contato}${d.email ? ` · ${d.email}` : ""}`));
  if (d.codigo) children.push(p(`${d.codigo}${d.versao ? ` · v${d.versao}` : ""}`));
  children.push(p(`Emissão: ${d.emissao} · Validade: ${d.validade}`));

  children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Cursos")] }));
  for (const it of d.itens) {
    const c = it.conteudo;
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(`${it.curso.nome}${it.somenteExame ? " — somente exame" : ""}`)] }));
    children.push(p(`${it.modalidade} · ${it.curso.horas_execucao}h${it.curso.dias ? ` · ${it.curso.dias} dia(s)` : ""}`, { italics: true }));
    if (c?.tagline) children.push(p(c.tagline, { italics: true }));
    if (c?.descricao) children.push(p(c.descricao));
    for (const x of [campo("Público-alvo", c?.publico_alvo), campo("Pré-requisito", c?.pre_requisito), campo("Formato", c?.formato),
      campo("Horário", c?.horario), campo("Entregável", c?.entregavel), campo("Exame", c?.exame_descricao)]) if (x) children.push(x);
    if (c?.cronograma?.length) {
      children.push(p("Conteúdo programático", { bold: true }));
      c.cronograma.forEach((m) => children.push(new Paragraph({
        numbering: { reference: "numeros", level: 0 },
        children: [new TextRun({ text: m.titulo, bold: true }), new TextRun(m.topicos?.length ? `: ${m.topicos.join("; ")}` : "")],
      })));
    }
  }

  children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Investimento")] }));
  children.push(new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: COLS,
    rows: [
      new TableRow({ tableHeader: true, children: ["Item", "Modalidade", "Alunos", "Por aluno", "Total"].map((t, i) => cell(t, i, { head: true, right: i >= 2 })) }),
      ...d.itens.map((it) => new TableRow({ children: [
        cell(`${it.curso.nome}${it.somenteExame ? " (exame)" : ""}`, 0), cell(it.modalidade, 1),
        cell(String(it.alunos), 2, { right: true }), cell(brl(it.precoPorAluno), 3, { right: true }), cell(brl(it.total), 4, { right: true }),
      ] })),
      new TableRow({ children: [cell("Total", 0, { bold: true }), cell("", 1), cell("", 2), cell("", 3), cell(brl(d.total), 4, { bold: true, right: true })] }),
    ],
  }));
  children.push(p("Valores com impostos inclusos.", { size: 18, italics: true }));

  children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Condições")] }));
  children.push(campo("Pagamento", d.condicoesPagamento)!);
  children.push(campo("Validade da proposta", `${d.validadeDias} dias (${d.validade})`)!);
  if (d.observacoes) d.observacoes.split("\n").forEach((l, i) => children.push(i === 0 ? campo("Observações", l)! : p(l)));

  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Arial", size: 22 } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 36, bold: true, font: "Arial" }, paragraph: { spacing: { before: 120, after: 120 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 28, bold: true, font: "Arial" }, paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 } },
        { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 24, bold: true, font: "Arial" }, paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 } },
      ],
    },
    numbering: { config: [{ reference: "numeros", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }] },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, children }],
  });
  return Packer.toBlob(doc);
}
