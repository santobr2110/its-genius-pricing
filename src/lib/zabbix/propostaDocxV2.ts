// Word da proposta Zabbix no layout v2: preenche o template .docx com identidade Selbetti
// (public/templates/proposta-zabbix-template.docx — nunca editar no código; mudanças visuais só no Word).
// Consome o mesmo ModeloPropostaZbx do preview/PDF. O layout v2 não exibe preço de lista (exibirLista).
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { A_CONFIRMAR, CAMPOS_CONTEUDO, dataExtenso, ehAcademy, type ModeloPropostaZbx, type SecaoMatriz } from "./proposta";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }).replace(/\u00a0/g, " ");
const ou = (v: string | null | undefined) => (v ?? "").trim() || A_CONFIRMAR;
const semAcento = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const ddmmaaaa = (iso: string) => { const [y, m, d] = iso.slice(0, 10).split("-"); return `${d}/${m}/${y}`; };

const CK = "✓", DASH = "–";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export function celulaMatrizXml(v: string): string {
  const check = v === CK, dash = v === DASH;
  const cor = check ? "00754A" : dash ? "7F7F7F" : "000000";
  const sz = check ? 20 : 18;
  return `<w:p><w:pPr><w:keepNext/><w:spacing w:before="0" w:after="0"/><w:jc w:val="center"/></w:pPr><w:r><w:rPr>${check ? "<w:b/><w:bCs/>" : ""}<w:color w:val="${cor}"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${esc(v)}</w:t></w:r></w:p>`;
}

export function realcarPendencias(xml: string): string {
  return xml.replace(/<w:r(?: [^>]*)?>(?:(?!<\/w:r>)[\s\S])*?<\/w:r>/g, (run) => {
    if (!/\[A CONFIRMAR\]/.test(run) || /<w:highlight /.test(run)) return run;
    if (/<w:rPr>/.test(run)) return run.replace("<w:rPr>", '<w:rPr><w:highlight w:val="yellow"/>');
    return run.replace(/^(<w:r(?: [^>]*)?>)/, '$1<w:rPr><w:highlight w:val="yellow"/></w:rPr>');
  });
}

function oferta(m: ModeloPropostaZbx) {
  const v = m.v2!;
  const nivel = v.nivelTexto ? `${v.nivelTexto.includes(" e ") ? "Níveis" : "Nível"} ${v.nivelTexto}` : "";
  const sup = `Subscrição Oficial Zabbix${nivel ? ` – ${nivel}` : ""}`;
  return {
    titulo: v.temSuporte && v.temAcademy ? "Subscrição Oficial Zabbix e Zabbix Academy" : v.temAcademy ? "Zabbix Academy" : "Subscrição Oficial Zabbix",
    tituloNivel: v.temSuporte && v.temAcademy ? `${sup} e Zabbix Academy` : v.temAcademy ? "Zabbix Academy" : sup,
    nivel,
    curta: v.temSuporte && v.temAcademy ? "Subscricao Zabbix e Academy" : v.temAcademy ? "Zabbix Academy" : `Subscricao Zabbix${v.nivelTexto ? ` ${semAcento(v.nivelTexto)}` : ""}`,
  };
}

/** Nome do arquivo: {Cliente}_OP{salesforce}_{Oferta}_{ddmmaaaa}.docx */
export function nomeArquivoV2(m: ModeloPropostaZbx): string {
  const cli = semAcento(m.cliente || "Cliente").replace(/[^\w]+/g, "_").replace(/^_|_$/g, "");
  const op = m.v2?.salesforce ? `_OP${m.v2.salesforce}` : "";
  return `${cli}${op}_${oferta(m).curta.replace(/ /g, "_")}_${ddmmaaaa(m.dataEmissao).replace(/\//g, "")}.docx`;
}

export function montarDadosTemplateV2(m: ModeloPropostaZbx) {
  const v = m.v2!;
  const o = oferta(m);
  const op = v.salesforce ? `OP-${v.salesforce}` : "";
  const capa = [v.temSuporte && v.nivelTexto ? o.nivel : "", m.cliente, op].filter((x) => x.trim());
  const num = (i: number) => v.numeros[i] ?? { valor: "", rotulo: "" };
  const matriz = (s: SecaoMatriz) => (v.temSuporte ? v.matrizes[s] : []).map((r) => {
    const [a, b, c, d, e] = r.valores.map(celulaMatrizXml);
    return { recurso: r.recurso, c_silver: a, c_gold: b, c_platinum: c, c_enterprise: d, c_global: e };
  });
  const dadosFat = m.dadosFaturamento.map((l) => {
    const i = l.indexOf("|");
    if (i >= 0) return { rotulo: l.slice(0, i).trim(), valor: l.slice(i + 1).trim() };
    const j = l.indexOf(":");
    return j >= 0 ? { rotulo: l.slice(0, j + 1).trim(), valor: l.slice(j + 1).trim() } : { rotulo: "", valor: l.trim() };
  });
  const objetoPadrao = v.temAcademy && !v.temSuporte ? "Proposta de subscrição anual do Zabbix Academy." : `Proposta de subscrição anual de Zabbix${v.nivelTexto ? ` – ${o.nivel}` : ""}.`;
  const objeto = m.objeto && m.objeto !== A_CONFIRMAR ? m.objeto : objetoPadrao;
  const modulos = v.academyModulos.join("\n");
  return {
    titulo_oferta: o.titulo,
    titulo_oferta_nivel: o.tituloNivel,
    linha_capa: capa.join("  ·  "),
    linha_contato: m.contato.trim() ? `A/C ${m.contato.trim()}${m.email.trim() ? ` · ${m.email.trim()}` : ""}` : "",
    data_extenso: `${dataExtenso(m.dataEmissao)}.`,
    consultor: ou(m.consultor), consultor_cargo: ou(v.consultorCargo),
    ...(Object.fromEntries([0, 1, 2, 3, 4].flatMap((i) => [[`num${i + 1}_valor`, ou(num(i).valor)], [`num${i + 1}_rotulo`, ou(num(i).rotulo)]])) as Record<`num${1 | 2 | 3 | 4 | 5}_${"valor" | "rotulo"}`, string>),
    objeto,
    confidencialidade: ou(v.confidencialidade),
    validade_ate: dataExtenso(m.dataValidade),
    vigencia_meses: String(m.vigenciaMeses || 12),
    referente: `${semAcento(m.cliente || "Cliente")}${v.salesforce ? `_OP${v.salesforce}` : ""}_${o.curta} de ${ddmmaaaa(m.dataEmissao)}`,
    cliente_razao: ou(v.clienteRazao),
    tem_tecnica: v.temSuporte || v.temAcademy,
    tem_suporte: v.temSuporte,
    tem_academy: v.temAcademy,
    quebra_academy: v.temSuporte && v.temAcademy,
    diferenciais: v.diferenciais.map((d) => ({ titulo: ou(d.titulo), tem_texto: !!d.texto, texto: d.texto })),
    intro_suporte: v.introSuporte.length ? v.introSuporte : [A_CONFIRMAR],
    observacoes: [m.observacoes, m.textoTributario].flatMap((t) => (t ?? "").split(/\n+/)).map((s) => s.trim()).filter(Boolean),
    pagamentos: v.pagamentos.map((p) => ({ rotulo: p.rotulo, texto: ou(p.texto) })),
    dados_faturamento: dadosFat.length ? dadosFat : [{ rotulo: "", valor: A_CONFIRMAR }],
    itens_aceite: m.itens.map((i) => ({ linha: `${i.quantidade} x ${i.partNumber ?? ""} – ${i.nome ?? i.descricao}` })),
    itens: m.itens.map((i) => ({ sku: i.partNumber ?? "", descricao: i.nome ?? i.descricao, qtd: String(i.quantidade), unitario: brl(i.unitario), total_item: brl(i.total) })),
    total: brl(m.itens.reduce((s, i) => s + i.total, 0)),
    recursos: matriz("recursos"), apoio: matriz("apoio"), servicos: matriz("servicos"), extras: matriz("extras"),
    blocos_academy: v.temAcademy ? m.blocos.filter((b) => ehAcademy(b.partNumber)).map((b) => ({
      titulo: b.titulo,
      subtitulo: b.tagline ? `${b.partNumber} · ${b.tagline}` : b.partNumber,
      campos: [
        ...b.campos.filter((c) => CAMPOS_CONTEUDO.some((k) => k.label === c.label)).map((c) => ({ label: c.label, texto: ou(c.texto) })),
        { label: "Módulos disponíveis", texto: ou(modulos) },
      ],
    })) : [],
  };
}
export type DadosTemplateV2 = ReturnType<typeof montarDadosTemplateV2>;

export function contarPendencias(m: ModeloPropostaZbx): number {
  if (m.layoutVersao !== 2) return (JSON.stringify(m).match(/\[A CONFIRMAR\]/g) ?? []).length;
  return (JSON.stringify(montarDadosTemplateV2(m)).match(/\[A CONFIRMAR\]/g) ?? []).length;
}

/** Puro (Node ou navegador): template em bytes → PizZip renderizado. */
export function renderizarTemplateV2(buf: ArrayBuffer | Uint8Array, m: ModeloPropostaZbx): PizZip {
  const zip = new PizZip(buf);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, nullGetter: () => A_CONFIRMAR });
  try {
    doc.render(montarDadosTemplateV2(m));
  } catch (e) {
    const errs = (e as { properties?: { errors?: { properties?: { explanation?: string } }[] } }).properties?.errors;
    const msg = errs?.map((x) => x.properties?.explanation).filter(Boolean).join("; ") || (e as Error).message;
    throw new Error(`Falha ao montar o Word: ${msg}`);
  }
  const out = doc.getZip();
  out.file("word/document.xml", realcarPendencias(out.file("word/document.xml")!.asText()));
  return out;
}

export async function gerarPropostaZbxDocxV2(m: ModeloPropostaZbx): Promise<Blob> {
  const r = await fetch(import.meta.env.BASE_URL + "templates/proposta-zabbix-template.docx");
  if (!r.ok) throw new Error("Falha ao montar o Word: modelo não encontrado.");
  return renderizarTemplateV2(await r.arrayBuffer(), m).generate({
    type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", compression: "DEFLATE",
  });
}
