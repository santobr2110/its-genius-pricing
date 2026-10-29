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
  /** Turma Aberta: quantos alunos pretendemos vender na turma (base do rateio; padrão = mínimo do curso). */
  alunosBase?: number | null;
}

export interface ConfigCarrinho {
  municipio: string;
  /** Código Protheus de faturamento (padrão "TRN"). */
  codigoProduto?: string;
  convencao: "padrao_site" | "roi_ito";
  /** Percentuais corporativos capturados ao salvar; ausência = cotação legada. */
  irpjCsllPerc?: number;
  comissaoTiers?: ComissaoTier[];
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
  retencaoPerc?: number;
  lucro: number;
  avisos: string[];
  curva: { alunos: number; custoPorAluno: number; precoPorAluno: number }[];
  /** Turma Aberta: alunos usados no rateio do preço por vaga. */
  alunosBase?: number | null;
  /** Produto fiscal vinculado à linha (define as alíquotas). */
  codigoProduto?: string;
  tax?: TaxPercs;
}

export type TaxPercs = { pisPerc: number; cofinsPerc: number; issPerc: number };

/** Produto fiscal por condição: exame → 900-0313P; In Company → 900-0315P NEW; Turma Aberta → 900-0315P. */
export const PRODUTO_TRN = { turmaAberta: "900-0315P", inCompany: "900-0315P NEW", exame: "900-0313P" } as const;
export function produtoTRN(modalidade: Modalidade, exame: boolean, produtos: { turmaAberta: string; inCompany: string; exame: string } = PRODUTO_TRN): string {
  if (exame) return produtos.exame;
  return modalidade === "in_company" ? produtos.inCompany : produtos.turmaAberta;
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
  /** Alíquotas por produto fiscal; quando informado, cada linha usa o produto da sua condição. */
  taxPorProduto?: (codigo: string) => TaxPercs | null,
): CarrinhoResultado {
  const byId = new Map(courses.map((c) => [c.id, c]));
  const cascataGeral: CascataParams = {
    ...tax, irpjCsllPerc, encFinancPerc: cfg.encFinancPerc, lucroPerc: cfg.lucroPerc,
    comissaoPerc: params.comissaoFixaPerc ?? comissaoFromRent(cfg.lucroPerc, tiers),
  };
  const fixosGeral = { pisPerc: tax.pisPerc, cofinsPerc: tax.cofinsPerc, issPerc: tax.issPerc, irpjCsllPerc, encFinancPerc: cfg.encFinancPerc };

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
    const codigoProduto = produtoTRN(linha.modalidade, curso.tipo === "exame" || linha.somenteExame, params.produtos);
    const taxL: TaxPercs = taxPorProduto ? (taxPorProduto(codigoProduto) ?? { pisPerc: 0, cofinsPerc: 0, issPerc: 0 }) : tax;
    const cascataBase: CascataParams = { ...cascataGeral, ...taxL };
    const fixos = { ...fixosGeral, ...taxL };
    // Turma Aberta: venda por vaga. O preço por aluno vem do rateio da turma-base
    // (alunos que pretendemos vender na turma, padrão = mínimo); a linha cobra vagas × preço por aluno.
    const porVaga = modalidade === "turma_aberta" && curso.tipo !== "exame";
    const vagas = Math.floor(Math.max(0, linha.alunos || 0));
    const base = porVaga ? Math.max(1, curso.min_alunos || 1) : vagas;
    const custoBase = computeCursoCusto(curso, modalidade, base, params, { locacao: linha.locacao, diarias: linha.diarias ?? undefined });
    if (porVaga && vagas < 1) custoBase.erros.push("Informe ao menos 1 aluno.");
    if (curso.tipo === "exame" && !(Number(curso.valor_fabricante) > 0)) custoBase.erros.push("Exame sem valor do fabricante cadastrado.");
    if (taxPorProduto && !taxPorProduto(codigoProduto)) custoBase.erros.push(`Produto ${codigoProduto} sem alíquotas para o município.`);
    if (custoBase.erros.length) {
      return { linha, curso, cursoOriginal: original, custo: custoBase, preco: null, descontoEfetivoPerc: 0, precoFinal: 0, precoFinalPorAluno: 0, rentabilidadePerc: 0, comissaoPerc: 0, lucro: 0, avisos, curva: [], codigoProduto, tax: taxL };
    }
    const precoBase = computePreco(custoBase.custoTurma, base, cascataBase, params.arredondamentoPrecoAluno, params.retencaoPerc ?? 0);
    const fator = porVaga ? vagas / base : 1;
    const custo: CustoResult = porVaga
      ? { ...custoBase, custoTurma: custoBase.custoPorAluno * vagas,
          detalhe: { instrutor: custoBase.detalhe.instrutor * fator, gestao: custoBase.detalhe.gestao * fator, locacao: custoBase.detalhe.locacao * fator, materialCloud: custoBase.detalhe.materialCloud * fator } }
      : custoBase;
    // Exames: o preço de venda é o valor do fabricante por aluno (não passa pela cascata de markup).
    const ehExame = curso.tipo === "exame";
    const preco: PrecoResult = ehExame
      ? { ...precoBase, precoPorAluno: Number(curso.valor_fabricante) || 0, precoTurma: (Number(curso.valor_fabricante) || 0) * Math.max(1, vagas) }
      : porVaga ? { ...precoBase, precoTurma: precoBase.precoPorAluno * vagas } : precoBase;
    
    const descontoEfetivoPerc = 100 * (1 - (1 - (linha.descontoPerc || 0) / 100) * (1 - (cfg.descontoTotalPerc || 0) / 100));
    const d = aplicarDesconto(custo.custoTurma, preco.precoTurma, descontoEfetivoPerc, fixos, tiers, params.comissaoFixaPerc ?? null, params.retencaoPerc ?? 0);
    const porAluno = d.precoFinal / Math.max(1, vagas);
    if (curso.piso_preco_aluno != null && porAluno < curso.piso_preco_aluno) avisos.push("Preço por aluno abaixo do piso cadastrado.");
    const curva = porVaga ? curvaPorAluno(curso, params, cascataBase) : [];
    return { linha, curso, cursoOriginal: original, custo, preco, descontoEfetivoPerc, precoFinal: d.precoFinal, precoFinalPorAluno: porAluno,
      rentabilidadePerc: d.rentabilidadePerc, comissaoPerc: d.comissaoPerc, retencaoPerc: params.retencaoPerc ?? 0, lucro: d.lucro, avisos, curva, alunosBase: porVaga ? base : null, codigoProduto, tax: taxL };
  });

  const ok = res.filter((r) => r.preco);
  const custoTotal = ok.reduce((s, r) => s + r.custo.custoTurma, 0);
  const precoTabelaTotal = ok.reduce((s, r) => s + (r.preco?.precoTurma ?? 0), 0);
  const precoFinalTotal = ok.reduce((s, r) => s + r.precoFinal, 0);
  const lucroTotal = ok.reduce((s, r) => s + r.lucro, 0);
  return {
    linhas: res, cascataBase: cascataGeral, custoTotal, precoTabelaTotal, precoFinalTotal, lucroTotal,
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
