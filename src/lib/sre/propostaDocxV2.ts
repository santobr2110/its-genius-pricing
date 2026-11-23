// Word da proposta SRE no layout 2: preenche public/templates/proposta-sre-template.docx, derivado do
// mesmo documento-base Selbetti da subscrição Zabbix (mudanças visuais só no .docx, nunca no código).
// Consome o mesmo ModeloPropostaSre do preview/PDF; horas de gestão nunca entram.
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { A_CONFIRMAR, dataExtenso, type ModeloPropostaSre } from "./proposta";
import { realcarPendencias } from "@/lib/zabbix/propostaDocxV2";
import { textoDemonstrativo } from "@/lib/pricing/demonstrativoCliente";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }).replace(/\u00a0/g, " ");
const fmtH = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const ou = (v: string | null | undefined) => (v ?? "").trim() || A_CONFIRMAR;
const semAcento = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const ddmmaaaa = (iso: string) => { const [y, m, d] = iso.slice(0, 10).split("-"); return `${d}/${m}/${y}`; };
const TITULO = "Pacotes Consultivos Zabbix SRE";

export function montarDadosTemplateSre(m: ModeloPropostaSre) {
  const op = m.salesforce ? `OP-${m.salesforce}` : "";
  const num = (i: number) => m.numeros[i] ?? { valor: "", rotulo: "" };
  const dadosFat = m.dadosFaturamento.map((l) => {
    const i = l.indexOf("|");
    if (i >= 0) return { rotulo: l.slice(0, i).trim(), valor: l.slice(i + 1).trim() };
    const j = l.indexOf(":");
    return j >= 0 ? { rotulo: l.slice(0, j + 1).trim(), valor: l.slice(j + 1).trim() } : { rotulo: "", valor: l.trim() };
  });
  const dif = m.diferenciais ?? [];
  return {
    titulo_oferta: TITULO,
    titulo_oferta_nivel: TITULO,
    linha_capa: [m.cliente.razao, op].filter((x) => x.trim()).join("  ·  "),
    linha_contato: m.contato.nome ? `A/C ${m.contato.nome}${m.contato.email ? ` · ${m.contato.email}` : ""}` : "",
    data_extenso: `${m.cidade}, ${dataExtenso(m.dataEmissao)}.`,
    consultor: ou(m.consultor.nome), consultor_cargo: ou(m.consultor.cargo),
    ...(Object.fromEntries([0, 1, 2, 3, 4].flatMap((i) => [[`num${i + 1}_valor`, num(i).valor], [`num${i + 1}_rotulo`, num(i).rotulo]])) as Record<string, string>),
    objeto: `${m.objeto}\n${m.fraseEscopo}`,
    diferenciais: (dif.length ? dif : m.quemSomos.split(/\n+/).filter(Boolean).map((t) => ({ titulo: t, texto: "" })))
      .map((d) => ({ titulo: ou(d.titulo), tem_texto: !!d.texto, texto: d.texto })),
    confidencialidade: ou(m.confidencialidade),
    tem_tecnica: m.blocos.length > 0, tem_suporte: false, tem_academy: m.blocos.length > 0, quebra_academy: false,
    intro_suporte: [], recursos: [], apoio: [], servicos: [], extras: [],
    blocos_academy: m.blocos.map((b) => ({
      titulo: b.titulo,
      subtitulo: [b.partNumber, `${fmtH(b.horas)} h`, b.tagline].filter(Boolean).join(" · "),
      campos: b.campos.map((c) => ({ label: c.label, texto: ou(c.texto) })),
    })),
    itens: m.itens.map((i) => ({ sku: i.partNumber, descricao: `${i.descricao} (${fmtH(i.horas)} h · ${brl(i.valorHora)}/h)`, qtd: String(i.quantidade), unitario: brl(i.total / Math.max(1, i.quantidade)), total_item: brl(i.total) })),
    total: brl(m.total),
    demonstrativos_cliente: m.demonstrativo ? [{ titulo: "Composição do preço ao cliente — Total", texto: textoDemonstrativo(m.demonstrativo) }] : [],
    validade_ate: dataExtenso(m.dataValidade),
    pagamentos: [{ rotulo: "Prazo de pagamento:", texto: ou(m.prazoPagamento) }, ...(m.fraseReforma ? [{ rotulo: "", texto: m.fraseReforma }] : [])],
    validade_horas: ou(m.validadeHoras),
    observacoes: [m.observacoes, m.textoTributario, "Faturamento sujeito à aprovação de crédito."].flatMap((t) => (t ?? "").split(/\n+/)).map((s) => s.trim()).filter(Boolean),
    dados_faturamento: dadosFat.length ? dadosFat : [{ rotulo: "", valor: A_CONFIRMAR }],
    referente: `${semAcento(m.cliente.razao || "Cliente")}${m.salesforce ? `_OP${m.salesforce}` : ""}_Consultivo SRE de ${ddmmaaaa(m.dataEmissao)}`,
    itens_aceite: m.aceite.map((linha) => ({ linha })),
    cliente_razao: ou(m.cliente.razao),
  };
}

export function renderizarTemplateSre(buf: ArrayBuffer | Uint8Array, m: ModeloPropostaSre): PizZip {
  const doc = new Docxtemplater(new PizZip(buf), { paragraphLoop: true, linebreaks: true, nullGetter: () => A_CONFIRMAR });
  try { doc.render(montarDadosTemplateSre(m)); } catch (e) {
    const errs = (e as { properties?: { errors?: { properties?: { explanation?: string } }[] } }).properties?.errors;
    throw new Error(`Falha ao montar o Word: ${errs?.map((x) => x.properties?.explanation).filter(Boolean).join("; ") || (e as Error).message}`);
  }
  const out = doc.getZip();
  out.file("word/document.xml", realcarPendencias(out.file("word/document.xml")!.asText()));
  return out;
}

export async function gerarPropostaSreDocxV2(m: ModeloPropostaSre): Promise<Blob> {
  const r = await fetch(import.meta.env.BASE_URL + "templates/proposta-sre-template.docx");
  if (!r.ok) throw new Error("Falha ao montar o Word: modelo não encontrado.");
  return renderizarTemplateSre(await r.arrayBuffer(), m).generate({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", compression: "DEFLATE" });
}
