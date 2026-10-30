// Modelo de dados e helpers puros do BodyShop novo (Fase 2).
import { parseComissao } from "@/lib/treinamento/calc";
import type { StatusParam } from "@/lib/treinamento/types";

export const FAIXAS = ["c1", "c2", "c3", "c4", "c5", "c6"] as const;
export type Faixa = (typeof FAIXAS)[number];

export interface BodyshopCargo {
  id: string; slug: string | null; cargo: string; area: string | null;
  nivel_num: number; senioridade: string;
  salario_c1: number | null; salario_c2: number | null; salario_c3: number | null;
  salario_c4: number | null; salario_c5: number | null; salario_c6: number | null;
  beneficios_mensais: number | null; encargos_perc: number | null; indiretos_perc: number | null;
  horas_mensais: number | null; piso_rentabilidade_perc: number | null;
  part_number_interno: string | null; codigo_produto: string | null;
  vigencia_inicio: string; vigencia_fim: string | null;
  ativo: boolean; ordem: number; campos_a_confirmar: string[];
}

export interface BodyshopContent {
  cargo_id: string;
  descricao: string | null; atividades: string | null; competencias: string | null; formacao: string | null;
  certificacoes: string | null; entregaveis?: string | null; escopo_atuacao: string | null; pre_requisitos: string | null; observacoes: string | null;
  a_confirmar: boolean;
}

export interface BodyshopParam {
  key: string; label: string; value: unknown;
  tipo: "number" | "percent" | "boolean" | "text";
  status: StatusParam; descricao: string | null; ordem: number;
}

export interface BodyshopParams {
  encargosPerc: number; beneficiosPadrao: number; indiretosPerc: number;
  beneficiosProporcionais: boolean;
  horasIntegral: number; horasMeioPeriodo: number;
  retencaoPerc: number; comissaoFixaPerc: number | null;
  irpjCsllConvencao: string; encFinancPerc: number;
  rentabilidadeAlvoPerc: number; pisoRentabilidadePerc: number | null;
  produtoPadrao: string; produtoPresencial: string; produtoRemoto: string; formatoPadrao: "presencial" | "remoto"; validadeDias: number; duracaoMeses: number;
  reajusteIndice: string | null;
}

export function paramsFromRows(rows: { key: string; value: unknown }[]): BodyshopParams {
  const m = new Map(rows.map((r) => [r.key, r.value]));
  const n = (k: string, d: number) => (m.has(k) && m.get(k) !== null && String(m.get(k)).trim() !== "" && Number.isFinite(Number(m.get(k))) ? Number(m.get(k)) : d);
  const nOpt = (k: string) => (m.get(k) == null || String(m.get(k)).trim() === "" ? null : n(k, 0));
  const t = (k: string) => (m.get(k) == null || String(m.get(k)).trim() === "" ? null : String(m.get(k)));
  return {
    encargosPerc: n("encargos_perc", 62),
    beneficiosPadrao: n("beneficios_padrao", 1381),
    indiretosPerc: n("indiretos_perc", 5),
    beneficiosProporcionais: m.has("beneficios_proporcionais_ao_regime") ? m.get("beneficios_proporcionais_ao_regime") === true : true,
    horasIntegral: n("horas_mensais_integral", 176),
    horasMeioPeriodo: n("horas_mensais_meio_periodo", 88),
    // The effective total is frozen in existing snapshots; old quotes never gain INSS implicitly.
    retencaoPerc: n("retencao_perc", 5) + n("retencao_inss_perc", 0),
    comissaoFixaPerc: parseComissao(m.get("comissao_regra")),
    irpjCsllConvencao: t("irpj_csll_convencao") ?? "padrao_site",
    encFinancPerc: n("encargos_financeiros_perc", 0),
    rentabilidadeAlvoPerc: n("rentabilidade_alvo_perc", 20),
    pisoRentabilidadePerc: nOpt("piso_rentabilidade_perc"),
    produtoPadrao: t("produto_padrao") ?? "BS",
    produtoPresencial: t("produto_presencial") ?? "TMP-02",
    produtoRemoto: t("produto_remoto") ?? "TMP-01",
    formatoPadrao: /remot/i.test(t("proposta_formato_padrao") ?? "") ? "remoto" : "presencial",
    validadeDias: n("validade_proposta_dias", 15),
    duracaoMeses: n("duracao_padrao_meses", 12),
    reajusteIndice: t("reajuste_indice"),
  };
}

export type OrigemValor = "parametro" | "cargo";
export type OrigemParam = OrigemValor;
export type Regime = "integral" | "meio_periodo";

export function resolveParamsCargo(c: Parameters<typeof resolverCargo>[0], p: BodyshopParams) {
  const r = resolverCargo(c, p);
  return {
    encargosPerc: r.encargosPerc.valor, indiretosPerc: r.indiretosPerc.valor,
    beneficiosMensais: r.beneficios.valor, horasMensais: r.horasMensais.valor,
    pisoRentabilidadePerc: r.pisoRentabilidadePerc.valor, codigoProduto: r.codigoProduto.valor,
    origem: { encargos: r.encargosPerc.origem, indiretos: r.indiretosPerc.origem,
      beneficios: r.beneficios.origem, horas: r.horasMensais.origem,
      piso: r.pisoRentabilidadePerc.origem, produto: r.codigoProduto.origem },
  };
}
export interface Resolvido<T> { valor: T; origem: OrigemValor }

export interface CargoResolvido {
  beneficios: Resolvido<number>; encargosPerc: Resolvido<number>; indiretosPerc: Resolvido<number>;
  horasMensais: Resolvido<number>; pisoRentabilidadePerc: Resolvido<number | null>; codigoProduto: Resolvido<string>;
}

/** Herança: coluna NULL no cargo = parâmetro geral; valor preenchido (inclusive 0) = exceção do cargo. */
export function resolverCargo(c: Pick<BodyshopCargo, "beneficios_mensais" | "encargos_perc" | "indiretos_perc" | "horas_mensais" | "piso_rentabilidade_perc" | "codigo_produto">, p: BodyshopParams): CargoResolvido {
  const pick = <T,>(v: T | null | undefined, d: T): Resolvido<T> => (v == null || (typeof v === "string" && v.trim() === "") ? { valor: d, origem: "parametro" } : { valor: (typeof d === "number" ? Number(v) : v) as T, origem: "cargo" });
  return {
    beneficios: pick(c.beneficios_mensais, p.beneficiosPadrao),
    encargosPerc: pick(c.encargos_perc, p.encargosPerc),
    indiretosPerc: pick(c.indiretos_perc, p.indiretosPerc),
    horasMensais: pick(c.horas_mensais, p.horasIntegral),
    pisoRentabilidadePerc: pick<number | null>(c.piso_rentabilidade_perc, p.pisoRentabilidadePerc),
    codigoProduto: pick(c.codigo_produto, p.produtoPadrao),
  };
}

export function salarioFaixa(c: BodyshopCargo, f: Faixa): number | null {
  const v = c[`salario_${f}` as const];
  return v == null ? null : Number(v);
}

export interface CustoMensal { salario: number; encargos: number; indiretos: number; beneficios: number; total: number }

/** Custo mensal integral do BodyShop novo: indiretos incluem benefícios. Legado permanece isolado. */
export function custoMensal(salario: number, r: Pick<CargoResolvido, "beneficios" | "encargosPerc" | "indiretosPerc">): CustoMensal {
  const s = Number(salario) || 0;
  const encargos = s * r.encargosPerc.valor / 100;
  const beneficios = r.beneficios.valor;
  const indiretos = (s + encargos + beneficios) * r.indiretosPerc.valor / 100;
  return { salario: s, encargos, indiretos, beneficios, total: s + encargos + indiretos + beneficios };
}

export interface PendenciaBs { origem: "cargo" | "conteudo" | "parametro"; titulo: string; detalhe: string }
const PEND: StatusParam[] = ["simulado", "a_confirmar"];

/** Parâmetros que não são mais usados pela proposta atual (PPTX) nem pelo cálculo vivo:
 *  ficam fora da edição e das pendências, mas continuam no banco para emissões históricas. */
export const PARAMETROS_OCULTOS_BS = new Set([
  "produto_padrao", "produto_presencial", "produto_remoto",
  "irpj_csll_convencao",
  // Editados em Financeiro › Impostos & Markup (evita dois lugares para o mesmo valor):
  "comissao_regra", "retencao_perc", "rentabilidade_alvo_perc", "piso_rentabilidade_perc",
  "proposta_cidade", "proposta_objeto", "proposta_texto_tributario",
  "proposta_dados_faturamento", "proposta_entregaveis_contratuais",
  "proposta_quem_somos", "proposta_numeros", "proposta_prazo_pagamento", "proposta_observacoes",
  "proposta_confidencialidade",
  "proposta_capa_titulo", "proposta_capa_subtitulo", "proposta_capa_rotulo_cliente", "proposta_capa_rotulo_por",
  "proposta_rotulo_objetivo", "proposta_rotulo_escopo", "proposta_rotulo_formato", "proposta_rotulo_perfil",
  "proposta_rotulo_localidades", "proposta_rotulo_alocado_em", "proposta_rotulo_horario", "proposta_rotulo_comercial",
  "proposta_rotulo_investimento", "proposta_rotulo_col_desc", "proposta_rotulo_col_valor", "proposta_rotulo_observacoes",
]);

export function listarPendenciasBs(cargos: BodyshopCargo[], contents: BodyshopContent[], params: BodyshopParam[]): PendenciaBs[] {
  const out: PendenciaBs[] = [];
  const nome = (c?: BodyshopCargo) => (c ? `${c.cargo} · ${c.senioridade}` : "—");
  for (const c of cargos) if (c.campos_a_confirmar.length) out.push({ origem: "cargo", titulo: nome(c), detalhe: `A confirmar: ${c.campos_a_confirmar.join(", ")}` });
  for (const ct of contents) if (ct.a_confirmar) out.push({ origem: "conteudo", titulo: nome(cargos.find((c) => c.id === ct.cargo_id)), detalhe: "Descritivo a confirmar" });
  for (const p of params) if (PEND.includes(p.status) && !PARAMETROS_OCULTOS_BS.has(p.key)) out.push({ origem: "parametro", titulo: p.label, detalhe: p.status === "simulado" ? "Simulado" : "A confirmar" });
  return out;
}

export const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

/** O SKU fiscal da vaga vem só do formato de alocação (presencial/remoto); "híbrido" legado conta como presencial. */
export function produtoPorFormato(formato: string | undefined, p: Pick<BodyshopParams, "produtoPresencial" | "produtoRemoto" | "formatoPadrao">): string {
  return (formato ?? p.formatoPadrao) === "remoto" ? p.produtoRemoto : p.produtoPresencial;
}
