import { describe, it, expect } from "vitest";
import { DEFAULT_COMISSAO_TIERS } from "@/lib/comissaoRentabilidade";
import { paramsFromRows, resolveDescontos, type ZabbixSubscription } from "@/lib/zabbix/calc";
import {
  computeCarrinhoZbx, computeLinha, congelar, custoUnitario, entradasDoSnapshot, globaisDoSnapshot, montarEntradas,
  type GlobaisZbx, type LinhaZbx,
} from "@/lib/zabbix/carrinho";

const sku = (part_number: string, categoria: "suporte" | "academy", venda_brl: number, lista_usd: number, o: Partial<ZabbixSubscription> = {}): ZabbixSubscription => ({
  id: part_number, slug: part_number.toLowerCase(), part_number, nome: part_number, categoria, unidade: "server", nivel: null,
  venda_brl, lista_usd, lista_brl: null, ro_perc: null, sem_ro_perc: null, pgto30_ro_perc: null, pgto30_sem_ro_perc: null,
  permite_quantidade: true, quantidade_maxima: null, codigo_produto: "ZBX", descricao: null, piso_rentabilidade_perc: null,
  ativo: true, ordem: 0, campos_a_confirmar: [], ...o,
});
const CAT: ZabbixSubscription[] = [
  sku("SUP-ZBX-SVR-SLV", "suporte", 33500, 3900, { ro_perc: 60, sem_ro_perc: 40, pgto30_ro_perc: 0, pgto30_sem_ro_perc: 0 }),
  sku("SUP-ZBX-SVR-GLD", "suporte", 81500, 9900),
  sku("SUP-ZBX-PRX-GLD", "suporte", 8500, 990),
  sku("SUP-ZBX-SVR-PLT", "suporte", 145000, 16900),
  sku("SUP-ZBX-PRX-PLT", "suporte", 14550, 1690),
  sku("SUP-ZBX-PRX-ENT", "suporte", 789000, 92500, { pgto30_ro_perc: 40, permite_quantidade: false }),
  sku("SUP-ZBX-PRX-GLB", "suporte", 1675000, 195000, { pgto30_ro_perc: 40, pgto30_sem_ro_perc: 40, permite_quantidade: false }),
  sku("ACA-ZBX-IND", "academy", 4500, 490),
  sku("ACA-ZBX-ANN", "academy", 9550, 990),
];
const TAX = { pisPerc: 1.65, cofinsPerc: 7.6, issPerc: 2 };
const params = (extra: Record<string, unknown> = {}) => paramsFromRows(Object.entries({ cambio_usd: 5.5, ...extra }).map(([key, value]) => ({ key, value })));
const g = (temRO: boolean, pagamento30d: boolean, o: Partial<GlobaisZbx> = {}): GlobaisZbx => ({
  cenario: { temRO, pagamento30d }, comissaoFixaPerc: 8.39, retencaoPerc: 5, irpjCsllPerc: 10.3, encFinancPerc: 0, descontoTotalPerc: 0, ...o,
});
const entrada = (pn: string, quantidade = 1, descontoPerc = 0, p = params(), tax: typeof TAX | null = TAX) =>
  montarEntradas([{ id: "l1", subscriptionId: pn, quantidade, descontoPerc }], CAT, p, () => tax)[0];
const near = (a: number, b: number, tol = 0.01) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);

describe("custos nos 4 cenários (câmbio 5,50)", () => {
  const T: [string, number, number, number, number][] = [
    ["SUP-ZBX-SVR-SLV", 8580, 8580, 12870, 12870],
    ["SUP-ZBX-SVR-GLD", 13068, 16335, 19602, 24502.5],
    ["SUP-ZBX-PRX-GLD", 1306.8, 1633.5, 1960.2, 2450.25],
    ["SUP-ZBX-SVR-PLT", 22308, 27885, 33462, 41827.5],
    ["SUP-ZBX-PRX-PLT", 2230.8, 2788.5, 3346.2, 4182.75],
    ["SUP-ZBX-PRX-ENT", 91575, 152625, 183150, 228937.5],
    ["SUP-ZBX-PRX-GLB", 193050, 321750, 289575, 482625],
    ["ACA-ZBX-IND", 1886.5, 1886.5, 2695, 2695],
    ["ACA-ZBX-ANN", 3811.5, 3811.5, 5445, 5445],
  ];
  for (const [pn, a, b, c, d] of T) it(pn, () => {
    const e = entrada(pn);
    near(custoUnitario(e, { temRO: true, pagamento30d: true }), a);
    near(custoUnitario(e, { temRO: true, pagamento30d: false }), b);
    near(custoUnitario(e, { temRO: false, pagamento30d: true }), c);
    near(custoUnitario(e, { temRO: false, pagamento30d: false }), d);
  });
});

describe("chegada com comissão fixa 8,39%", () => {
  const T: [string, string, number, number, boolean, boolean, number, number, number, number][] = [
    ["Gold RO+30d q1", "SUP-ZBX-SVR-GLD", 1, 0, true, true, 13068, 81500, 49.0256, 39955.9],
    ["Gold RO+30d q3", "SUP-ZBX-SVR-GLD", 3, 0, true, true, 39204, 244500, 49.0256, 119867.7],
    ["Gold RO sem 30d", "SUP-ZBX-SVR-GLD", 1, 0, true, false, 16335, 81500, 45.0171, 36688.9],
    ["Gold sem RO+30d", "SUP-ZBX-SVR-GLD", 1, 0, false, true, 19602, 81500, 41.0085, 33421.9],
    ["Gold RO+30d desc 20%", "SUP-ZBX-SVR-GLD", 1, 20, true, true, 13068, 65200, 45.0171, 29351.12],
    ["Silver RO", "SUP-ZBX-SVR-SLV", 1, 0, true, true, 8580, 33500, 39.4481, 13215.1],
    ["Enterprise RO+30d", "SUP-ZBX-PRX-ENT", 1, 0, true, true, 91575, 789000, 53.4535, 421748.4],
    ["Global RO+30d", "SUP-ZBX-PRX-GLB", 1, 0, true, true, 193050, 1675000, 53.5346, 896705],
    ["Academy anual RO", "ACA-ZBX-ANN", 1, 0, true, true, 3811.5, 9550, 25.149, 2401.73],
    ["Academy anual sem RO", "ACA-ZBX-ANN", 1, 0, false, true, 5445, 9550, 8.0443, 768.23],
  ];
  for (const [nome, pn, q, desc, ro, p30, custo, pf, rent, lucro] of T) it(nome, () => {
    const r = computeLinha(entrada(pn, q, desc), g(ro, p30), DEFAULT_COMISSAO_TIERS);
    expect(r.erros).toEqual([]);
    near(r.custoLinha, custo); near(r.precoFinal, pf); near(r.rentabilidadePerc, rent, 1e-4); near(r.lucro, lucro);
    expect(r.comissaoInstavel).toBe(false);
  });
});

describe("chegada com a Escala Selbetti", () => {
  const T: [string, string, number, boolean, number, number, number, number, number][] = [
    ["Gold RO+30d", "SUP-ZBX-SVR-GLD", 0, true, 13068, 81500, 46.4356, 10.98, 37845.05],
    ["Gold RO+30d desc 20%", "SUP-ZBX-SVR-GLD", 20, true, 13068, 65200, 42.4271, 10.98, 27662.44],
    ["Enterprise RO+30d", "SUP-ZBX-PRX-ENT", 0, true, 91575, 789000, 50.8635, 10.98, 401313.3],
    ["Academy anual sem RO", "ACA-ZBX-ANN", 0, false, 5445, 9550, 12.7743, 3.66, 1219.95],
  ];
  for (const [nome, pn, desc, ro, custo, pf, rent, com, lucro] of T) it(nome, () => {
    const r = computeLinha(entrada(pn, 1, desc), g(ro, true, { comissaoFixaPerc: null }), DEFAULT_COMISSAO_TIERS);
    near(r.custoLinha, custo); near(r.precoFinal, pf); near(r.rentabilidadePerc, rent, 1e-4); near(r.comissaoPerc, com, 1e-4); near(r.lucro, lucro);
  });
  it("ACA-ZBX-ANN com RO: instável na escala, estável no fixo", () => {
    expect(computeLinha(entrada("ACA-ZBX-ANN"), g(true, true, { comissaoFixaPerc: null }), DEFAULT_COMISSAO_TIERS).comissaoInstavel).toBe(true);
    const f = computeLinha(entrada("ACA-ZBX-ANN"), g(true, true), DEFAULT_COMISSAO_TIERS);
    expect(f.comissaoInstavel).toBe(false); near(f.rentabilidadePerc, 25.149, 1e-4);
  });
});

describe("bordas", () => {
  const G = g(true, true);
  it("quantidade 0 e negativa", () => {
    expect(computeLinha(entrada("SUP-ZBX-SVR-GLD", 0), G, DEFAULT_COMISSAO_TIERS).erros.length).toBe(1);
    expect(computeLinha(entrada("SUP-ZBX-SVR-GLD", -2), G, DEFAULT_COMISSAO_TIERS).erros.length).toBe(1);
  });
  it("permite_quantidade = false com 2", () => {
    expect(computeLinha(entrada("SUP-ZBX-PRX-ENT", 2), G, DEFAULT_COMISSAO_TIERS).erros[0]).toMatch(/não permite/);
  });
  it("quantidade_maxima estourada", () => {
    const cat = CAT.map((s) => (s.part_number === "ACA-ZBX-IND" ? { ...s, quantidade_maxima: 5 } : s));
    const e = montarEntradas([{ id: "x", subscriptionId: "ACA-ZBX-IND", quantidade: 6, descontoPerc: 0 }], cat, params(), () => TAX)[0];
    expect(computeLinha(e, G, DEFAULT_COMISSAO_TIERS).erros[0]).toMatch(/limite de 5/);
  });
  it("desconto de 100%", () => {
    const r = computeLinha(entrada("SUP-ZBX-SVR-GLD", 1, 100), G, DEFAULT_COMISSAO_TIERS);
    expect(r.precoFinal).toBe(0); near(r.lucro, -13068);
  });
  it("custo maior que o preço final dá rentabilidade negativa", () => {
    const r = computeLinha(entrada("SUP-ZBX-SVR-GLD", 1, 90), G, DEFAULT_COMISSAO_TIERS);
    expect(r.rentabilidadePerc).toBeLessThan(0);
  });
  it("código sem alíquota no município", () => {
    const r = computeLinha(entrada("SUP-ZBX-SVR-GLD", 1, 0, params(), null), G, DEFAULT_COMISSAO_TIERS);
    expect(r.erros[0]).toMatch(/sem alíquotas/);
  });
  it("alerta de piso", () => {
    const r = computeLinha(entrada("ACA-ZBX-ANN", 1, 0, params({ piso_rentabilidade_academy: 30 })), G, DEFAULT_COMISSAO_TIERS);
    expect(r.abaixoPiso).toBe(true);
    expect(computeLinha(entrada("ACA-ZBX-ANN"), G, DEFAULT_COMISSAO_TIERS).abaixoPiso).toBe(false);
  });
});

describe("herança de desconto", () => {
  const P = params();
  const by = (pn: string) => CAT.find((s) => s.part_number === pn)!;
  it("Gold herda tudo", () => {
    const r = resolveDescontos(by("SUP-ZBX-SVR-GLD"), P.descontos);
    expect([r.ro, r.semRo, r.pgto30Ro, r.pgto30SemRo]).toEqual([70, 55, 20, 20]);
    expect(Object.values(r.origem)).toEqual(["categoria", "categoria", "categoria", "categoria"]);
  });
  it("Silver: tudo próprio", () => {
    const r = resolveDescontos(by("SUP-ZBX-SVR-SLV"), P.descontos);
    expect([r.ro, r.semRo, r.pgto30Ro, r.pgto30SemRo]).toEqual([60, 40, 0, 0]);
    expect(Object.values(r.origem)).toEqual(["sku", "sku", "sku", "sku"]);
  });
  it("Enterprise e Global", () => {
    const e = resolveDescontos(by("SUP-ZBX-PRX-ENT"), P.descontos);
    expect([e.ro, e.semRo, e.pgto30Ro, e.pgto30SemRo]).toEqual([70, 55, 40, 20]);
    expect(e.origem).toEqual({ ro: "categoria", semRo: "categoria", pgto30Ro: "sku", pgto30SemRo: "categoria" });
    const gl = resolveDescontos(by("SUP-ZBX-PRX-GLB"), P.descontos);
    expect([gl.ro, gl.semRo, gl.pgto30Ro, gl.pgto30SemRo]).toEqual([70, 55, 40, 40]);
    expect(gl.origem).toEqual({ ro: "categoria", semRo: "categoria", pgto30Ro: "sku", pgto30SemRo: "sku" });
  });
  it("RO da categoria 70 → 65 move os herdeiros, não o Silver", () => {
    const P65 = params({ desconto_ro_suporte: 65 });
    for (const pn of ["SUP-ZBX-SVR-GLD", "SUP-ZBX-SVR-PLT", "SUP-ZBX-PRX-ENT", "SUP-ZBX-PRX-GLB"]) expect(resolveDescontos(by(pn), P65.descontos).ro).toBe(65);
    expect(resolveDescontos(by("SUP-ZBX-SVR-SLV"), P65.descontos).ro).toBe(60);
    near(custoUnitario(entrada("SUP-ZBX-SVR-GLD", 1, 0, P65), { temRO: true, pagamento30d: true }), 15246);
  });
  it("câmbio 5,60", () => {
    near(custoUnitario(entrada("SUP-ZBX-SVR-GLD", 1, 0, params({ cambio_usd: 5.6 })), { temRO: true, pagamento30d: true }), 13305.6);
  });
});

describe("vivo × congelado", () => {
  const linhas: LinhaZbx[] = [
    { id: "a", subscriptionId: "SUP-ZBX-SVR-GLD", quantidade: 3, descontoPerc: 5 },
    { id: "b", subscriptionId: "ACA-ZBX-ANN", quantidade: 2, descontoPerc: 0 },
  ];
  const G = g(true, true);
  const vivo = montarEntradas(linhas, CAT, params(), () => TAX);
  const snap = congelar(vivo, G, "Joinville", 5.5, "u1");
  it("entradas e resultados idênticos", () => {
    expect(entradasDoSnapshot(snap)).toEqual(vivo);
    expect(computeCarrinhoZbx(entradasDoSnapshot(snap), globaisDoSnapshot(snap), DEFAULT_COMISSAO_TIERS)).toEqual(computeCarrinhoZbx(vivo, G, DEFAULT_COMISSAO_TIERS));
  });
  it("após mudar parâmetro, congelado mantém e vivo muda", () => {
    const antes = computeCarrinhoZbx(entradasDoSnapshot(snap), globaisDoSnapshot(snap), DEFAULT_COMISSAO_TIERS).custoTotal;
    const novoVivo = computeCarrinhoZbx(montarEntradas(linhas, CAT, params({ cambio_usd: 5.6, desconto_ro_suporte: 65 }), () => TAX), G, DEFAULT_COMISSAO_TIERS).custoTotal;
    expect(computeCarrinhoZbx(entradasDoSnapshot(snap), globaisDoSnapshot(snap), DEFAULT_COMISSAO_TIERS).custoTotal).toBe(antes);
    expect(novoVivo).not.toBe(antes);
  });
});
