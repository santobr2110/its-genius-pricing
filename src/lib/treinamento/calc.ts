// Motor de cálculo do Treinamento (Fase 3). Funções puras — ver src/test/treinamentoCalc.test.ts.
import { computeCascata, type CascataParams, type CascataResult } from "@/lib/pricing/cascata";
import { comissaoFromRent, type ComissaoTier } from "@/lib/comissaoRentabilidade";
import type { TrainingCourse } from "./types";

export type Modalidade = "turma_aberta" | "in_company";

export interface TreinamentoParams {
  taxaHoraInstrutorA: number;
  taxaHoraInstrutorB: number;
  taxaHoraGestao: number;
  pctHorasGestao: number; // %
  taxaHoraInstrutorInCompany: number;
  locacaoDiaria: number;
  inCompanyIncluiGestao: boolean;
  horasPorDia: number;
  arredondamentoPrecoAluno: number; // R$ (0 = sem)
  /** Comissão fixa (%); null = tabela de comissão por rentabilidade. */
  comissaoFixaPerc?: number | null;
}

export const PARAMS_PADRAO: TreinamentoParams = {
  taxaHoraInstrutorA: 150, taxaHoraInstrutorB: 180, taxaHoraGestao: 150, pctHorasGestao: 20,
  taxaHoraInstrutorInCompany: 250, locacaoDiaria: 1800, inCompanyIncluiGestao: true, horasPorDia: 8,
  arredondamentoPrecoAluno: 0,
};

/** Converte as linhas de training_params (key → value) nos parâmetros do motor. */
export function paramsFromRows(rows: { key: string; value: unknown }[]): TreinamentoParams {
  const m = new Map(rows.map((r) => [r.key, r.value]));
  const n = (k: string, d: number) => (Number.isFinite(Number(m.get(k))) && m.has(k) ? Number(m.get(k)) : d);
  return {
    taxaHoraInstrutorA: n("taxa_hora_instrutor_A", PARAMS_PADRAO.taxaHoraInstrutorA),
    taxaHoraInstrutorB: n("taxa_hora_instrutor_B", PARAMS_PADRAO.taxaHoraInstrutorB),
    taxaHoraGestao: n("taxa_hora_gestao", PARAMS_PADRAO.taxaHoraGestao),
    pctHorasGestao: n("pct_horas_gestao", PARAMS_PADRAO.pctHorasGestao),
    taxaHoraInstrutorInCompany: n("taxa_hora_instrutor_in_company", PARAMS_PADRAO.taxaHoraInstrutorInCompany),
    locacaoDiaria: n("locacao_diaria", PARAMS_PADRAO.locacaoDiaria),
    inCompanyIncluiGestao: m.has("in_company_inclui_gestao") ? m.get("in_company_inclui_gestao") === true : PARAMS_PADRAO.inCompanyIncluiGestao,
    horasPorDia: n("horas_por_dia", PARAMS_PADRAO.horasPorDia),
    arredondamentoPrecoAluno: n("arredondamento_preco_aluno", 0),
    comissaoFixaPerc: parseComissao(m.get("comissao_regra")),
  };
}

/** Vazio/inválido → null (usa a tabela); aceita "9,76" ou 9.76. */
export function parseComissao(v: unknown): number | null {
  if (v == null) return null;
  const t = String(v).trim().replace(",", ".");
  if (t === "") return null;
  const x = Number(t);
  return Number.isFinite(x) && x >= 0 ? x : null;
}

export type CursoCalc = Pick<TrainingCourse,
  "tipo" | "horas_execucao" | "dias" | "nivel_instrutor" | "custo_material_aluno" | "custo_cloud_aluno" | "min_alunos" | "max_alunos" | "custo_pendente">;

export interface OpcoesInCompany { locacao: boolean; diarias?: number }

export interface CustoDetalhe {
  instrutor: number;
  gestao: number;
  locacao: number;
  materialCloud: number;
}

export interface CustoResult {
  custoTurma: number;
  custoPorAluno: number;
  detalhe: CustoDetalhe;
  erros: string[];
}

const pos = (n: number) => Math.max(0, Number.isFinite(n) ? n : 0);

export function computeCursoCusto(
  curso: CursoCalc, modalidade: Modalidade, alunos: number, params: TreinamentoParams, inCompany: OpcoesInCompany = { locacao: false },
): CustoResult {
  const N = Math.floor(pos(alunos));
  const erros: string[] = [];
  const zero: CustoDetalhe = { instrutor: 0, gestao: 0, locacao: 0, materialCloud: 0 };
  if (curso.custo_pendente) erros.push("Curso com custo pendente: não é possível calcular.");
  if (N < 1) erros.push("Informe ao menos 1 aluno.");
  const porAluno = pos(curso.custo_material_aluno) + pos(curso.custo_cloud_aluno);

  if (curso.tipo === "exame") {
    if (erros.length) return { custoTurma: 0, custoPorAluno: 0, detalhe: zero, erros };
    const mc = N * porAluno;
    return { custoTurma: mc, custoPorAluno: mc / N, detalhe: { ...zero, materialCloud: mc }, erros };
  }

  const h = pos(curso.horas_execucao);
  if (modalidade === "turma_aberta") {
    if (N > 0 && N < curso.min_alunos) erros.push(`Abaixo do mínimo para a turma ocorrer (${curso.min_alunos} alunos).`);
    if (curso.max_alunos != null && N > curso.max_alunos) erros.push(`Acima do máximo da turma (${curso.max_alunos} alunos).`);
    if (!curso.nivel_instrutor) erros.push("Curso sem nível de instrutor definido.");
  }
  if (erros.length) return { custoTurma: 0, custoPorAluno: 0, detalhe: zero, erros };

  let detalhe: CustoDetalhe;
  if (modalidade === "turma_aberta") {
    const taxa = curso.nivel_instrutor === "B" ? params.taxaHoraInstrutorB : params.taxaHoraInstrutorA;
    detalhe = {
      instrutor: h * taxa,
      gestao: h * (params.pctHorasGestao / 100) * params.taxaHoraGestao,
      locacao: 0,
      materialCloud: N * porAluno,
    };
  } else {
    const diarias = pos(inCompany.diarias ?? curso.dias ?? Math.ceil(h / Math.max(1, params.horasPorDia)));
    detalhe = {
      instrutor: h * params.taxaHoraInstrutorInCompany,
      gestao: params.inCompanyIncluiGestao ? h * (params.pctHorasGestao / 100) * params.taxaHoraGestao : 0,
      locacao: inCompany.locacao ? diarias * params.locacaoDiaria : 0,
      materialCloud: N * porAluno,
    };
  }
  const custoTurma = detalhe.instrutor + detalhe.gestao + detalhe.locacao + detalhe.materialCloud;
  return { custoTurma, custoPorAluno: custoTurma / N, detalhe, erros };
}

export interface PrecoResult {
  precoTurma: number;
  precoPorAluno: number;
  cascata: CascataResult;
}

/** PV da turma pela cascata compartilhada; preço por aluno = PV / N (com arredondamento opcional para cima). */
export function computePreco(custoTurma: number, alunos: number, cascataParams: CascataParams, arredondamento = 0): PrecoResult {
  const cascata = computeCascata(custoTurma, cascataParams);
  const N = Math.max(1, Math.floor(pos(alunos)));
  let porAluno = cascata.precoVenda / N;
  let turma = cascata.precoVenda;
  if (arredondamento > 0 && !cascata.invalido) {
    porAluno = Math.ceil(porAluno / arredondamento) * arredondamento;
    turma = porAluno * N;
  }
  return { precoTurma: turma, precoPorAluno: porAluno, cascata };
}

/** Curva de preço por aluno de min até max (ou min+10) — ganho de escala da Turma Aberta. */
export function curvaPorAluno(
  curso: CursoCalc, params: TreinamentoParams, cascataParams: CascataParams,
): { alunos: number; custoPorAluno: number; precoPorAluno: number }[] {
  const ini = Math.max(1, curso.min_alunos);
  const fim = curso.max_alunos ?? ini + 10;
  const out = [];
  for (let n = ini; n <= fim; n++) {
    const c = computeCursoCusto(curso, "turma_aberta", n, params);
    if (c.erros.length) continue;
    out.push({ alunos: n, custoPorAluno: c.custoPorAluno, precoPorAluno: computePreco(c.custoTurma, n, cascataParams, params.arredondamentoPrecoAluno).precoPorAluno });
  }
  return out;
}

export interface DescontoResult {
  precoFinal: number;
  rentabilidadePerc: number;
  comissaoPerc: number;
  lucro: number;
}

/**
 * Aplica desconto (%) sobre o PV e recalcula a rentabilidade: os percentuais sobre a venda
 * (PIS, COFINS, ISS, IR/CSLL, enc. financeiros) acompanham o novo preço; a comissão segue a
 * faixa da nova rentabilidade (ponto fixo).
 */
export function aplicarDesconto(
  custo: number, pv: number, descontoPerc: number,
  p: Omit<CascataParams, "comissaoPerc" | "lucroPerc">, tiers: ComissaoTier[], comissaoFixa: number | null = null,
): DescontoResult {
  const pf = pv * (1 - pos(descontoPerc) / 100);
  if (pf <= 0) return { precoFinal: 0, rentabilidadePerc: 0, comissaoPerc: 0, lucro: -custo };
  const fixos = pos(p.pisPerc) + pos(p.cofinsPerc) + pos(p.issPerc) + pos(p.irpjCsllPerc) + pos(p.encFinancPerc);
  const base = 100 - fixos - (custo / pf) * 100; // rent + comissão
  let com = comissaoFixa ?? 0;
  for (let i = 0; comissaoFixa == null && i < 20; i++) {
    const next = comissaoFromRent(base - com, tiers);
    if (next === com) break;
    com = next;
  }
  const rent = base - com;
  return { precoFinal: pf, rentabilidadePerc: rent, comissaoPerc: com, lucro: (pf * rent) / 100 };
}
