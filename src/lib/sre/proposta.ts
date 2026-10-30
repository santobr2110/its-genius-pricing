// Modelo da proposta dos Pacotes Consultivos Zabbix SRE (Fase 5). Puro: o mesmo modelo alimenta a
// pré-visualização em tela, o PDF e o Word. Os valores vêm sempre do resultado congelado da cotação.
// Horas de gestão são custo interno e NUNCA entram no modelo (nem como linha, nem como nota).
import type { SreContent } from "./calc";
import type { CarrinhoSre } from "./carrinho";

export const A_CONFIRMAR = "[A CONFIRMAR]";
const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
export function dataExtenso(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}` : iso;
}

export const CAMPOS_CONTEUDO_SRE: { k: keyof SreContent; label: string }[] = [
  { k: "descricao", label: "Descrição" },
  { k: "escopo_atividades", label: "Escopo de atividades" },
  { k: "perfis_envolvidos", label: "Perfis envolvidos" },
  { k: "entregavel", label: "Entregável" },
  { k: "forma_acionamento", label: "Forma de acionamento" },
  { k: "sla_atendimento", label: "SLA de atendimento" },
  { k: "regra_consumo", label: "Regra de consumo" },
  { k: "validade_horas_texto", label: "Validade das horas" },
  { k: "pre_requisito", label: "Pré-requisitos" },
  { k: "observacoes", label: "Observações" },
  { k: "link_mais_informacoes", label: "Mais informações" },
];

export const FRASE_ESCOPO = "Itens não listados nesta proposta estão fora do escopo.";
export const OBJETO_PADRAO = "Pacote de horas consultivas pré-pagas para Zabbix, executadas pelo time de SRE da Selbetti conforme o escopo de cada pacote descrito a seguir.";

export interface BlocoPacoteSre { titulo: string; partNumber: string; horas: number; tagline: string | null; aConfirmar: boolean; campos: { label: string; texto: string }[] }
/** Linha da tabela de investimento. valorHora = preço ÷ horas de execução. */
export interface ItemInvestimentoSre { partNumber: string; descricao: string; horas: number; quantidade: number; valorHora: number; total: number }

export interface ClienteSre { razao: string; cnpj: string; endereco: string }
export interface ContatoSre { nome: string; cargo: string; email: string }

export interface ModeloPropostaSre {
  cidade: string; dataEmissao: string; dataValidade: string; validadeDias: number;
  cliente: ClienteSre; contato: ContatoSre; consultor: { nome: string; cargo: string };
  numeroProposta: string; codigo: string | null; versao: number | null; salesforce: string | null;
  quemSomos: string; numeros: { valor: string; rotulo: string }[];
  objeto: string; fraseEscopo: string;
  blocos: BlocoPacoteSre[];
  itens: ItemInvestimentoSre[]; total: number;
  condicoes: string[];
  prazoPagamento: string; validadeHoras: string; fraseReforma: string;
  observacoes: string; textoTributario: string; dadosFaturamento: string[];
  aceite: string[];
  /** Ausente/1 = gerador programático; 2 = template .docx (quando o template for entregue). */
  layoutVersao?: 1 | 2;
}

export interface EmissaoSre {
  versao: number; emitidaEm: string; validaAte: string; snapshotVersao: number | null;
  modelo: ModeloPropostaSre; custoTotal: number; rentabilidadePerc: number;
}

const txt = (v: unknown) => (v == null ? "" : String(v)).trim();
const ouPendente = (v: unknown) => txt(v) || A_CONFIRMAR;
const linhas = (v: unknown) => txt(v).split(/\n+/).map((s) => s.trim()).filter(Boolean);
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }).replace(/\u00a0/g, " ");
const fmtH = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

export function somarDias(iso: string, dias: number): string {
  return new Date(new Date(iso + "T12:00:00").getTime() + dias * 86400000).toISOString().slice(0, 10);
}

export function montarModeloPropostaSre(a: {
  res: CarrinhoSre; contents: SreContent[]; params: { key: string; value: unknown }[];
  cliente: ClienteSre; contato: ContatoSre; consultor: { nome: string; cargo: string };
  numeroProposta?: string; codigo: string | null; versao: number | null; salesforce?: string | null;
  hojeISO: string; cidade?: string; dataISO?: string; validadeISO?: string; validadeDias: number;
  prazoPagamento?: string; observacoesExtra?: string; fraseReforma?: string;
}): ModeloPropostaSre {
  const p = new Map(a.params.map((x) => [x.key, x.value]));
  const ok = a.res.linhas.filter((l) => l.erros.length === 0);
  const vistos = new Set<string>();
  const blocos: BlocoPacoteSre[] = [];
  for (const l of ok) {
    const e = l.entrada;
    if (vistos.has(e.pacoteId)) continue;
    vistos.add(e.pacoteId);
    const c = a.contents.find((x) => x.pacote_id === e.pacoteId);
    blocos.push({
      titulo: e.nome, partNumber: e.partNumber, horas: e.horasExecucao, tagline: txt(c?.tagline) || null, aConfirmar: c ? c.a_confirmar : true,
      campos: CAMPOS_CONTEUDO_SRE.map(({ k, label }) => ({ label, texto: ouPendente(c?.[k]) })),
    });
  }
  const data = a.dataISO || a.hojeISO;
  const validade = a.validadeISO || somarDias(data, a.validadeDias);
  const meses = Number(p.get("validade_horas_meses"));
  const validadeHoras = Number.isFinite(meses) && meses > 0 ? `${meses} meses a partir da contratação` : A_CONFIRMAR;
  const prazo = txt(a.prazoPagamento) || ouPendente(p.get("proposta_prazo_pagamento"));
  const reforma = txt(a.fraseReforma);
  const itens = ok.map((l) => ({
    partNumber: l.entrada.partNumber, descricao: l.entrada.nome, horas: l.entrada.horasExecucao, quantidade: l.entrada.quantidade,
    valorHora: l.valorHoraExecucao, total: l.precoFinal,
  }));
  const par = (s: string) => { const i = s.indexOf("|"); return i < 0 ? { valor: s.trim(), rotulo: "" } : { valor: s.slice(0, i).trim(), rotulo: s.slice(i + 1).trim() }; };
  const nums = linhas(p.get("proposta_numeros")).map(par);
  return {
    cidade: txt(a.cidade) || txt(p.get("proposta_cidade")) || "Joinville",
    dataEmissao: data, dataValidade: validade, validadeDias: a.validadeDias,
    cliente: { razao: a.cliente.razao.trim().toLocaleUpperCase("pt-BR"), cnpj: a.cliente.cnpj.trim(), endereco: a.cliente.endereco.trim() },
    contato: { nome: a.contato.nome.trim(), cargo: a.contato.cargo.trim(), email: a.contato.email.trim() },
    consultor: { nome: a.consultor.nome.trim(), cargo: a.consultor.cargo.trim() },
    numeroProposta: txt(a.numeroProposta) || a.codigo || "", codigo: a.codigo, versao: a.versao, salesforce: txt(a.salesforce) || null,
    quemSomos: ouPendente(p.get("proposta_quem_somos")),
    numeros: nums.length ? nums : [{ valor: A_CONFIRMAR, rotulo: "" }],
    objeto: txt(p.get("proposta_objeto")) || OBJETO_PADRAO,
    fraseEscopo: FRASE_ESCOPO,
    blocos, itens, total: a.res.precoFinalTotal,
    prazoPagamento: prazo, validadeHoras, fraseReforma: reforma,
    condicoes: [
      `Validade da proposta: ${a.validadeDias} dias (até ${dataExtenso(validade)}).`,
      `Prazo de pagamento: ${prazo}`,
      "Impostos: inclusos.",
      `Validade das horas contratadas: ${validadeHoras}.`,
      "Faturamento sujeito à aprovação de crédito.",
      ...(reforma ? [reforma] : []),
    ],
    observacoes: [txt(a.observacoesExtra), txt(p.get("proposta_observacoes"))].filter(Boolean).join("\n\n"),
    textoTributario: ouPendente(p.get("proposta_texto_tributario")),
    dadosFaturamento: linhas(p.get("proposta_dados_faturamento")).length ? linhas(p.get("proposta_dados_faturamento")) : [A_CONFIRMAR],
    aceite: itens.map((i) => `${i.quantidade} × ${i.partNumber} – ${i.descricao} (${fmtH(i.horas)} h) – ${brl(i.total)}`),
    layoutVersao: 1,
  };
}

/** Nome do arquivo: {Cliente}_OP{salesforce}_ConsultivoSRE_{ddmmaaaa}.docx */
export function nomeArquivoSre(m: ModeloPropostaSre, ext = "docx"): string {
  const semAcento = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const cli = semAcento(m.cliente.razao || "Cliente").replace(/[^\w]+/g, "_").replace(/^_|_$/g, "") || "Cliente";
  const [y, mo, d] = m.dataEmissao.slice(0, 10).split("-");
  return `${cli}${m.salesforce ? `_OP${m.salesforce}` : ""}_ConsultivoSRE_${d}${mo}${y}.${ext}`;
}

export function contarPendenciasSre(m: ModeloPropostaSre): number {
  return (JSON.stringify(m).match(/\[A CONFIRMAR\]/g) ?? []).length;
}
