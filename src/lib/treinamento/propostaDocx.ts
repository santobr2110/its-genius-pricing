// Gera a proposta de Treinamento em Word (.docx) a partir do modelo oficial Selbetti.
// O modelo tem marcadores <...>; aqui eles são substituídos preservando capa,
// cabeçalhos, rodapés, margens e quebras de página do documento original.
import JSZip from "jszip";
import modeloAsset from "@/assets/proposta-treinamento-modelo.docx.asset.json";
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
const FONTE = "Segoe UI";
const TAM = 28; // 14pt (meios-pontos)
const COR = "17392F";

export const xmlEsc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

interface RunOpt { bold?: boolean; italics?: boolean; size?: number; color?: string }
const rPr = (o: RunOpt = {}) =>
  `<w:rPr><w:rFonts w:ascii="${FONTE}" w:hAnsi="${FONTE}" w:eastAsia="${FONTE}" w:cs="${FONTE}"/>` +
  (o.bold ? "<w:b/><w:bCs/>" : "") + (o.italics ? "<w:i/><w:iCs/>" : "") +
  (o.color ? `<w:color w:val="${o.color}"/>` : "") +
  `<w:sz w:val="${o.size ?? TAM}"/><w:szCs w:val="${o.size ?? TAM}"/></w:rPr>`;
const run = (t: string, o: RunOpt = {}) => `<w:r>${rPr(o)}<w:t xml:space="preserve">${xmlEsc(t)}</w:t></w:r>`;

interface ParOpt { keepNext?: boolean; pageBreak?: boolean; indent?: number; after?: number; before?: number; jc?: string }
const par = (runs: string, o: ParOpt = {}) =>
  `<w:p><w:pPr>${o.keepNext ? "<w:keepNext/>" : ""}${o.pageBreak ? "<w:pageBreakBefore/>" : ""}` +
  `<w:spacing w:before="${o.before ?? 0}" w:after="${o.after ?? 120}" w:line="276" w:lineRule="auto"/>` +
  (o.indent ? `<w:ind w:left="${o.indent}"/>` : "") + (o.jc ? `<w:jc w:val="${o.jc}"/>` : "") +
  `</w:pPr>${runs}</w:p>`;
const texto = (t: string, o: RunOpt = {}, p: ParOpt = {}) =>
  t.split(/\n+/).map((l) => l.trim()).filter(Boolean).map((l) => par(run(l, o), p)).join("");

function conteudoCurso(it: PropostaDocxItem, idx: number): string {
  const c = it.conteudo;
  const out: string[] = [];
  out.push(par(run(`${it.curso.nome}${it.somenteExame ? " — somente exame" : ""}`, { bold: true, size: 32, color: COR }),
    { keepNext: true, pageBreak: idx > 0, after: 80 }));
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

/** Preenche o parágrafo vazio de cada célula de uma linha da tabela. */
/** Centraliza horizontal e verticalmente todas as células de uma linha. */
function centralizar(rowXml: string): string {
  return rowXml
    .replace(/<w:vAlign [^>]*\/>/g, "")
    .replace(/<\/w:tcPr>/g, '<w:vAlign w:val="center"/></w:tcPr>')
    .replace(/<w:jc w:val="[^"]*"\/>/g, "")
    .replace(/<w:pPr>([\s\S]*?)<\/w:pPr>/g, (m, inner: string) => {
      const pos = inner.indexOf("<w:rPr>");
      return pos < 0 ? `<w:pPr>${inner}<w:jc w:val="center"/></w:pPr>` : `<w:pPr>${inner.slice(0, pos)}<w:jc w:val="center"/>${inner.slice(pos)}</w:pPr>`;
    })
    .replace(/<w:p>(?!<w:pPr>)/g, '<w:p><w:pPr><w:jc w:val="center"/></w:pPr>')
    .replace(/(<w:p [^>]*>)(?!<w:pPr>)/g, '$1<w:pPr><w:jc w:val="center"/></w:pPr>');
}

function preencherLinha(rowXml: string, valores: string[], bold: boolean): string {
  let k = 0;
  return centralizar(rowXml).replace(/<w:tc>[\s\S]*?<\/w:tc>/g, (tc) => {
    const v = valores[k++] ?? "";
    const pos = tc.lastIndexOf("</w:p>");
    return tc.slice(0, pos) + run(v, { bold, size: 22 }) + tc.slice(pos);
  });
}

/** Duplica a última célula da linha (usado para criar a coluna "Valor Total"). */
function duplicarUltimaCelula(row: string, trocar?: [string, string]): string {
  const ini = row.lastIndexOf("<w:tc>");
  const fim = row.lastIndexOf("</w:tc>") + 7;
  let tc = row.slice(ini, fim);
  if (trocar) tc = tc.split(trocar[0]).join(trocar[1]);
  return row.slice(0, fim) + tc + row.slice(fim);
}

function preencherInvestimento(xml: string, d: PropostaDocxDados): string {
  const h = xml.indexOf("Valor Unit.");
  if (h < 0) return xml;
  const tIni = xml.lastIndexOf("<w:tbl>", h);
  const tFim = xml.indexOf("</w:tbl>", h) + 8;
  let tbl = xml.slice(tIni, tFim);

  // Redistribui as larguras (total 9618, igual ao original) para incluir a coluna Valor Total.
  const larg: Record<string, string> = { "4971": "3300", "1393": "1593", "1436": "1300", "1818": "1712" };
  tbl = tbl.replace(/<w:tblGrid>[\s\S]*?<\/w:tblGrid>/,
    '<w:tblGrid><w:gridCol w:w="3300"/><w:gridCol w:w="1593"/><w:gridCol w:w="1300"/><w:gridCol w:w="1712"/><w:gridCol w:w="1713"/></w:tblGrid>');
  tbl = tbl.replace(/<w:tcW w:w="(\d+)" w:type="dxa"\/>/g, (m, w) => (larg[w] ? `<w:tcW w:w="${larg[w]}" w:type="dxa"/>` : m));
  tbl = tbl.replace('<w:gridSpan w:val="4"/>', '<w:gridSpan w:val="5"/>');

  const hh = tbl.indexOf("Valor Unit.");
  const hIni = tbl.lastIndexOf("<w:tr", hh);
  const hFim = tbl.indexOf("</w:tr>", hh) + 7;
  const cab = duplicarUltimaCelula(tbl.slice(hIni, hFim), ["Valor Unit.", "Valor Total"]).replace(">Quantidade<", ">Alunos<").replace(/w:w="1712"(?![\s\S]*w:w="1712")/, 'w:w="1713"');
  const ini = hFim;
  const fim = tbl.indexOf("</w:tr>", ini) + 7;
  const modelo = duplicarUltimaCelula(tbl.slice(ini, fim)).replace(/w:w="1712"(?![\s\S]*w:w="1712")/, 'w:w="1713"');
  const linhas = d.itens.map((it) => preencherLinha(modelo, [
    `${it.curso.nome}${it.somenteExame ? " (exame)" : ""}`, it.modalidade, String(it.alunos), brl(it.precoPorAluno), brl(it.total),
  ], false));
  linhas.push(preencherLinha(modelo, ["Total do investimento", "", "", "", brl(d.total)], true));
  tbl = tbl.slice(0, hIni) + centralizar(cab) + linhas.join("") + tbl.slice(fim);
  return xml.slice(0, tIni) + tbl + xml.slice(tFim);
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
    ["&lt;INVESTIMENTO&gt;", "Investimento"],
  ];
  for (const [m, v] of simples) xml = xml.split(m).join(xmlEsc(v));
  xml = xml.replace(/Proposta válida até: 30\/<\/w:t>[\s\S]*?<w:t>\/2026<\/w:t>/, `Proposta válida até: ${xmlEsc(d.validade)}</w:t>`);

  xml = trocarParagrafo(xml, "&lt;CONTEUDO DO TREINAMENTO&gt;", d.itens.map(conteudoCurso).join("") || par(run("")));
  xml = preencherInvestimento(xml, d);

  const obs: string[] = [];
  if (d.cliente) obs.push(par(run("Cliente: ", { bold: true }) + run(d.cliente)));
  if (d.contato) obs.push(par(run("A/C: ", { bold: true }) + run(`${d.contato}${d.email ? ` · ${d.email}` : ""}`)));
  if (d.codigo) obs.push(par(run("Referência: ", { bold: true }) + run(`${d.codigo}${d.versao ? ` · v${d.versao}` : ""}`)));
  if (d.condicoesPagamento) obs.push(par(run("Pagamento: ", { bold: true }) + run(d.condicoesPagamento)));
  obs.push(par(run("Validade: ", { bold: true }) + run(`${d.validadeDias} dias (${d.validade})`)));
  obs.push(par(run("Valores com impostos inclusos.", { italics: true })));
  if (d.observacoes.trim()) {
    obs.push(par(run("Observações", { bold: true, color: COR }), { keepNext: true, before: 160, after: 40 }));
    obs.push(texto(d.observacoes, {}, { jc: "both" }));
  }
  xml = trocarParagrafo(xml, "&lt;OBSERVAÇÕES DA PROPOSTA&gt;", obs.join(""));

  xml = removerPaginasEmBranco(xml);
  zip.file("word/document.xml", xml);
  // Fonte única em todo o documento: troca fontes explícitas e as do tema em todas as partes XML.
  for (const nome of Object.keys(zip.files)) {
    if (!/^word\/.*\.xml$/.test(nome)) continue;
    let x = nome === "word/document.xml" ? xml : await zip.file(nome)!.async("string");
    x = x.replace(/<w:rFonts\b[^>]*\/>/g, `<w:rFonts w:ascii="${FONTE}" w:hAnsi="${FONTE}" w:eastAsia="${FONTE}" w:cs="${FONTE}"/>`)
      .replace(/(<a:(?:latin|ea|cs)\s+typeface=")[^"]*"/g, `$1${FONTE}"`);
    zip.file(nome, x);
  }
  return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

export async function gerarPropostaDocx(d: PropostaDocxDados): Promise<Blob> {
  const resp = await fetch(modeloAsset.url);
  if (!resp.ok) throw new Error("Não foi possível carregar o modelo da proposta.");
  return preencherModelo(await resp.arrayBuffer(), d);
}

/**
 * Evita páginas em branco: um parágrafo que só contém quebra de página (e os parágrafos vazios
 * antes dele) "transborda" para a página seguinte quando a anterior está cheia, gerando uma página vazia.
 * Troca por "quebra de página antes" no parágrafo seguinte — o Word nunca deixa página em branco assim.
 */
export function removerPaginasEmBranco(xml: string): string {
  const vazio = String.raw`<w:p\b(?:[^>]*\/>|[^>]*[^/]>(?:(?!<w:p\b)(?!<w:t[ >])(?!<w:drawing)(?!<w:br)(?!<w:sectPr)(?!<w:pict)[\s\S])*?<\/w:p>)`;
  const quebra = String.raw`<w:p\b[^>]*[^/]>(?:<w:pPr>(?:(?!<w:sectPr)[\s\S])*?<\/w:pPr>)?<w:r\b[^>]*>(?:<w:rPr>(?:(?!<\/w:r>)[\s\S])*?<\/w:rPr>)?(?:<w:lastRenderedPageBreak\/>)?<w:br w:type="page"\/><\/w:r><\/w:p>`;
  const re = new RegExp(`(?:${vazio})*${quebra}(<w:p\\b[^>]*>)(<w:pPr>[\\s\\S]*?<\\/w:pPr>|<w:pPr\\/>)?`, "g");
  return xml.replace(re, (_m, abre: string, ppr?: string) => {
    if (!ppr || ppr === "<w:pPr/>") return `${abre}<w:pPr><w:pageBreakBefore/></w:pPr>`;
    if (ppr.includes("<w:pageBreakBefore")) return abre + ppr;
    const m = ppr.match(/^<w:pPr>((?:<w:pStyle[^>]*\/>)?(?:<w:keepNext[^>]*\/>)?(?:<w:keepLines[^>]*\/>)?)/)!;
    return `${abre}<w:pPr>${m[1]}<w:pageBreakBefore/>${ppr.slice(m[0].length)}`;
  });
}
