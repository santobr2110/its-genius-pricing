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
export interface ItemPreco { partNumber?: string; nome?: string; descricao: string; quantidade: number; unitario: number; total: number; listaUnitarioBrl: number | null }

export interface ModeloPropostaZbx {
  cidade: string; dataEmissao: string; dataValidade: string; validadeDias: number;
  cliente: string; contato: string; email: string; consultor: string; codigo: string | null; versao: number | null;
  quemSomos: string; numeros: string[]; objeto: string;
  blocos: BlocoSubscricao[];
  itens: ItemPreco[]; total: number; exibirLista: boolean;
  vigenciaMeses: number; prazoPagamento: string;
  observacoes: string; textoTributario: string; dadosFaturamento: string[];
  /** Layout do Word com identidade Selbetti (template). Ausente = emissão antiga → gerador legado. */
  layoutVersao?: 2;
  v2?: DadosV2;
}

export type SecaoMatriz = "recursos" | "apoio" | "servicos" | "extras";
export interface LinhaMatrizNivel { secao: SecaoMatriz; ordem: number; recurso: string; silver: string; gold: string; platinum: string; enterprise: string; global: string; ativo: boolean }
export interface DadosV2 {
  nivelTexto: string; temSuporte: boolean; temAcademy: boolean;
  matrizes: Record<SecaoMatriz, { recurso: string; valores: string[] }[]>;
  pagamentos: { rotulo: string; texto: string }[];
  academyModulos: string[];
  numeros: { valor: string; rotulo: string }[];
  diferenciais: { titulo: string; texto: string }[];
  introSuporte: string[]; confidencialidade: string;
  consultorCargo: string; salesforce: string | null; clienteRazao: string;
}

export const ehSuporte = (pn: string) => pn.startsWith("SUP-ZBX-");
export const ehAcademy = (pn: string) => pn.startsWith("ACA-ZBX-") || pn.startsWith("TRN-ZBX-ACD");
const ORDEM_NIVEL = ["Silver", "Gold", "Platinum", "Enterprise", "Global"];
export function juntarE(xs: string[]): string {
  return xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} e ${xs[xs.length - 1]}`;
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
  /** Opcionais (layout v2): níveis do cadastro, matriz de níveis e OP. */
  niveis?: Record<string, string | null>; matriz?: LinhaMatrizNivel[]; salesforce?: string | null;
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
  const base: ModeloPropostaZbx = {
    cidade: txt(p.get("proposta_cidade")) || "Joinville",
    dataEmissao: a.hojeISO, dataValidade: validade, validadeDias: a.validadeDias,
    cliente: a.cliente, contato: a.contato, email: a.email, consultor: a.consultor, codigo: a.codigo, versao: a.versao,
    quemSomos: ouPendente(p.get("proposta_quem_somos")),
    numeros: linhas(p.get("proposta_numeros")).length ? linhas(p.get("proposta_numeros")) : [A_CONFIRMAR],
    objeto: ouPendente(p.get("proposta_objeto")),
    blocos,
    itens: ok.map((l) => ({
      partNumber: l.entrada.partNumber, nome: l.entrada.nome,
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
  if (!a.matriz) return base;
  const pns = ok.map((l) => l.entrada.partNumber);
  const temSuporte = pns.some(ehSuporte), temAcademy = pns.some(ehAcademy);
  const niveis = [...new Set(ok.filter((l) => ehSuporte(l.entrada.partNumber)).map((l) => a.niveis?.[l.entrada.subscriptionId]).filter((x): x is string => !!x))]
    .sort((x, y) => ORDEM_NIVEL.indexOf(x) - ORDEM_NIVEL.indexOf(y));
  const matrizes = { recursos: [], apoio: [], servicos: [], extras: [] } as DadosV2["matrizes"];
  for (const r of [...a.matriz].filter((r) => r.ativo).sort((x, y) => x.ordem - y.ordem))
    matrizes[r.secao]?.push({ recurso: r.recurso, valores: [r.silver, r.gold, r.platinum, r.enterprise, r.global] });
  const pgSup = txt(a.prazoPagamento) || ouPendente(p.get("proposta_prazo_pagamento"));
  const pgAca = ouPendente(p.get("proposta_pagamento_academy"));
  const pagamentos = temSuporte && temAcademy
    ? [{ rotulo: "Suporte Oficial Zabbix:", texto: pgSup }, { rotulo: "Zabbix Academy:", texto: pgAca }]
    : [{ rotulo: "Pagamento:", texto: temAcademy ? pgAca : pgSup }];
  const par = (l: string) => { const i = l.indexOf("|"); return i < 0 ? [l.trim(), ""] : [l.slice(0, i).trim(), l.slice(i + 1).trim()]; };
  return {
    ...base, layoutVersao: 2,
    v2: {
      nivelTexto: juntarE(niveis), temSuporte, temAcademy, matrizes, pagamentos,
      academyModulos: linhas(p.get("proposta_academy_modulos")),
      numeros: linhas(p.get("proposta_numeros")).map((l) => { const [valor, rotulo] = par(l); return { valor, rotulo }; }),
      diferenciais: linhas(p.get("proposta_diferenciais")).map((l) => { const [titulo, texto] = par(l); return { titulo, texto }; }),
      introSuporte: linhas(p.get("proposta_intro_suporte")),
      confidencialidade: ouPendente(p.get("proposta_confidencialidade")),
      consultorCargo: txt(p.get("proposta_consultor_cargo")) || "Especialista IT Solutions",
      salesforce: txt(a.salesforce) || null,
      clienteRazao: a.cliente.trim().toLocaleUpperCase("pt-BR"),
    },
  };
}
