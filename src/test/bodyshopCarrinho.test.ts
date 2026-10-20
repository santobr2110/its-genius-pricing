import { describe, it, expect } from "vitest";
import { paramsFromRows, resolveParamsCargo, type BodyshopCargo } from "@/lib/bodyshop/calc";
import { custoMensalUnitario, computeLinhaBS, computeCarrinhoBS, montarEntradas, congelar, entradasDoSnapshot, globaisDoSnapshot, mesmasEntradas, diferencasParametros, proximoCodigoBS, CONFIG_BS_PADRAO, type GlobaisBS, type LinhaBS } from "@/lib/bodyshop/carrinho";
import { DEFAULT_COMISSAO_TIERS as tiers } from "@/lib/comissaoRentabilidade";
const p = paramsFromRows([]);
const tax = { pisPerc: 1.65, cofinsPerc: 7.6, issPerc: 2 };
const vazio = { beneficios_mensais: null, encargos_perc: null, indiretos_perc: null, horas_mensais: null, piso_rentabilidade_perc: null, codigo_produto: null };
const cargo: BodyshopCargo = { id: "cargo", slug: "analista", cargo: "Analista", area: "TI", nivel_num: 3, senioridade: "Sênior", salario_c1: 2200, salario_c2: 4500, salario_c3: 10000, salario_c4: 18000, salario_c5: null, salario_c6: null, ...vazio, part_number_interno: null, vigencia_inicio: "2026-01-01", vigencia_fim: null, ativo: true, ordem: 0, campos_a_confirmar: [] };
const linha: LinhaBS = { id: "linha", cargoId: "cargo", faixa: "c3", quantidade: 1, regime: "integral", horasLinha: null, descontoPerc: 0 };
const g: GlobaisBS = { rentabilidadeAlvoPerc: 20, comissaoFixaPerc: 7.32, retencaoPerc: 5, irpjCsllPerc: 10.3, encFinancPerc: 0, descontoTotalPerc: 0, duracaoMeses: 12 };
const e = montarEntradas([linha], [cargo], p, () => tax)[0];
const close = (a: number, b: number, tol = .010001) => expect(Math.abs(a - b)).toBeLessThan(tol);
describe("BodyShop novo — custo mensal", () => {
  it.each([[2200, 5192.25], [4500, 9104.55], [10000, 18460.05], [18000, 32068.05]])("salário %s gera custo %s incluindo benefícios nos indiretos", (salarioBase, custo) => close(custoMensalUnitario({ ...e, salarioBase }), custo));
  it("meio período proporcional é exatamente metade do integral", () => { const meio = { ...e, horasLinha: 88, regime: "meio_periodo" as const }; close(custoMensalUnitario(meio), 9230.02); expect(custoMensalUnitario(meio)).toBe(custoMensalUnitario(e) / 2); });
  it("benefícios não proporcionais no meio período custam 9955,05", () => close(custoMensalUnitario({ ...e, horasLinha: 88, beneficiosProporcionais: false }), 9955.05));
  it("salário zero mantém benefícios e indiretos", () => close(custoMensalUnitario({ ...e, salarioBase: 0 }), 1450.05));
});
describe("BodyShop novo — cascata e chegada", () => {
  const casos = [
    [10000, 176, 1, 0, 18460.05, 40017.45, 40017.45, 20, 8003.49],
    [10000, 176, 2, 0, 36920.10, 80034.90, 80034.90, 20, 16006.98],
    [10000, 88, 1, 0, 9230.02, 20008.73, 20008.73, 20, 4001.75],
    [10000, 176, 2, 5, 36920.10, 80034.90, 76033.16, 17.5721, 13360.63],
    [4500, 176, 1, 0, 9104.55, 19736.72, 19736.72, 20, 3947.34],
    [18000, 176, 3, 10, 96204.15, 208550.08, 187695.07, 14.8744, 27918.60],
    [10000, 176, 1, 15, 18460.05, 40017.45, 34014.83, 11.8594, 4033.96],
    [2200, 176, 4, 0, 20769, 45022.76, 45022.76, 20, 9004.55],
  ];
  it.each(casos)("caso salário %s, horas %s, quantidade %s, desconto %s", (salarioBase, horasLinha, quantidade, descontoPerc, custo, tabela, final, rent, lucro) => {
    const r = computeLinhaBS({ ...e, salarioBase, horasLinha, quantidade, descontoPerc }, g, tiers);
    expect(r.erros).toEqual([]); close(r.custoLinha, custo); close(r.vendaTabela, tabela); close(r.precoFinal, final); close(r.rentabilidadePerc, rent, 1e-4); close(r.lucro, lucro);
  });
  it.each([[0, 80034.90, 20, 16006.98], [5, 76033.16, 17.5721, 13360.63], [10, 72031.41, 14.8744, 10714.27], [15, 68029.67, 11.8594, 8067.92], [20, 64027.92, 8.4675, 5421.56]])("curva de desconto %s", (descontoPerc, pf, rent, lucro) => { const r = computeLinhaBS({ ...e, quantidade: 2, descontoPerc }, g, tiers); close(r.precoFinal, pf); close(r.rentabilidadePerc, rent, 1e-4); close(r.lucro, lucro); });
  it.each([[15, 48.87, 36104.15], [20, 53.87, 40017.45], [25, 58.87, 44882.20]])("alvo %s fecha sem desconto", (rentabilidadeAlvoPerc, sigma, pv) => { const r = computeLinhaBS(e, { ...g, rentabilidadeAlvoPerc }, tiers); close(r.sigma, sigma, 1e-9); close(r.vendaTabela, pv); close(r.rentabilidadePerc, rentabilidadeAlvoPerc, 1e-9); expect(r.comissaoInstavel).toBe(false); });
  // O roteiro dá 960418,80 a partir do mensal já arredondado (80034,90 × 12).
  // A regra mensal × duração, sem arredondamento intermediário, produz 960418,82.
  it("contrato B preserva precisão; referência arredondada dá 960418,80", () => { const r = computeCarrinhoBS([{ ...e, quantidade: 2 }], g, tiers); close(Number(r.precoFinalTotalMensal.toFixed(2)) * 12, 960418.80, 1e-8); expect(r.precoFinalTotalContrato).toBe(r.precoFinalTotalMensal * 12); close(r.precoFinalTotalContrato, 960418.82); });
  it.each([[10000, 2, 5, 12, 912397.88], [18000, 3, 10, 24, 4504681.64]])("contrato salário %s quantidade %s desconto %s meses %s", (salarioBase, quantidade, descontoPerc, duracaoMeses, total) => close(computeCarrinhoBS([{ ...e, salarioBase, quantidade, descontoPerc }], { ...g, duracaoMeses }, tiers).precoFinalTotalContrato, total));
  it("descontos da linha e global se compõem multiplicativamente", () => close(computeLinhaBS({ ...e, descontoPerc: 10 }, { ...g, descontoTotalPerc: 20 }, tiers).descontoEfetivoPerc, 28, 1e-9));
  it("piso vazio não alerta; piso 21 alerta com rentabilidade 20", () => { expect(computeLinhaBS(e, g, tiers).abaixoPiso).toBe(false); expect(computeLinhaBS({ ...e, pisoRentabilidadePerc: 21 }, g, tiers).abaixoPiso).toBe(true); });
  it("comissão variável detecta ciclo; comissão fixa não oscila", () => { const t = [{ minRent: 0, maxRent: 19.99, comissao: 0 }, { minRent: 20, maxRent: null, comissao: 10 }]; expect(computeLinhaBS(e, { ...g, comissaoFixaPerc: null, descontoTotalPerc: 1 }, t).comissaoInstavel).toBe(true); expect(computeLinhaBS(e, g, t).comissaoInstavel).toBe(false); });
});
describe("BodyShop novo — herança e bordas", () => {
  it("herda 62/5/1381/176 e registra origem", () => { const r = resolveParamsCargo(cargo, p); expect([r.encargosPerc, r.indiretosPerc, r.beneficiosMensais, r.horasMensais]).toEqual([62, 5, 1381, 176]); expect(Object.values(r.origem).every(v => v === "parametro")).toBe(true); });
  it("encargos 70 são exceção e custam 19300,05", () => { const r = resolveParamsCargo({ ...cargo, encargos_perc: 70 }, p); expect(r.origem.encargos).toBe("cargo"); close(custoMensalUnitario({ ...e, encargosPerc: r.encargosPerc }), 19300.05); });
  it("benefício zero é valor real", () => expect(resolveParamsCargo({ ...cargo, beneficios_mensais: 0 }, p).beneficiosMensais).toBe(0));
  it("alterar encargos de 62 para 64 não move exceção", () => { const p64 = { ...p, encargosPerc: 64 }; expect(resolveParamsCargo(cargo, p64).encargosPerc).toBe(64); expect(resolveParamsCargo({ ...cargo, encargos_perc: 70 }, p64).encargosPerc).toBe(70); expect(custoMensalUnitario(montarEntradas([linha], [cargo], p64, () => tax)[0])).toBeGreaterThan(custoMensalUnitario(e)); });
  it.each([0, -1, 1.5])("quantidade inválida %s exclui do total", quantidade => { const r = computeCarrinhoBS([{ ...e, quantidade }], g, tiers); expect(r.temErros).toBe(true); expect(r.precoFinalTotalMensal).toBe(0); });
  it("desconto 100% gera lucro menos custo", () => { const r = computeLinhaBS({ ...e, descontoPerc: 100 }, g, tiers); expect(r.precoFinal).toBe(0); expect(r.lucro).toBe(-18460.05); });
  it("custo maior que venda produz rentabilidade negativa", () => expect(computeLinhaBS({ ...e, descontoPerc: 80 }, g, tiers).rentabilidadePerc).toBeLessThan(0));
  it("sem alíquota vigente não entra no total", () => { const r = computeCarrinhoBS([{ ...e, tax: null }], g, tiers); expect(r.temErros).toBe(true); expect(r.custoTotal).toBe(0); });
  it("cargo ausente gera erro", () => expect(computeLinhaBS(montarEntradas([linha], [], p, () => tax)[0], g, tiers).erros).toContain("Cargo não encontrado no catálogo."));
  it("faixa não preenchida não vira salário zero", () => expect(computeLinhaBS(montarEntradas([{ ...linha, faixa: "c6" }], [cargo], p, () => tax)[0], g, tiers).erros).toContain("Faixa salarial não preenchida."));
  it("Σ ≥ 100 não gera preço", () => { const r = computeLinhaBS(e, { ...g, rentabilidadeAlvoPerc: 80 }, tiers); expect(r.erros.length).toBeGreaterThan(0); expect(r.precoFinal).toBe(0); });
});
describe("BodyShop novo — congelamento", () => {
  it("ordem de chaves do JSON do banco não é alteração de entrada nem comissão", () => { const s = congelar([e], g, CONFIG_BS_PADRAO, "user", tiers); const stored = JSON.parse(JSON.stringify(s)); stored.itens = stored.itens.map((item: Record<string, unknown>) => Object.fromEntries(Object.entries(item).reverse())); stored.tiers = stored.tiers.map((item: Record<string, unknown>) => Object.fromEntries(Object.entries(item).reverse())); expect(diferencasParametros(stored, [e], g, tiers)).toEqual([]); });
  it("vivo e snapshot são idênticos e congelado não muda com parâmetro", () => {
    const vivo = montarEntradas([{ ...linha, iaJustificativa: "Perfil", iaIndiceAderencia: 87 }], [cargo], p, () => tax);
    const s = congelar(vivo, g, CONFIG_BS_PADRAO, "user", tiers);
    const congelado = entradasDoSnapshot(s); expect(congelado).toEqual(vivo);
    expect(computeCarrinhoBS(congelado, globaisDoSnapshot(s), s.tiers)).toEqual(computeCarrinhoBS(vivo, g, tiers));
    const novo = montarEntradas([linha], [cargo], { ...p, encargosPerc: 64 }, () => tax);
    close(computeCarrinhoBS(entradasDoSnapshot(s), globaisDoSnapshot(s), s.tiers).custoTotal, 18460.05);
    expect(computeCarrinhoBS(novo, g, tiers).custoTotal).toBeGreaterThan(18460.05);
    expect(congelar(novo, g, CONFIG_BS_PADRAO, "user", tiers, s.versao).versao).toBe(2);
  });
  it("alterações de horas, regime, desconto e duração invalidam snapshot", () => { const s = congelar([e], g, CONFIG_BS_PADRAO, "user", tiers); expect(mesmasEntradas(s, [linha], CONFIG_BS_PADRAO)).toBe(true); expect(mesmasEntradas(s, [{ ...linha, horasLinha: 100 }], CONFIG_BS_PADRAO)).toBe(false); expect(mesmasEntradas(s, [{ ...linha, regime: "meio_periodo" }], CONFIG_BS_PADRAO)).toBe(false); expect(mesmasEntradas(s, [linha], { ...CONFIG_BS_PADRAO, duracaoMeses: 24 })).toBe(false); expect(mesmasEntradas(s, [{ ...linha, descontoPerc: 5 }], CONFIG_BS_PADRAO)).toBe(false); });
  it("código diário ITS-BS sequencial", () => expect(proximoCodigoBS(["ITS-BS-20261020-002", "ITS-ZBX-20261020-010"], new Date(2026, 9, 20))).toBe("ITS-BS-20261020-003"));
});