import { describe, expect, it } from "vitest";
import { custoMensal, paramsFromRows, resolverCargo } from "@/lib/bodyshop/calc";
import { planejarImport } from "@/lib/bodyshop/import";

const p = paramsFromRows([
  { key: "encargos_perc", value: 62 }, { key: "beneficios_padrao", value: 1381 }, { key: "indiretos_perc", value: 5 },
  { key: "comissao_regra", value: "7,32" }, { key: "produto_padrao", value: "BS" },
]);
const vazio = { beneficios_mensais: null, encargos_perc: null, indiretos_perc: null, horas_mensais: null, piso_rentabilidade_perc: null, codigo_produto: null };

describe("BodyShop — parâmetros e herança", () => {
  it("lê comissão '7,32' e defaults quando a chave não existe", () => {
    expect(p.comissaoFixaPerc).toBe(7.32);
    expect(p.horasIntegral).toBe(176);
  });
  it("cargo sem exceção herda do parâmetro", () => {
    const r = resolverCargo(vazio, p);
    expect(r.encargosPerc).toEqual({ valor: 62, origem: "parametro" });
    expect(r.codigoProduto).toEqual({ valor: "BS", origem: "parametro" });
  });
  it("exceção 0 é valor real, não herança", () => {
    expect(resolverCargo({ ...vazio, encargos_perc: 0 }, p).encargosPerc).toEqual({ valor: 0, origem: "cargo" });
  });
  it("custo mensal: 10.000 + 62% + 5% sobre (sal+enc) + 1.381", () => {
    // 10000 + 6200 + 810 + 1381 = 18391
    expect(custoMensal(10000, resolverCargo(vazio, p)).total).toBeCloseTo(18391, 6);
  });
  it("exceção de encargos muda o custo e voltar a herdar restaura", () => {
    expect(custoMensal(10000, resolverCargo({ ...vazio, encargos_perc: 70 }, p)).total).toBeCloseTo(10000 + 7000 + 850 + 1381, 6);
    expect(custoMensal(10000, resolverCargo({ ...vazio, encargos_perc: null }, p)).total).toBeCloseTo(18391, 6);
  });
});

describe("BodyShop — plano de import", () => {
  const ex = { id: "1", slug: "analista-n2", cargo: "Analista", area: "TI", nivel_num: 2, senioridade: "Pleno",
    salario_c1: 1, salario_c2: 2, salario_c3: 3, salario_c4: null, salario_c5: null, salario_c6: null,
    ...vazio, part_number_interno: null, vigencia_inicio: "2000-01-01", vigencia_fim: null, ativo: true, ordem: 0, campos_a_confirmar: [] };
  const velho = { ...ex, id: "2", slug: "dba-n3", cargo: "DBA", nivel_num: 3 };
  it("conta novos, atualizados, iguais e desativa ausentes", () => {
    const plano = planejarImport([
      { cargo: "Analista", area: "TI", nivel: "2", salario_base: 3, nivel_num: 2, faixas: { C1: 1, C2: 2, C3: 3 } },
      { cargo: "Analista", area: "TI", nivel: "3", salario_base: 5, nivel_num: 3, faixas: { C3: 5 } },
      { cargo: "Suporte", area: "TI", nivel: "1", salario_base: 0, nivel_num: 1, faixas: {} },
    ], [ex, velho]);
    expect(plano.itens.map((i) => i.tipo)).toEqual(["igual", "novo", "novo"]);
    expect(plano.itens[2].semFaixa).toBe(true);
    expect(plano.desativar.map((c) => c.id)).toEqual(["2"]);
  });
});
