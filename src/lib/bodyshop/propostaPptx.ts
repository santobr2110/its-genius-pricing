import PizZip from "pizzip";
import { computeCarrinhoBS, entradasDoSnapshot, globaisDoSnapshot, type SnapshotBS, type FormatoBS } from "./carrinho";
import type { BodyshopContent } from "./calc";
import { A_CONFIRMAR, clonarLinhaTabela, clonarSlide, listarSlides, reordenarSlides, salvar, substituirTokens, textoSlides, tokensPendentes } from "./pptxTemplate";

export const TEMPLATE_PPTX_BS = "/templates/proposta-bodyshop-template.pptx";

/**
 * Capacidades medidas no template proposta-bodyshop-template.pptx (10 × 5,625 in).
 * Se o template mudar, estes números mudam. Unidade: caracteres estimados por caixa.
 */
export const CAPACIDADE = {
  escopoCol1: { itens: 5, chars: 520 },
  escopoCol2: { itens: 5, chars: 520 },
  requisitos: { itens: 11, chars: 1000 },
  observacoes: { itens: 6, chars: 700 },
} as const;

export interface BlocoPerfilPptx {
  titulo: string; intro: string; formato: string;
  escopoCol1: string[]; escopoCol2: string[];
  ressalva: string; requisitos: string[];
  modalidade: string; local: string; horario: string;
}
export interface ModeloPropostaPptx {
  layoutVersao: "pptx-v1";
  rotulos: Record<string, string>;
  institucional: { titulo: string; texto: string[]; numeros: { valor: string; rotulo: string }[]; destaque: { prefixo: string; valor: string; rotulo: string }; chamada: string; ciclo: string; ciclo2: string; fechamento: string };
  dataEmissao: string; dataExtenso: string; dataCurta: string;
  cliente: string; salesforce: string; especialista: string; especialistaCargo: string;
  amNome: string; amEmail: string;
  ofertaSubtitulo: string; objetivo: string;
  perfis: BlocoPerfilPptx[];
  slideLocalUnico: BlocoPerfilPptx | null;
  itens: { descricao: string; valorMensal: number }[];
  totalMensal: number; totalContrato: number; duracaoMeses: number;
  observacoesComerciais: string[];
  textoCobertura: string; textoRegimeObrigacao: string;
  avisos: string[];
}

const txt = (v: unknown) => (v == null ? "" : String(v)).trim();
const ouPendente = (v: unknown) => txt(v) || A_CONFIRMAR;
const linhas = (v: unknown) => txt(v).split(/\n+/).map(s => s.replace(/^\s*[•\-–]\s*/, "").trim()).filter(Boolean);
export function juntarE(xs: string[]): string { return xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} e ${xs[xs.length - 1]}`; }
const par = (l: string) => { const [a, ...b] = l.split("|"); return [txt(a), txt(b.join("|"))]; };
const semAcento = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
export const moeda = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const NUMERAIS = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove", "vinte"];
/** 1 a 20 por extenso; acima disso, só o número. */
export function numeralPalavras(n: number): string | null { return Number.isInteger(n) && n >= 1 && n <= 20 ? NUMERAIS[n] : null; }
const comExtenso = (n: number) => { const p = numeralPalavras(n); return p ? `${n} (${p})` : String(n); };
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
export function dataPorExtenso(iso: string) { const [y, m, d] = iso.split("-").map(Number); return `${d} de ${MESES[m - 1]} de ${y}`; }
const FORMATO: Record<FormatoBS, string> = { presencial: "Presencial", remoto: "Remoto", hibrido: "Híbrido" };

/** Divide pelo volume de caracteres acumulado, não pela contagem de itens. */
export function dividirColunas(itens: string[]): [string[], string[]] {
  const total = itens.reduce((s, i) => s + i.length, 0);
  let acc = 0, corte = itens.length;
  for (let i = 0; i < itens.length; i++) {
    const antes = acc; acc += itens[i].length;
    if (acc >= total / 2) { corte = Math.abs(total / 2 - antes) < Math.abs(acc - total / 2) ? i : i + 1; break; }
  }
  return [itens.slice(0, corte), itens.slice(corte)];
}

export function horaExtra(precoMensalUnitario: number, horas: number, fator: number | null): number | null {
  if (fator == null || !Number.isFinite(fator) || fator <= 0 || horas <= 0) return null;
  return Math.round(precoMensalUnitario / horas * fator * 100) / 100;
}

const cabe = (itens: string[], cap: { itens: number; chars: number }) => itens.length <= cap.itens + 1 && itens.reduce((s, i) => s + Math.max(i.length, 60), 0) <= cap.chars;

export function montarModeloPropostaPptx(a: {
  snapshot: SnapshotBS; contents: BodyshopContent[]; params: { key: string; value: unknown }[];
  cliente: string; salesforce: string; especialista: string; amNome: string; amEmail: string; hojeISO: string; reformaTributaria?: string;
}): ModeloPropostaPptx {
  const p = new Map(a.params.map(r => [r.key, r.value]));
  const g = (k: string) => ouPendente(p.get(k));
  const res = computeCarrinhoBS(entradasDoSnapshot(a.snapshot), globaisDoSnapshot(a.snapshot), a.snapshot.tiers);
  if (!res.linhas.length || res.temErros) throw new Error("Snapshot inválido para emissão.");
  const modalidade = txt(p.get("proposta_modalidade_padrao"));
  const fmtPadrao = txt(p.get("proposta_formato_padrao"));
  const horPadrao = txt(p.get("proposta_horario_padrao"));
  const dados = res.linhas.map(l => {
    const e = l.entrada;
    return { l, e, formato: e.formato ? FORMATO[e.formato] : fmtPadrao, local: txt(e.local), horario: txt(e.horario) || horPadrao };
  });
  // Consolidação: mesmo cargo/senioridade + mesmo formato, local e horário = um bloco.
  const grupos: (typeof dados)[] = [];
  for (const d of dados) {
    const gr = grupos.find(x => x[0].e.cargoId === d.e.cargoId && x[0].e.senioridade === d.e.senioridade && x[0].formato === d.formato && x[0].local === d.local && x[0].horario === d.horario);
    if (gr) gr.push(d); else grupos.push([d]);
  }
  const avisos: string[] = [];
  const perfis: BlocoPerfilPptx[] = grupos.map(gr => {
    const { e, formato, local, horario } = gr[0];
    const qtd = gr.reduce((s, d) => s + d.e.quantidade, 0);
    const c = a.contents.find(x => x.cargo_id === e.cargoId);
    const nome = `${e.cargo} ${e.senioridade}`.trim();
    // Escopo de atuação tem preferência; sem ele, usa as Atividades do cargo (vindas da planilha).
    const escopoProprio = linhas(c?.escopo_atuacao);
    const escopo = escopoProprio.length ? escopoProprio : linhas(c?.atividades);
    const [col1, col2] = dividirColunas(escopo);
    const certs = linhas(c?.certificacoes?.replace(/;\s*/g, "\n"));
    const requisitos = [...linhas(c?.competencias), ...(txt(c?.formacao) ? [`Formação: ${linhas(c?.formacao).join("; ")}`] : []), ...(certs.length ? [`Certificações: ${certs.join("; ")}`] : [])];
    const ded = modalidade ? (qtd > 1 ? `${modalidade.toLowerCase()}s` : modalidade.toLowerCase()) : "";
    if (!cabe(col1, CAPACIDADE.escopoCol1) || !cabe(col2, CAPACIDADE.escopoCol2)) avisos.push(`O escopo do perfil ${nome} não cabe no slide; reduza os itens em Configurações › Conteúdo ou divida o perfil em dois blocos.`);
    if (semAcento(`${nome} ${modalidade}`).length > 48) avisos.push(`O título do perfil ${nome} pode ocupar duas linhas no slide de escopo; confira o arquivo antes de enviar.`);
    if (!cabe(requisitos, CAPACIDADE.requisitos)) avisos.push(`Os requisitos do perfil ${nome} não cabem no slide; reduza os itens em Configurações › Conteúdo.`);
    return {
      titulo: semAcento(`${nome} ${modalidade}`.trim()).toUpperCase(),
      intro: `A Selbetti está considerando ${qtd} ${nome}.`,
      formato: ouPendente(formato), escopoCol1: col1.length ? col1 : [A_CONFIRMAR], escopoCol2: col2,
      ressalva: txt(c?.observacoes) || g("proposta_ressalva_pecas"), requisitos: requisitos.length ? requisitos : [A_CONFIRMAR],
      modalidade: ouPendente(`${e.cargo}${modalidade ? ` ${modalidade}` : ""}`), local: ouPendente(local), horario: ouPendente(horario),
    };
  });
  const unico = dados.every(d => d.formato === dados[0].formato && d.local === dados[0].local && d.horario === dados[0].horario);
  const slideLocalUnico = unico ? { ...perfis[0], modalidade: perfis.length === 1 ? perfis[0].modalidade : ouPendente(`${txt(p.get("proposta_oferta_subtitulo"))}${modalidade ? ` ${modalidade}` : ""}`) } : null;

  const enumeracao = juntarE(grupos.map(gr => { const q = gr.reduce((s, d) => s + d.e.quantidade, 0); return `${comExtenso(q)} ${gr[0].e.cargo} ${gr[0].e.senioridade}`.trim(); }));
  const objModelo = txt(p.get("proposta_objetivo_modelo"));
  const fator = p.get("fator_hora_extra") == null || txt(p.get("fator_hora_extra")) === "" ? null : Number(p.get("fator_hora_extra"));
  const prazo = Number(p.get("prazo_disponibilizacao_dias"));
  const obs: string[] = [];
  for (const d of dados) {
    const he = horaExtra(d.l.precoFinal / d.e.quantidade, d.e.horasLinha, fator);
    if (he != null) obs.push(`Valor da hora extra do ${d.e.cargo} ${d.e.senioridade}: ${moeda(he)}/hora;`);
  }
  obs.push(g("proposta_despesas_impostos"));
  obs.push(`Estamos considerando um contrato de ${a.snapshot.duracaoMeses} meses;`);
  obs.push(`O reajuste anual será baseado pelo ${g("reajuste_indice")};`);
  obs.push(Number.isFinite(prazo) && prazo > 0
    ? `O prazo para disponibilização do profissional é de até ${comExtenso(prazo)} dias, contados a partir da formalização da contratação e/ou autorização para início da operação.`
    : `O prazo para disponibilização do profissional é de até ${A_CONFIRMAR} dias, contados a partir da formalização da contratação e/ou autorização para início da operação.`);
  if (a.reformaTributaria) obs.push(a.reformaTributaria);
  if (!cabe(obs, CAPACIDADE.observacoes)) avisos.push("As observações comerciais não cabem no slide de investimento; revise os textos em Configurações › Parâmetros.");

  const nums = linhas(p.get("proposta_inst_numeros")).map(l => { const [valor, rotulo] = par(l); return { valor: ouPendente(valor), rotulo: ouPendente(rotulo) }; });
  while (nums.length < 3) nums.push({ valor: A_CONFIRMAR, rotulo: A_CONFIRMAR });
  const [dp, dv, dr] = txt(p.get("proposta_inst_destaque")).split("|").map(txt);
  const rot = (k: string) => g(`proposta_${k}`);
  const rotulos: Record<string, string> = Object.fromEntries(["capa_titulo", "capa_subtitulo", "capa_rotulo_cliente", "capa_rotulo_por", "rotulo_objetivo", "rotulo_escopo", "rotulo_formato", "rotulo_perfil", "rotulo_localidades", "rotulo_alocado_em", "rotulo_horario", "rotulo_comercial", "rotulo_investimento", "rotulo_col_desc", "rotulo_col_valor", "rotulo_observacoes"].map(k => [k, rot(k)]));
  const itens = dados.map(d => ({ descricao: semAcento(`${d.e.quantidade} ${d.e.cargo} ${d.e.senioridade} ${modalidade}`.trim()).toUpperCase(), valorMensal: d.l.precoFinal }));
  return {
    layoutVersao: "pptx-v1", rotulos,
    institucional: { titulo: g("proposta_inst_titulo"), texto: linhas(p.get("proposta_inst_texto")).length ? linhas(p.get("proposta_inst_texto")) : [A_CONFIRMAR], numeros: nums.slice(0, 3), destaque: { prefixo: dp ?? "", valor: ouPendente(dv), rotulo: ouPendente(dr) }, chamada: g("proposta_inst_chamada"), ciclo: g("proposta_inst_ciclo"), ciclo2: g("proposta_inst_ciclo2"), fechamento: g("proposta_fechamento_chamada") },
    dataEmissao: a.hojeISO, dataExtenso: dataPorExtenso(a.hojeISO), dataCurta: a.hojeISO.split("-").reverse().join("/"),
    cliente: ouPendente(a.cliente), salesforce: txt(a.salesforce), especialista: ouPendente(a.especialista), especialistaCargo: g("proposta_consultor_cargo"),
    amNome: ouPendente(a.amNome), amEmail: ouPendente(a.amEmail),
    ofertaSubtitulo: g("proposta_oferta_subtitulo"), objetivo: objModelo ? objModelo.replace("{perfis}", enumeracao) : A_CONFIRMAR,
    perfis, slideLocalUnico, itens, totalMensal: res.precoFinalTotalMensal, totalContrato: res.precoFinalTotalContrato, duracaoMeses: a.snapshot.duracaoMeses,
    observacoesComerciais: obs, textoCobertura: g("proposta_texto_cobertura"), textoRegimeObrigacao: g("proposta_regime_obrigacao"), avisos,
  };
}

export const contarPendenciasPptx = (m: ModeloPropostaPptx) => (JSON.stringify({ ...m, avisos: [] }).match(/\[A CONFIRMAR\]/g) ?? []).length;

/** Termos do deck de referência que nunca podem aparecer numa proposta gerada. */
export const TERMOS_DECK_REFERENCIA = ["Toyota", "Material Handling", "Mercosur", "São José dos Pinhais", "Andressa", "Nogueira", "Fabio", "Caio Andre", "13.369,46", "134,95", "FIELD SERVICE N1 DEDICADO"];
export function vazamentos(texto: string, cliente = ""): string[] {
  const permitido = cliente.toLowerCase();
  return TERMOS_DECK_REFERENCIA.filter(t => texto.toLowerCase().includes(t.toLowerCase()) && !permitido.includes(t.toLowerCase()));
}

const lista = (xs: string[]) => xs.join("\n");
function mapaGlobal(m: ModeloPropostaPptx): Record<string, string> {
  const r = m.rotulos, i = m.institucional;
  return {
    CAPA_TITULO: r.capa_titulo, CAPA_SUBTITULO: r.capa_subtitulo, CAPA_ROTULO_CLIENTE: r.capa_rotulo_cliente, CAPA_ROTULO_POR: r.capa_rotulo_por,
    DATA_EXTENSO: m.dataExtenso, CLIENTE: m.cliente, ESPECIALISTA: m.especialista, ESPECIALISTA_CARGO: m.especialistaCargo,
    INST_TITULO: i.titulo, INST_TEXTO: lista(i.texto), INST_NUM1: i.numeros[0].valor, INST_NUM2: i.numeros[1].valor, INST_NUM3: i.numeros[2].valor,
    INST_ROT1: i.numeros[0].rotulo, INST_ROT2: i.numeros[1].rotulo, INST_ROT3: i.numeros[2].rotulo,
    INST_NUM4: i.destaque.valor, INST_ROT4: i.destaque.rotulo, INST_PREFIXO4: i.destaque.prefixo || " ",
    INST_CHAMADA: i.chamada, INST_CICLO: i.ciclo, INST_CICLO2: i.ciclo2,
    ROTULO_OBJETIVO: r.rotulo_objetivo, OBJETIVO: m.objetivo, ROTULO_ESCOPO: r.rotulo_escopo, OFERTA_SUBTITULO: m.ofertaSubtitulo,
    ROTULO_FORMATO: r.rotulo_formato, ROTULO_PERFIL: r.rotulo_perfil, ROTULO_LOCALIDADES: r.rotulo_localidades, ROTULO_ALOCADO_EM: r.rotulo_alocado_em, ROTULO_HORARIO: r.rotulo_horario,
    TEXTO_COBERTURA: m.textoCobertura, TEXTO_REGIME_OBRIGACAO: m.textoRegimeObrigacao,
    DATA_CURTA: m.dataCurta, ROTULO_COMERCIAL: r.rotulo_comercial, ROTULO_INVESTIMENTO: r.rotulo_investimento, ROTULO_COL_DESC: r.rotulo_col_desc, ROTULO_COL_VALOR: r.rotulo_col_valor,
    ROTULO_OBSERVACOES: r.rotulo_observacoes, OBSERVACOES_COMERCIAIS: lista(m.observacoesComerciais),
    FECHAMENTO_CHAMADA: i.fechamento, AM_NOME: m.amNome, AM_EMAIL: m.amEmail,
  };
}
const mapaPerfil = (b: BlocoPerfilPptx): Record<string, string> => ({
  PERFIL_TITULO: b.titulo, PERFIL_INTRO: b.intro, PERFIL_FORMATO: b.formato,
  PERFIL_ESCOPO_COL1: lista(b.escopoCol1), PERFIL_ESCOPO_COL2: b.escopoCol2.length ? lista(b.escopoCol2) : " ",
  PERFIL_RESSALVA: b.ressalva, PERFIL_REQUISITOS: lista(b.requisitos),
  PERFIL_MODALIDADE: b.modalidade, PERFIL_LOCAL: b.local, PERFIL_HORARIO: b.horario,
});

/** Preenche o template (arquivos slide1..12) a partir do modelo congelado. */
export function preencherPptx(zip: PizZip, m: ModeloPropostaPptx): PizZip {
  const base = listarSlides(zip).map(s => s.arquivo);
  if (base.length !== 12) throw new Error("O modelo PowerPoint do BodyShop deve ter 12 slides.");
  const [s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12] = base;
  const global = mapaGlobal(m);
  const ordem = [s1, s2, s3, s4, s5, s6];
  const porSlide: [number, Record<string, string>][] = [];
  m.perfis.forEach((b, i) => {
    const a7 = i === 0 ? s7 : clonarSlide(zip, s7), a8 = i === 0 ? s8 : clonarSlide(zip, s8);
    ordem.push(a7, a8); porSlide.push([a7, mapaPerfil(b)], [a8, mapaPerfil(b)]);
    if (!m.slideLocalUnico) { const a9 = i === 0 ? s9 : clonarSlide(zip, s9); ordem.push(a9); porSlide.push([a9, mapaPerfil(b)]); }
  });
  if (m.slideLocalUnico) { ordem.push(s9); porSlide.push([s9, mapaPerfil(m.slideLocalUnico)]); }
  ordem.push(s10, s11, s12);
  const linhasTabela = m.itens.map(i => ({ ITEM_DESCRICAO: i.descricao, ITEM_VALOR: moeda(i.valorMensal) }));
  if (m.itens.length > 1) linhasTabela.push({ ITEM_DESCRICAO: "TOTAL MENSAL", ITEM_VALOR: moeda(m.totalMensal) });
  clonarLinhaTabela(zip, s11, "{{ITEM_DESCRICAO}}", linhasTabela, true);
  reordenarSlides(zip, ordem);
  for (const [a, mp] of porSlide) substituirTokens(zip, a, { ...global, ...mp });
  for (const a of [s1, s2, s3, s4, s5, s6, s10, s11, s12]) substituirTokens(zip, a, global);
  const sobra = tokensPendentes(zip);
  if (sobra.length) throw new Error(`Marcadores não substituídos no PowerPoint: ${sobra.join(", ")}`);
  const vaz = vazamentos(textoSlides(zip), m.cliente);
  if (vaz.length) throw new Error(`Geração abortada: textos do exemplo de referência apareceram na proposta (${vaz.join(", ")}).`);
  return zip;
}

export async function gerarPropostaBsPptx(m: ModeloPropostaPptx, template?: ArrayBuffer): Promise<Blob> {
  const buf = template ?? await (async () => { const r = await fetch(TEMPLATE_PPTX_BS); if (!r.ok) throw new Error("Modelo PowerPoint do BodyShop indisponível."); return r.arrayBuffer(); })();
  return salvar(preencherPptx(new PizZip(buf), m));
}

export function nomeArquivoPptx(m: ModeloPropostaPptx) {
  const limpar = (s: string) => s.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_");
  return `${limpar(m.cliente)}_OP${limpar(m.salesforce || "sem-op")}_BodyShop_${m.dataEmissao.split("-").reverse().join("")}.pptx`;
}
