// Modelo da proposta das Subscrições Zabbix (Fase 4). Puro: o mesmo modelo alimenta a
// pré-visualização em tela, o PDF e o Word. Os valores vêm sempre do snapshot congelado da cotação.
import type { ZabbixContent } from "./calc";
import type { CarrinhoZbx } from "./carrinho";

export const A_CONFIRMAR = "[A CONFIRMAR]";
const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
export function dataExtenso(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}` : iso;
}

export const CAMPOS_CONTEUDO: { k: keyof ZabbixContent; label: string }[] = [
  { k: "descricao", label: "Descrição" },
  { k: "escopo_atendimento", label: "Escopo de atendimento" },
  { k: "sla", label: "SLA" },
  { k: "canais_atendimento", label: "Canais de atendimento" },
  { k: "idioma", label: "Idioma" },
  { k: "abrangencia", label: "Abrangência" },
  { k: "entregavel", label: "Entregáveis" },
  { k: "pre_requisito", label: "Pré-requisitos" },
];

export interface BlocoSubscricao { titulo: string; partNumber: string; tagline: string | null; aConfirmar: boolean; campos: { label: string; texto: string }[] }
export interface ItemPreco { descricao: string; quantidade: number; unitario: number; total: number; listaUnitarioBrl: number | null }

export interface ModeloPropostaZbx {
  cidade: string; dataEmissao: string; dataValidade: string; validadeDias: number;
  cliente: string; contato: string; email: string; consultor: string; codigo: string | null; versao: number | null;
  quemSomos: string; numeros: string[]; objeto: string;
  blocos: BlocoSubscricao[];
  itens: ItemPreco[]; total: number; exibirLista: boolean;
  vigenciaMeses: number; prazoPagamento: string;
  observacoes: string; textoTributario: string; dadosFaturamento: string[];
}

export interface EmissaoZBX {
  versao: number; emitidaEm: string; validaAte: string; snapshotVersao: number | null;
  modelo: ModeloPropostaZbx; custoTotal: number; rentabilidadePerc: number;
}

const txt = (v: unknown) => (v == null ? "" : String(v)).trim();
const ouPendente = (v: unknown) => txt(v) || A_CONFIRMAR;
const linhas = (v: unknown) => txt(v).split(/\n+/).map((s) => s.trim()).filter(Boolean);

export function montarModeloProposta(a: {
  res: CarrinhoZbx; contents: ZabbixContent[]; params: { key: string; value: unknown }[];
  cliente: string; contato: string; email: string; consultor: string; codigo: string | null; versao: number | null;
  hojeISO: string; validadeDias: number; prazoPagamento?: string; observacoesExtra?: string;
}): ModeloPropostaZbx {
  const p = new Map(a.params.map((x) => [x.key, x.value]));
  const ok = a.res.linhas.filter((l) => l.erros.length === 0);
  const vistos = new Set<string>();
  const blocos: BlocoSubscricao[] = [];
  for (const l of ok) {
    const e = l.entrada;
    if (vistos.has(e.subscriptionId)) continue;
    vistos.add(e.subscriptionId);
    const c = a.contents.find((x) => x.subscription_id === e.subscriptionId);
    blocos.push({
      titulo: e.nome, partNumber: e.partNumber, tagline: txt(c?.tagline) || null, aConfirmar: c ? c.a_confirmar : true,
      campos: CAMPOS_CONTEUDO.map(({ k, label }) => ({ label, texto: ouPendente(c?.[k]) })),
    });
  }
  const validade = new Date(new Date(a.hojeISO + "T12:00:00").getTime() + a.validadeDias * 86400000).toISOString().slice(0, 10);
  const obs = [txt(a.observacoesExtra), txt(p.get("proposta_observacoes"))].filter(Boolean).join("\n\n");
  return {
    cidade: txt(p.get("proposta_cidade")) || "Joinville",
    dataEmissao: a.hojeISO, dataValidade: validade, validadeDias: a.validadeDias,
    cliente: a.cliente, contato: a.contato, email: a.email, consultor: a.consultor, codigo: a.codigo, versao: a.versao,
    quemSomos: ouPendente(p.get("proposta_quem_somos")),
    numeros: linhas(p.get("proposta_numeros")).length ? linhas(p.get("proposta_numeros")) : [A_CONFIRMAR],
    objeto: ouPendente(p.get("proposta_objeto")),
    blocos,
    itens: ok.map((l) => ({
      descricao: `${l.entrada.partNumber} — ${l.entrada.nome}`, quantidade: l.entrada.quantidade,
      unitario: l.precoFinal / Math.max(1, l.entrada.quantidade), total: l.precoFinal,
      listaUnitarioBrl: l.entrada.listaUsd != null || l.entrada.listaBrl != null ? l.listaUnitariaBrl : null,
    })),
    total: a.res.precoFinalTotal,
    exibirLista: p.get("exibir_lista_na_proposta") === true,
    vigenciaMeses: Number(p.get("proposta_vigencia_meses")) || 12,
    prazoPagamento: txt(a.prazoPagamento) || ouPendente(p.get("proposta_prazo_pagamento")),
    observacoes: obs,
    textoTributario: ouPendente(p.get("proposta_texto_tributario")),
    dadosFaturamento: linhas(p.get("proposta_dados_faturamento")).length ? linhas(p.get("proposta_dados_faturamento")) : [A_CONFIRMAR],
  };
}
