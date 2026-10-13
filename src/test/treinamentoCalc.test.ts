import { describe, expect, it } from "vitest";
import { aplicarDesconto, computeCursoCusto, computePreco, curvaPorAluno, PARAMS_PADRAO, type CursoCalc } from "@/lib/treinamento/calc";
import { DEFAULT_COMISSAO_TIERS } from "@/lib/comissaoRentabilidade";

const c = (horas: number, nivel: "A" | "B" | null, mat: number, cloud: number, min: number, max: number | null = null, tipo: CursoCalc["tipo"] = "curso", dias: number | null = null): CursoCalc =>
  ({ tipo, horas_execucao: horas, dias, nivel_instrutor: nivel, custo_material_aluno: mat, custo_cloud_aluno: cloud, min_alunos: min, max_alunos: max, custo_pendente: false });

const CURSOS = {
  ZCU: c(8, "A", 350, 0, 20), ZCS: c(40, "A", 1300, 0, 10), ZCP: c(24, "B", 1300, 0, 10),
  COMBO: c(64, "B", 2250, 0, 10), ZCE: c(40, "B", 2200, 0, 5), EXTRA: c(8, "B", 300, 0, 5), GRAFANA: c(20, "A", 0, 120, 10, 25),
};
const P = PARAMS_PADRAO;
// Σ 43,27% (PIS 1,65 · COFINS 7,6 · ISS 2 · comissão 3 · IR/CSLL 10,3 · enc 0,72 · lucro 18)
const CASC = { pisPerc: 1.65, cofinsPerc: 7.6, issPerc: 2, comissaoPerc: 3, irpjCsllPerc: 10.3, encFinancPerc: 0.72, lucroPerc: 18 };

describe("Treinamento · custo Turma Aberta no mínimo de alunos", () => {
  const casos: [keyof typeof CURSOS, number, number][] = [
    ["ZCU", 8440, 422], ["ZCS", 20200, 2020], ["ZCP", 18040, 1804], ["COMBO", 35940, 3594],
    ["ZCE", 19400, 3880], ["EXTRA", 3180, 636], ["GRAFANA", 4800, 480],
  ];
  for (const [k, turma, aluno] of casos) {
    it(`${k}: ${turma} / ${aluno}`, () => {
      const r = computeCursoCusto(CURSOS[k], "turma_aberta", CURSOS[k].min_alunos, P);
      expect(r.erros).toEqual([]);
      expect(r.custoTurma).toBeCloseTo(turma, 6);
      expect(r.custoPorAluno).toBeCloseTo(aluno, 6);
    });
  }

  it("exames: custo = N × custo do exame", () => {
    for (const [custo] of [[120], [900], [900], [600]]) {
      const r = computeCursoCusto(c(0, null, custo, 0, 1, null, "exame"), "turma_aberta", 1, P);
      expect(r.custoTurma).toBe(custo);
      expect(r.detalhe.instrutor).toBe(0);
    }
    expect(computeCursoCusto(c(0, null, 900, 0, 1, null, "exame"), "turma_aberta", 3, P).custoTurma).toBe(2700);
  });

  it("ZCS por N: 10 → 2.020, 12 → 1.900, 15 → 1.780, 20 → 1.660", () => {
    for (const [n, v] of [[10, 2020], [12, 1900], [15, 1780], [20, 1660]]) {
      expect(computeCursoCusto(CURSOS.ZCS, "turma_aberta", n, P).custoPorAluno).toBeCloseTo(v, 6);
    }
  });
});

describe("Treinamento · cascata Σ 43,27%", () => {
  it.each([["ZCE", 6839], ["ZCS", 3561], ["GRAFANA", 846]] as const)("%s ≈ %d por aluno", (k, v) => {
    const cur = CURSOS[k];
    const custo = computeCursoCusto(cur, "turma_aberta", cur.min_alunos, P);
    const p = computePreco(custo.custoTurma, cur.min_alunos, CASC);
    expect(p.cascata.totalEncargosPerc).toBeCloseTo(43.27, 6);
    expect(Math.abs(p.precoPorAluno - v)).toBeLessThan(1);
  });

  it("arredondamento do preço por aluno é para cima", () => {
    const p = computePreco(19400, 5, CASC, 10);
    expect(p.precoPorAluno).toBe(6840);
    expect(p.precoTurma).toBe(34200);
  });

  it("curva por N vai do mínimo ao máximo (ou mínimo+10) e é decrescente", () => {
    const g = curvaPorAluno(CURSOS.GRAFANA, P, CASC);
    expect(g[0].alunos).toBe(10);
    expect(g.at(-1)!.alunos).toBe(25);
    const z = curvaPorAluno(CURSOS.ZCS, P, CASC);
    expect(z.at(-1)!.alunos).toBe(20);
    for (let i = 1; i < z.length; i++) expect(z[i].precoPorAluno).toBeLessThan(z[i - 1].precoPorAluno);
  });
});

describe("Treinamento · limites e In Company", () => {
  it("N abaixo do mínimo → erro e sem custo", () => {
    const r = computeCursoCusto(CURSOS.ZCS, "turma_aberta", 9, P);
    expect(r.erros.join()).toMatch(/mínimo/);
    expect(r.custoTurma).toBe(0);
  });
  it("N acima do máximo → erro", () => {
    expect(computeCursoCusto(CURSOS.GRAFANA, "turma_aberta", 26, P).erros.join()).toMatch(/máximo/);
  });
  it("custo pendente → erro", () => {
    expect(computeCursoCusto({ ...CURSOS.ZCS, custo_pendente: true }, "turma_aberta", 10, P).erros.length).toBeGreaterThan(0);
  });
  it("In Company sem locação: sem mínimo de alunos, taxa In Company + gestão", () => {
    const r = computeCursoCusto({ ...CURSOS.ZCS, dias: 5 }, "in_company", 4, P, { locacao: false });
    expect(r.erros).toEqual([]);
    // 40×250 + 40×0,2×150 + 4×1300
    expect(r.custoTurma).toBe(10000 + 1200 + 5200);
  });
  it("In Company com locação: dias × diária (default = dias do curso)", () => {
    const r = computeCursoCusto({ ...CURSOS.ZCS, dias: 5 }, "in_company", 4, P, { locacao: true });
    expect(r.detalhe.locacao).toBe(5 * 1800);
    expect(computeCursoCusto({ ...CURSOS.ZCS, dias: 5 }, "in_company", 4, P, { locacao: true, diarias: 3 }).detalhe.locacao).toBe(5400);
  });
  it("In Company sem gestão quando o parâmetro está desligado", () => {
    const r = computeCursoCusto({ ...CURSOS.ZCS, dias: 5 }, "in_company", 4, { ...P, inCompanyIncluiGestao: false });
    expect(r.detalhe.gestao).toBe(0);
  });
});

describe("Treinamento · desconto", () => {
  const base = { pisPerc: 1.65, cofinsPerc: 7.6, issPerc: 2, irpjCsllPerc: 10.3, encFinancPerc: 0 };
  it("sem desconto reproduz a rentabilidade da cascata", () => {
    const casc = { ...base, comissaoPerc: 7.32, lucroPerc: 20 };
    const pv = computePreco(10000, 1, casc).precoTurma;
    const d = aplicarDesconto(10000, pv, 0, base, DEFAULT_COMISSAO_TIERS);
    expect(d.rentabilidadePerc).toBeCloseTo(20, 6);
    expect(d.comissaoPerc).toBe(7.32);
  });
  it("desconto reduz rentabilidade e pode trocar a faixa de comissão", () => {
    const casc = { ...base, comissaoPerc: 7.32, lucroPerc: 20 };
    const pv = computePreco(10000, 1, casc).precoTurma;
    const d = aplicarDesconto(10000, pv, 10, base, DEFAULT_COMISSAO_TIERS);
    expect(d.precoFinal).toBeCloseTo(pv * 0.9, 6);
    expect(d.rentabilidadePerc).toBeLessThan(20);
    expect(d.comissaoPerc).toBeLessThan(7.32);
  });
});
