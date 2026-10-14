// Gera a proposta de Treinamento em Word (.docx) a partir do modelo oficial Selbetti.
// REGRA: o modelo é intocável. Capa e páginas institucionais (1–4), seções, quebras de página,
// margens, fontes e tamanhos vêm do modelo; aqui só se trocam os marcadores <...> pelo conteúdo.
// Os tamanhos do conteúdo seguem o exemplo formatado pelo comercial:
//   cursos = tamanho padrão do documento (12pt); tabela, termos e observações = 11pt.
import JSZip from "jszip";
import modeloAsset from "@/assets/proposta-treinamento-modelo-v2.docx.asset.json";
import type { TrainingCourse, TrainingCourseContent } from "./types";

export interface PropostaDocxItem {
  curso: TrainingCourse; conteudo?: TrainingCourseContent; modalidade: string; alunos: number;
  somenteExame: boolean; precoPorAluno: number; total: number;
}
export interface PropostaDocxDados {
  cliente: string; contato: string; email: string; codigo: string | null; versao: number | null;
  emissao: string; validade: string; validadeDias: number; condicoesPagamento: string; observacoes: string;
  especialista?: string;
  itens: PropostaDocxItem[]; total: number;
}

const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
/** "29/09/2026" ou ISO → "29 de setembro de 2026". */
export function dataExtenso(s: string): string {
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${Number(m[1])} de ${MESES[Number(m[2]) - 1]} de ${m[3]}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}`;
  return s;
}
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const COR = "17392F";
const PEQ = 22; // 11pt — tabela, termos e observações

export const xmlEsc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Fonte não é definida aqui: herda a fonte padrão do modelo.
interface RunOpt { bold?: boolean; italics?: boolean; size?: number; color?: string }
const rPr = (o: RunOpt = {}) => {
  const inner = (o.bold ? "<w:b/><w:bCs/>" : "") + (o.italics ? "<w:i/><w:iCs/>" : "") +
    (o.color ? `<w:color w:val="${o.color}"/>` : "") +
    (o.size ? `<w:sz w:val="${o.size}"/><w:szCs w:val="${o.size}"/>` : "");
  return inner ? `<w:rPr>${inner}</w:rPr>` : "";
};
const run = (t: string, o: RunOpt = {}) => `<w:r>${rPr(o)}<w:t xml:space="preserve">${xmlEsc(t)}</w:t></w:r>`;

interface ParOpt { keepNext?: boolean; pageBreak?: boolean; indent?: number; after?: number; before?: number; jc?: string }
const par = (runs: string, o: ParOpt = {}) =>
  `<w:p><w:pPr>${o.keepNext ? "<w:keepNext/>" : ""}${o.pageBreak ? "<w:pageBreakBefore/>" : ""}` +
  `<w:spacing w:before="${o.before ?? 0}" w:after="${o.after ?? 120}" w:line="276" w:lineRule="auto"/>` +
  (o.indent ? `<w:ind w:left="${o.indent}"/>` : "") + (o.jc ? `<w:jc w:val="${o.jc}"/>` : "") +
  `</w:pPr>${runs}</w:p>`;
const texto = (t: string, o: RunOpt = {}, p: ParOpt = {}) =>
  t.split(/\n+/).map((l) => l.trim()).filter(Boolean).map((l) => par(run(l, o), p)).join("");

function conteudoCurso(it: PropostaDocxItem): string {
  const c = it.conteudo;
  const out: string[] = [];
  // Cada curso começa numa página nova (inclusive o primeiro, como no modelo).
  out.push(par(run(`${it.curso.nome}${it.somenteExame ? " — somente exame" : ""}`, { bold: true, color: COR }),
    { keepNext: true, pageBreak: true, after: 80 }));
  const dias = it.curso.dias ? ` · ${String(it.curso.dias).replace(".", ",")} dia(s)` : "";
  out.push(par(run(`${it.modalidade} · ${it.curso.horas_execucao}h${dias}`, { italics: true }), { after: 160 }));
  if (c?.tagline) out.push(texto(c.tagline, { italics: true }));
  if (c?.descricao) out.push(texto(c.descricao, {}, { jc: "both" }));
  const campos: [string, string | null | undefined][] = [
    ["Público-alvo", c?.publico_alvo], ["Pré-requisito", c?.pre_requisito], ["Formato", c?.formato],
    ["Horário", c?.horario], ["Entregável", c?.entregavel], ["Exame", c?.exame_descricao],
  ];
  for (const [label, valor] of campos) {
    if (!valor?.trim()) continue;
    out.push(par(run(label, { bold: true, color: COR }), { keepNext: true, before: 320, after: 60 }));
    out.push(texto(valor, {}, { jc: "both" }));
  }
  if (c?.cronograma?.length) {
    out.push(par(run("Conteúdo programático", { bold: true, color: COR }), { keepNext: true, before: 360, after: 100 }));
    c.cronograma.forEach((m, i) => {
      const temTopicos = !!m.topicos?.length;
      out.push(par(run(`${i + 1}. ${m.titulo}`, { bold: true }), { keepNext: temTopicos, after: 40 }));
      m.topicos?.forEach((t) => out.push(par(run(`– ${t}`), { indent: 426, after: 40 })));
    });
  }
  return out.join("");
}

/** Substitui o parágrafo inteiro que contém o marcador. */
function trocarParagrafo(xml: string, marcador: string, novo: string): string {
  const i = xml.indexOf(marcador);
  if (i < 0) return xml;
  const ini = Math.max(xml.lastIndexOf("<w:p ", i), xml.lastIndexOf("<w:p>", i));
  const fim = xml.indexOf("</w:p>", i) + 6;
  return xml.slice(0, ini) + novo + xml.slice(fim);
}

/** Usa a linha-modelo da tabela (formatação do modelo) e troca só o texto de cada célula. */
function preencherLinha(rowXml: string, valores: string[], bold: boolean): string {
  let k = 0;
  return rowXml.replace(/<w:tc>[\s\S]*?<\/w:tc>/g, (tc) => {
    const v = valores[k++] ?? "";
    const limpo = tc.replace(/<w:r[\s>][\s\S]*?<\/w:r>/g, "");
    const pos = limpo.lastIndexOf("</w:p>");
    return limpo.slice(0, pos) + run(v, { bold, size: PEQ }) + limpo.slice(pos);
  });
}

/** Tabela de investimento: mantém cabeçalho do modelo; troca as linhas de valores. */
function preencherInvestimento(xml: string, d: PropostaDocxDados): string {
  const h = xml.indexOf(">Valor Total<");
  if (h < 0) return xml;
  const tIni = xml.lastIndexOf("<w:tbl>", h);
  const tFim = xml.indexOf("</w:tbl>", h);
  const cabFim = xml.indexOf("</w:tr>", h) + 7;
  const modFim = xml.indexOf("</w:tr>", cabFim) + 7;
  if (tIni < 0 || cabFim <= 6 || modFim > tFim) return xml;
  const modelo = xml.slice(cabFim, modFim);
  const linhas = d.itens.map((it) => preencherLinha(modelo, [
    `${it.curso.nome}${it.somenteExame ? " (exame)" : ""}`, it.modalidade, String(it.alunos), brl(it.precoPorAluno), brl(it.total),
  ], false));
  linhas.push(preencherLinha(modelo, ["Total do investimento", "", "", "", brl(d.total)], true));
  return xml.slice(0, cabFim) + linhas.join("") + xml.slice(tFim);
}

export async function preencherModelo(modelo: ArrayBuffer, d: PropostaDocxDados): Promise<Blob> {
  const zip = await JSZip.loadAsync(modelo);
  let xml = await zip.file("word/document.xml")!.async("string");
  const nomes = d.itens.map((it) => it.curso.nome).filter((n, i, a) => a.indexOf(n) === i).join(", ") || "Treinamento";

  d = { ...d, emissao: dataExtenso(d.emissao), validade: dataExtenso(d.validade) };
  const simples: [string, string][] = [
    ["&lt;Data de Hoje&gt;", d.emissao],
    ["&lt;Nome do Especialista&gt;", d.especialista?.trim() ? `${d.especialista.trim()} – ` : ""],
    ["&lt;Nome do Treinamento&gt;", nomes],
    ["&lt;NOME DO TREINAMENTO&gt;", nomes],
    ["&lt;DATA DE VALIDADE DA PROPOSTA&gt;", d.validade],
  ];
  for (const [m, v] of simples) xml = xml.split(m).join(xmlEsc(v));

  xml = trocarParagrafo(xml, "&lt;CONTEUDO DO TREINAMENTO&gt;", d.itens.map(conteudoCurso).join("") || par(run("")));
  xml = preencherInvestimento(xml, d);

  const p = { size: PEQ };
  const obs: string[] = [];
  if (d.condicoesPagamento) obs.push(par(run("Pagamento: ", { ...p, bold: true }) + run(d.condicoesPagamento, p)));
  obs.push(par(run("Validade: ", { ...p, bold: true }) + run(`${d.validadeDias} dias (${d.validade})`, p)));
  obs.push(par(run("Valores com impostos inclusos.", p)));
  if (d.observacoes.trim()) {
    obs.push(par(run("Observações", { ...p, bold: true, color: COR }), { keepNext: true, before: 160, after: 40 }));
    obs.push(texto(d.observacoes, p));
  }
  xml = trocarParagrafo(xml, "&lt;OBSERVAÇÕES DA PROPOSTA&gt;", obs.join(""));

  zip.file("word/document.xml", xml);
  return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

export async function gerarPropostaDocx(d: PropostaDocxDados): Promise<Blob> {
  const resp = await fetch(modeloAsset.url);
  if (!resp.ok) throw new Error("Não foi possível carregar o modelo da proposta.");
  return preencherModelo(await resp.arrayBuffer(), d);
}
