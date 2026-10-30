// Modelo de dados e helpers puros dos Pacotes Consultivos Zabbix SRE (Fase 2).
import { parseComissao } from "@/lib/treinamento/calc";
import type { StatusParam } from "@/lib/treinamento/types";

export interface SrePacote {
  id: string; slug: string; part_number: string; nome: string; descricao: string | null;
  horas_execucao: number;
  pct_horas_gestao: number | null; custo_hora_execucao: number | null; custo_hora_gestao: number | null;
  /** @deprecated rentabilidade agora é da cotação (ConfigSre.rentabilidadePerc). */
  rentabilidade_alvo_perc?: number; codigo_produto: string | null;
  ativo: boolean; ordem: number; campos_a_confirmar: string[];
}

export interface SreContent {
  pacote_id: string;
  tagline: string | null; descricao: string | null; escopo_atividades: string | null; perfis_envolvidos: string | null;
  entregavel: string | null; forma_acionamento: string | null; sla_atendimento: string | null;
  validade_horas_texto: string | null; regra_consumo: string | null; pre_requisito: string | null;
  observacoes: string | null; link_mais_informacoes: string | null; a_confirmar: boolean;
}

export interface SreParam {
  key: string; label: string; value: unknown;
  tipo: "number" | "percent" | "boolean" | "text";
  status: StatusParam; descricao: string | null; ordem: number;
}

export interface SreCampanha {
  id: string; nome: string; desconto_perc: number; vigencia_inicio: string; vigencia_fim: string | null;
  ativo: boolean; observacao: string | null; a_confirmar: boolean;
}

export interface SreParams {
  custoHoraExecucao: number; custoHoraGestao: number; pctHorasGestao: number;
  rentabilidadePadraoPerc: number; retencaoPerc: number; comissaoFixaPerc: number | null; irpjCsllConvencao: string; encFinancPerc: number;
  produtoPadrao: string; skuFaturamento: string; municipioPadrao: string;
  validadeDias: number; validadeHorasMeses: number | null; cidade: string;
}

export function paramsFromRows(rows: { key: string; value: unknown }[]): SreParams {
  const m = new Map(rows.map((r) => [r.key, r.value]));
  const n = (k: string, d: number) => (m.has(k) && m.get(k) !== null && String(m.get(k)).trim() !== "" && Number.isFinite(Number(m.get(k))) ? Number(m.get(k)) : d);
  const nOpt = (k: string) => (m.get(k) == null || String(m.get(k)).trim() === "" ? null : n(k, 0));
  const s = (k: string, d: string) => (typeof m.get(k) === "string" && (m.get(k) as string).trim() !== "" ? (m.get(k) as string) : d);
  return {
    custoHoraExecucao: n("custo_hora_execucao", 135),
    custoHoraGestao: n("custo_hora_gestao", 135),
    pctHorasGestao: n("pct_horas_gestao", 20),
    rentabilidadePadraoPerc: n("rentabilidade_padrao_perc", 20),
    retencaoPerc: n("retencao_perc", 5),
    comissaoFixaPerc: parseComissao(m.get("comissao_regra")),
    irpjCsllConvencao: s("irpj_csll_convencao", "padrao_site"),
    encFinancPerc: n("encargos_financeiros_perc", 0),
    produtoPadrao: s("produto_padrao", "SRE"),
    skuFaturamento: s("sku_faturamento", ""),
    municipioPadrao: s("municipio_padrao", "Joinville"),
    validadeDias: n("validade_proposta_dias", 30),
    validadeHorasMeses: nOpt("validade_horas_meses"),
    cidade: s("proposta_cidade", "Joinville"),
  };
}

export type OrigemValor = "pacote" | "parametro";
export interface PacoteResolvido {
  pctHorasGestao: number; custoHoraExecucao: number; custoHoraGestao: number; codigoProduto: string;
  origem: { pctHorasGestao: OrigemValor; custoHoraExecucao: OrigemValor; custoHoraGestao: OrigemValor; codigoProduto: OrigemValor };
}

/** Herança: coluna NULL no pacote = parâmetro geral; valor preenchido = exceção (inclusive 0). */
export function resolvePacote(p: Pick<SrePacote, "pct_horas_gestao" | "custo_hora_execucao" | "custo_hora_gestao" | "codigo_produto">, prm: SreParams): PacoteResolvido {
  const num = (v: number | null, d: number): [number, OrigemValor] => (v == null ? [d, "parametro"] : [Number(v), "pacote"]);
  const [pct, oPct] = num(p.pct_horas_gestao, prm.pctHorasGestao);
  const [ce, oCe] = num(p.custo_hora_execucao, prm.custoHoraExecucao);
  const [cg, oCg] = num(p.custo_hora_gestao, prm.custoHoraGestao);
  const cod = p.codigo_produto && p.codigo_produto.trim() ? p.codigo_produto : null;
  return {
    pctHorasGestao: pct, custoHoraExecucao: ce, custoHoraGestao: cg, codigoProduto: cod ?? prm.produtoPadrao,
    origem: { pctHorasGestao: oPct, custoHoraExecucao: oCe, custoHoraGestao: oCg, codigoProduto: cod ? "pacote" : "parametro" },
  };
}

/** Campanhas ativas cujo intervalo se sobrepõe ao da campanha informada (fim NULL = sem fim). */
export function campanhasSobrepostas(c: Pick<SreCampanha, "id" | "ativo" | "vigencia_inicio" | "vigencia_fim">, todas: SreCampanha[]): SreCampanha[] {
  if (!c.ativo) return [];
  const fim = (x: string | null) => x ?? "9999-12-31";
  return todas.filter((o) => o.id !== c.id && o.ativo && o.vigencia_inicio <= fim(c.vigencia_fim) && c.vigencia_inicio <= fim(o.vigencia_fim));
}

export interface PendenciaSre { origem: "pacote" | "conteudo" | "campanha" | "parametro"; titulo: string; detalhe: string }
const PEND: StatusParam[] = ["simulado", "a_confirmar"];

export function listarPendenciasSre(pacotes: SrePacote[], contents: SreContent[], campanhas: SreCampanha[], params: SreParam[]): PendenciaSre[] {
  const out: PendenciaSre[] = [];
  for (const p of pacotes) if (p.campos_a_confirmar.length) out.push({ origem: "pacote", titulo: p.part_number, detalhe: `A confirmar: ${p.campos_a_confirmar.join(", ")}` });
  for (const c of contents) if (c.a_confirmar) out.push({ origem: "conteudo", titulo: pacotes.find((x) => x.id === c.pacote_id)?.part_number ?? "—", detalhe: "Descritivo comercial a confirmar" });
  for (const c of campanhas) if (c.a_confirmar) out.push({ origem: "campanha", titulo: c.nome, detalhe: "Campanha a confirmar" });
  for (const p of params) if (PEND.includes(p.status)) out.push({ origem: "parametro", titulo: p.label, detalhe: p.status === "simulado" ? "Simulado" : "A confirmar" });
  return out;
}
