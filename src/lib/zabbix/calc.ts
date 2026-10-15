// Modelo de dados e helpers puros das Subscrições Zabbix (Fase 2).
import { parseComissao } from "@/lib/treinamento/calc";
import type { StatusParam } from "@/lib/treinamento/types";

export type CategoriaZbx = "suporte" | "academy";
export type UnidadeZbx = "server" | "proxy" | "tier" | "aluno" | "assinatura";

export interface ZabbixSubscription {
  id: string; slug: string; part_number: string; nome: string;
  categoria: CategoriaZbx; unidade: UnidadeZbx; nivel: string | null;
  venda_brl: number; lista_usd: number | null; lista_brl: number | null;
  ro_perc: number | null; sem_ro_perc: number | null; pgto30_ro_perc: number | null; pgto30_sem_ro_perc: number | null;
  permite_quantidade: boolean; quantidade_maxima: number | null;
  codigo_produto: string; descricao: string | null; piso_rentabilidade_perc: number | null;
  ativo: boolean; ordem: number; campos_a_confirmar: string[];
}

export interface ZabbixContent {
  subscription_id: string;
  tagline: string | null; descricao: string | null; escopo_atendimento: string | null; sla: string | null;
  canais_atendimento: string | null; idioma: string | null; abrangencia: string | null; entregavel: string | null;
  pre_requisito: string | null; observacoes: string | null; link_mais_informacoes: string | null;
  a_confirmar: boolean;
}

export interface ZabbixParam {
  key: string; label: string; value: unknown;
  tipo: "number" | "percent" | "boolean" | "text";
  status: StatusParam; descricao: string | null; ordem: number;
}

export interface ZabbixParams {
  cambioUsd: number; retencaoPerc: number; comissaoFixaPerc: number | null;
  irpjCsllConvencao: string; encFinancPerc: number;
  produtos: { suporte: string; academy: string };
  piso: { suporte: number | null; academy: number | null };
  validadeDias: number; exibirLista: boolean;
  descontos: Record<CategoriaZbx, Descontos>;
}

export interface Descontos { ro: number; semRo: number; pgto30Ro: number; pgto30SemRo: number }

export const DESCONTOS_PADRAO: Record<CategoriaZbx, Descontos> = {
  suporte: { ro: 70, semRo: 55, pgto30Ro: 20, pgto30SemRo: 20 },
  academy: { ro: 30, semRo: 0, pgto30Ro: 0, pgto30SemRo: 0 },
};

export type OrigemDesconto = "categoria" | "sku";
export interface DescontosResolvidos extends Descontos { origem: Record<keyof Descontos, OrigemDesconto> }

/** Herança: coluna NULL no SKU = parâmetro da categoria; valor = exceção do SKU (inclusive 0). */
export function resolveDescontos(
  s: Pick<ZabbixSubscription, "categoria" | "ro_perc" | "sem_ro_perc" | "pgto30_ro_perc" | "pgto30_sem_ro_perc">,
  descontos: Record<CategoriaZbx, Descontos> = DESCONTOS_PADRAO,
): DescontosResolvidos {
  const cat = descontos[s.categoria] ?? DESCONTOS_PADRAO[s.categoria];
  const pick = (v: number | null, d: number): [number, OrigemDesconto] => (v == null ? [d, "categoria"] : [Number(v), "sku"]);
  const [ro, oRo] = pick(s.ro_perc, cat.ro);
  const [semRo, oSem] = pick(s.sem_ro_perc, cat.semRo);
  const [pgto30Ro, o30] = pick(s.pgto30_ro_perc, cat.pgto30Ro);
  const [pgto30SemRo, o30s] = pick(s.pgto30_sem_ro_perc, cat.pgto30SemRo);
  return { ro, semRo, pgto30Ro, pgto30SemRo, origem: { ro: oRo, semRo: oSem, pgto30Ro: o30, pgto30SemRo: o30s } };
}

export function paramsFromRows(rows: { key: string; value: unknown }[]): ZabbixParams {
  const m = new Map(rows.map((r) => [r.key, r.value]));
  const n = (k: string, d: number) => (m.has(k) && m.get(k) !== null && Number.isFinite(Number(m.get(k))) ? Number(m.get(k)) : d);
  const nOpt = (k: string) => (m.get(k) == null || String(m.get(k)).trim() === "" ? null : n(k, 0));
  return {
    cambioUsd: n("cambio_usd", 5.5),
    retencaoPerc: n("retencao_perc", 5),
    comissaoFixaPerc: parseComissao(m.get("comissao_regra")),
    irpjCsllConvencao: (m.get("irpj_csll_convencao") as string) || "padrao_site",
    encFinancPerc: n("encargos_financeiros_perc", 0),
    produtos: { suporte: (m.get("produto_suporte") as string) || "ZBX", academy: (m.get("produto_academy") as string) || "ZBX" },
    piso: { suporte: nOpt("piso_rentabilidade_suporte"), academy: nOpt("piso_rentabilidade_academy") },
    validadeDias: n("validade_proposta_dias", 15),
    exibirLista: m.get("exibir_lista_na_proposta") === true,
    descontos: Object.fromEntries((Object.keys(DESCONTOS_PADRAO) as CategoriaZbx[]).map((c) => {
      const d = DESCONTOS_PADRAO[c];
      return [c, { ro: n(`desconto_ro_${c}`, d.ro), semRo: n(`desconto_sem_ro_${c}`, d.semRo), pgto30Ro: n(`desconto_pgto30_ro_${c}`, d.pgto30Ro), pgto30SemRo: n(`desconto_pgto30_sem_ro_${c}`, d.pgto30SemRo) }];
    })) as Record<CategoriaZbx, Descontos>,
  };
}

/** Lista em R$: USD × câmbio; usa lista_brl só quando não há USD. */
export function listaBrl(s: Pick<ZabbixSubscription, "lista_usd" | "lista_brl">, cambio: number): number | null {
  if (s.lista_usd != null) return Math.round(s.lista_usd * cambio * 100) / 100;
  return s.lista_brl ?? null;
}

export interface CenariosCusto { ro: number; semRo: number; ro30: number; semRo30: number }

/** 4 cenários de custo: descontos aplicados em sequência sobre a lista (parceria/RO, depois pagamento 30d). */
export function cenariosCusto(s: ZabbixSubscription, cambio: number, descontos: Record<CategoriaZbx, Descontos> = DESCONTOS_PADRAO): CenariosCusto | null {
  const l = listaBrl(s, cambio);
  if (l == null) return null;
  const r = resolveDescontos(s, descontos);
  const d = (p: number) => 1 - (Number(p) || 0) / 100;
  return {
    ro: l * d(r.ro),
    semRo: l * d(r.semRo),
    ro30: l * d(r.ro) * d(r.pgto30Ro),
    semRo30: l * d(r.semRo) * d(r.pgto30SemRo),
  };
}

export interface PendenciaZbx { origem: "subscricao" | "conteudo" | "parametro"; titulo: string; detalhe: string }

const PEND: StatusParam[] = ["simulado", "a_confirmar"];

export function listarPendenciasZbx(subs: ZabbixSubscription[], contents: ZabbixContent[], params: ZabbixParam[]): PendenciaZbx[] {
  const out: PendenciaZbx[] = [];
  for (const s of subs) if (s.campos_a_confirmar.length) out.push({ origem: "subscricao", titulo: s.part_number, detalhe: `A confirmar: ${s.campos_a_confirmar.join(", ")}` });
  for (const c of contents) if (c.a_confirmar) {
    const s = subs.find((x) => x.id === c.subscription_id);
    out.push({ origem: "conteudo", titulo: s?.part_number ?? "—", detalhe: "Descritivo comercial a confirmar" });
  }
  for (const p of params) if (PEND.includes(p.status)) out.push({ origem: "parametro", titulo: p.label, detalhe: p.status === "simulado" ? "Simulado" : "A confirmar" });
  return out;
}
