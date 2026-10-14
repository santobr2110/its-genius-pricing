// Composição do carrinho do configurador de Treinamento (pura).
import type { CascataParams } from "@/lib/pricing/cascata";
import { comissaoFromRent, type ComissaoTier } from "@/lib/comissaoRentabilidade";
import { aplicarDesconto, computeCursoCusto, computePreco, curvaPorAluno, type CustoResult, type Modalidade, type PrecoResult, type TreinamentoParams } from "./calc";
import type { TrainingCourse } from "./types";

export interface LinhaCarrinho {
  id: string;
  courseId: string;
  modalidade: Modalidade;
  alunos: number;
  somenteExame: boolean;
  locacao: boolean;
  diarias: number | null;
  descontoPerc: number;
}

export interface ConfigCarrinho {
  municipio: string;
  /** Código Protheus de faturamento (padrão "TRN"). */
  codigoProduto?: string;
  convencao: "padrao_site" | "roi_ito";
  lucroPerc: number;
  encFinancPerc: number;
  descontoTotalPerc: number;
}

export const CONFIG_PADRAO: ConfigCarrinho = { municipio: "Joinville", convencao: "padrao_site", lucroPerc: 20, encFinancPerc: 0, descontoTotalPerc: 0 };

export interface LinhaResultado {
  linha: LinhaCarrinho;
  curso: TrainingCourse | null; // curso efetivamente precificado (exame quando "somente exame")
  cursoOriginal: TrainingCourse | null;
  custo: CustoResult;
  preco: PrecoResult | null;
  descontoEfetivoPerc: number;
  precoFinal: number;
  precoFinalPorAluno: number;
  rentabilidadePerc: number;
  comissaoPerc: number;
  lucro: number;
  avisos: string[];
  curva: { alunos: number; custoPorAluno: number; precoPorAluno: number }[];
}

export interface CarrinhoResultado {
  linhas: LinhaResultado[];
  cascataBase: CascataParams;
  custoTotal: number;
  precoTabelaTotal: number;
  precoFinalTotal: number;
  lucroTotal: number;
  rentabilidadePerc: number;
  temErros: boolean;
}

export function computeCarrinho(
  linhas: LinhaCarrinho[], courses: TrainingCourse[], comboItems: { combo_id: string; course_id: string }[],
  params: TreinamentoParams, cfg: ConfigCarrinho,
  tax: { pisPerc: number; cofinsPerc: number; issPerc: number }, irpjCsllPerc: number, tiers: ComissaoTier[],
): CarrinhoResultado {
  const byId = new Map(courses.map((c) => [c.id, c]));
  const cascataBase: CascataParams = {
    ...tax, irpjCsllPerc, encFinancPerc: cfg.encFinancPerc, lucroPerc: cfg.lucroPerc,
    comissaoPerc: comissaoFromRent(cfg.lucroPerc, tiers),
  };
  const fixos = { pisPerc: tax.pisPerc, cofinsPerc: tax.cofinsPerc, issPerc: tax.issPerc, irpjCsllPerc, encFinancPerc: cfg.encFinancPerc };

  // Cursos cobertos pelo carrinho (inclui componentes de combos), para avisos de pré-requisito.
  const cobertos = new Set<string>();
  for (const l of linhas) {
    cobertos.add(l.courseId);
    comboItems.filter((i) => i.combo_id === l.courseId).forEach((i) => cobertos.add(i.course_id));
  }

  const res = linhas.map<LinhaResultado>((linha) => {
    const original = byId.get(linha.courseId) ?? null;
    const exame = original?.exame_course_id ? byId.get(original.exame_course_id) ?? null : null;
    const curso = linha.somenteExame && exame ? exame : original;
    const avisos: string[] = [];
    if (!curso) {
      return { linha, curso: null, cursoOriginal: original, custo: { custoTurma: 0, custoPorAluno: 0, detalhe: { instrutor: 0, gestao: 0, locacao: 0, materialCloud: 0 }, erros: ["Curso não encontrado."] },
        preco: null, descontoEfetivoPerc: 0, precoFinal: 0, precoFinalPorAluno: 0, rentabilidadePerc: 0, comissaoPerc: 0, lucro: 0, avisos, curva: [] };
    }
    if (original?.prerequisito_course_id && !linha.somenteExame) {
      const pre = byId.get(original.prerequisito_course_id);
      if (pre && !cobertos.has(pre.id)) avisos.push(`Pré-requisito: os alunos precisam ter ${pre.nome}.`);
    }
    if (original?.slug === "zcs" && !linha.somenteExame) avisos.push("Pré-requisito: conhecimentos básicos de Linux.");
    const modalidade: Modalidade = curso.tipo === "exame" ? "turma_aberta" : linha.modalidade;
    const custo = computeCursoCusto(curso, modalidade, linha.alunos, params, { locacao: linha.locacao, diarias: linha.diarias ?? undefined });
    if (custo.erros.length) {
      return { linha, curso, cursoOriginal: original, custo, preco: null, descontoEfetivoPerc: 0, precoFinal: 0, precoFinalPorAluno: 0, rentabilidadePerc: 0, comissaoPerc: 0, lucro: 0, avisos, curva: [] };
    }
    const preco = computePreco(custo.custoTurma, linha.alunos, cascataBase, params.arredondamentoPrecoAluno);
    const descontoEfetivoPerc = 100 * (1 - (1 - (linha.descontoPerc || 0) / 100) * (1 - (cfg.descontoTotalPerc || 0) / 100));
    const d = aplicarDesconto(custo.custoTurma, preco.precoTurma, descontoEfetivoPerc, fixos, tiers);
    const porAluno = d.precoFinal / Math.max(1, linha.alunos);
    if (curso.piso_preco_aluno != null && porAluno < curso.piso_preco_aluno) avisos.push("Preço por aluno abaixo do piso cadastrado.");
    const curva = modalidade === "turma_aberta" && curso.tipo !== "exame" ? curvaPorAluno(curso, params, cascataBase) : [];
    return { linha, curso, cursoOriginal: original, custo, preco, descontoEfetivoPerc, precoFinal: d.precoFinal, precoFinalPorAluno: porAluno,
      rentabilidadePerc: d.rentabilidadePerc, comissaoPerc: d.comissaoPerc, lucro: d.lucro, avisos, curva };
  });

  const ok = res.filter((r) => r.preco);
  const custoTotal = ok.reduce((s, r) => s + r.custo.custoTurma, 0);
  const precoTabelaTotal = ok.reduce((s, r) => s + (r.preco?.precoTurma ?? 0), 0);
  const precoFinalTotal = ok.reduce((s, r) => s + r.precoFinal, 0);
  const lucroTotal = ok.reduce((s, r) => s + r.lucro, 0);
  return {
    linhas: res, cascataBase, custoTotal, precoTabelaTotal, precoFinalTotal, lucroTotal,
    rentabilidadePerc: precoFinalTotal > 0 ? (lucroTotal / precoFinalTotal) * 100 : 0,
    temErros: res.some((r) => r.custo.erros.length > 0),
  };
}

/** Próximo código ITS-TRN-AAAAMMDD-NNN dado os códigos já existentes. */
export function proximoCodigoTRN(existentes: (string | null)[], hoje = new Date()): string {
  const d = `${hoje.getFullYear()}${String(hoje.getMonth() + 1).padStart(2, "0")}${String(hoje.getDate()).padStart(2, "0")}`;
  const prefixo = `ITS-TRN-${d}-`;
  const max = existentes.reduce((m, c) => (c?.startsWith(prefixo) ? Math.max(m, Number(c.slice(prefixo.length)) || 0) : m), 0);
  return `${prefixo}${String(max + 1).padStart(3, "0")}`;
}
