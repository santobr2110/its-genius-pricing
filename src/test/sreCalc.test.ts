import { describe, it, expect } from "vitest";
import { campanhasSobrepostas, paramsFromRows, resolvePacote, type SreCampanha } from "@/lib/sre/calc";

describe("SRE paramsFromRows", () => {
  it("usa defaults quando a chave não existe e Escala Selbetti com comissão vazia", () => {
    const p = paramsFromRows([]);
    expect(p.custoHoraExecucao).toBe(135);
    expect(p.pctHorasGestao).toBe(20);
    expect(p.retencaoPerc).toBe(5);
    expect(p.produtoPadrao).toBe("SRE");
    expect(p.comissaoFixaPerc).toBeNull();
    expect(p.validadeHorasMeses).toBeNull();
  });
});

describe("SRE herança do pacote", () => {
  const prm = paramsFromRows([]);
  it("NULL herda o parâmetro geral", () => {
    const r = resolvePacote({ pct_horas_gestao: null, custo_hora_execucao: null, custo_hora_gestao: null, codigo_produto: null }, prm);
    expect(r.pctHorasGestao).toBe(20);
    expect(r.codigoProduto).toBe("SRE");
    expect(r.origem.pctHorasGestao).toBe("parametro");
  });
  it("0 é exceção real do pacote", () => {
    const r = resolvePacote({ pct_horas_gestao: 0, custo_hora_execucao: null, custo_hora_gestao: null, codigo_produto: null }, prm);
    expect(r.pctHorasGestao).toBe(0);
    expect(r.origem.pctHorasGestao).toBe("pacote");
  });
});

describe("SRE campanhas sobrepostas", () => {
  const base: SreCampanha = { id: "a", nome: "A", desconto_perc: 12, vigencia_inicio: "2026-01-01", vigencia_fim: "2026-03-31", ativo: true, observacao: null, a_confirmar: false };
  it("bloqueia campanha ativa que cruza o período de outra ativa", () => {
    expect(campanhasSobrepostas({ id: "b", ativo: true, vigencia_inicio: "2026-03-01", vigencia_fim: null }, [base])).toHaveLength(1);
  });
  it("permite períodos sem interseção ou campanha inativa", () => {
    expect(campanhasSobrepostas({ id: "b", ativo: true, vigencia_inicio: "2026-04-01", vigencia_fim: null }, [base])).toHaveLength(0);
    expect(campanhasSobrepostas({ id: "b", ativo: false, vigencia_inicio: "2026-02-01", vigencia_fim: null }, [base])).toHaveLength(0);
  });
});

// ================= Fase 3: motor =================
import { DEFAULT_COMISSAO_TIERS } from "@/lib/comissaoRentabilidade";
import {
  campanhaVigente, computeCarrinhoSre, computeLinhaSre, congelar, custoPacote, descontoEfetivo, entradasDoSnapshot,
  globaisDoSnapshot, montarEntradas, proximoCodigoSre, resolveParamsPacote, type GlobaisSre, type LinhaSre,
} from "@/lib/sre/carrinho";
import type { SrePacote } from "@/lib/sre/calc";

const T = DEFAULT_COMISSAO_TIERS;
const TAX = { pisPerc: 0.65, cofinsPerc: 3, issPerc: 2 };
const taxFn = (c: string) => (c === "SRE" ? TAX : null);
const PRM = paramsFromRows([]);
const G: GlobaisSre = { comissaoFixaPerc: null, retencaoPerc: 5, irpjCsllPerc: 10.34, irpjCsllConvencao: "padrao_site", encFinancPerc: 0, descontoTotalPerc: 0, campanha: null };
const ALVOS: [number, number][] = [[5,24.510],[10,24.459],[20,24.355],[40,24.147],[60,23.936],[80,23.723],[100,23.507],[120,23.290],[160,22.847],[180,22.622],[240,21.932],[360,20.478],[400,20],[480,20],[1500,20]];
const pac = (h: number, a: number, o: Partial<SrePacote> = {}): SrePacote => ({ id: `p${h}`, slug: `hrs-zbx-${h}`, part_number: `HRS-ZBX-${h}`, nome: `${h} h`, descricao: null,
  horas_execucao: h, pct_horas_gestao: null, custo_hora_execucao: null, custo_hora_gestao: null, rentabilidade_alvo_perc: a, codigo_produto: null,
  ativo: true, ordem: 0, campos_a_confirmar: [], ...o });
const CAT = ALVOS.map(([h, a]) => pac(h, a));
const linha = (h: number, q = 1, d = 0): LinhaSre => ({ id: `l${h}`, pacoteId: `p${h}`, quantidade: q, descontoPerc: d });
const calc = (h: number, g: GlobaisSre = G, q = 1, d = 0, cat = CAT, prm = PRM) => computeLinhaSre(montarEntradas([linha(h, q, d)], cat, prm, taxFn)[0], g, T);
const camp12 = { id: "c", nome: "Camp", descontoPerc: 12 };
const R = (a: number, b: number) => expect(a).toBeCloseTo(b, 2);
const P = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1e-3);

describe("SRE a) sem desconto fecha no alvo", () => {
  const tab: [number, number, number, number][] = [[5,810,1716.83,343.37],[10,1620,3429.95,343.00],[20,3240,6844.83,342.24],[40,6480,13629.77,340.74],[60,9720,20354.32,339.24],[80,12960,27018.58,337.73],[100,16200,33621.82,336.22],[120,19440,40165.29,334.71],[160,25920,53067.99,331.67],[180,29160,59427.73,330.15],[240,38880,78138.19,325.58],[360,58320,113879.56,316.33],[400,64800,125362.74,313.41],[480,77760,150435.29,313.41],[1500,243000,470110.27,313.41]];
  it.each(tab)("HRS-ZBX-%i", (h, custo, preco, vh) => {
    const l = calc(h);
    const alvo = ALVOS.find((x) => x[0] === h)![1];
    expect(l.erros).toEqual([]);
    R(l.custoLinha, custo); R(l.precoTabela, preco); R(l.precoFinal, preco); R(l.valorHoraExecucao, vh);
    P(l.rentabilidadePerc, alvo); P(l.comissaoPerc, 7.32); P(l.comissaoCascataPerc, 7.32);
    expect(l.comissaoInstavel).toBe(false);
  });
});

describe("SRE b) campanha de 12%", () => {
  const g = { ...G, campanha: camp12 };
  const tab: [number, number, number, number, boolean, number][] = [[5,1510.81,19.296,6.10,true,291.53],[20,6023.45,19.120,6.10,true,1151.70],[100,29587.20,18.157,6.10,true,5372.03],[240,68761.61,16.367,6.10,true,11254.09],[360,100214.01,17.155,3.66,false,17191.26],[400,110319.21,16.611,3.66,false,18325.53],[480,132383.05,16.611,3.66,false,21990.63],[1500,413697.04,16.611,3.66,false,68720.72]];
  it.each(tab)("HRS-ZBX-%i", (h, pf, rent, com, estavel, lucro) => {
    const l = calc(h, g);
    R(l.precoFinal, pf); P(l.rentabilidadePerc, rent); P(l.comissaoPerc, com); R(l.lucro, lucro);
    expect(l.comissaoInstavel).toBe(!estavel);
  });
  it("não-monotonicidade: 360 h termina acima de 240 h", () => {
    expect(calc(360, g).rentabilidadePerc).toBeGreaterThan(calc(240, g).rentabilidadePerc);
  });
});

describe("SRE c) curva de desconto", () => {
  const c5: [number, number, number, number, boolean][] = [[0,1716.83,24.510,7.32,true],[5,1630.99,22.027,7.32,true],[10,1545.15,20.488,6.10,false],[15,1459.30,17.404,6.10,true],[20,1373.46,16.375,3.66,false],[25,1287.62,12.443,3.66,true],[30,1201.78,11.610,0,false]];
  const c1500: [number, number, number, number, boolean][] = [[0,470110.27,20,7.32,true],[5,446604.76,18.499,6.10,true],[10,423099.25,15.477,6.10,true],[15,399593.73,14.538,3.66,true],[20,376088.22,10.738,3.66,true],[25,352582.70,10.090,0,false],[30,329077.19,5.167,0,true]];
  for (const [h, tab] of [[5, c5], [1500, c1500]] as const) {
    it.each(tab)(`HRS-ZBX-${h} desconto %i%%`, (d, pf, rent, com, estavel) => {
      const l = calc(h, G, 1, d);
      R(l.precoFinal, pf); P(l.rentabilidadePerc, rent); P(l.comissaoPerc, com);
      expect(l.comissaoInstavel).toBe(!estavel);
    });
  }
});

describe("SRE d) comissão fixa", () => {
  it("7,32 fixa coincide com a escala em todos os pacotes (prova que a cascata lê o alvo)", () => {
    for (const [h] of ALVOS) {
      const e = calc(h), f = calc(h, { ...G, comissaoFixaPerc: 7.32 });
      R(f.precoTabela, e.precoTabela); P(f.rentabilidadePerc, e.rentabilidadePerc);
    }
  });
  it("9,76 fixa encarece HRS-ZBX-5", () => {
    const l = calc(5, { ...G, comissaoFixaPerc: 9.76 });
    R(l.precoTabela, 1772.76); R(l.valorHoraExecucao, 354.55);
  });
});

describe("SRE e) composição de descontos", () => {
  it("campanha 12 + linha 5 + total 3 = 19,108%", () => {
    P(descontoEfetivo(12, 5, 3), 19.108);
    P(calc(5, { ...G, campanha: camp12, descontoTotalPerc: 3 }, 1, 5).descontoEfetivoPerc, 19.108);
    P(descontoEfetivo(12, 0, 0), 12); P(descontoEfetivo(0, 5, 0), 5); P(descontoEfetivo(0, 0, 3), 3);
  });
  it("campanha fora da vigência não entra", () => {
    const camps = [{ id: "c", nome: "C", desconto_perc: 12, vigencia_inicio: "2026-01-01", vigencia_fim: "2026-03-31", ativo: true, observacao: null, a_confirmar: false }];
    expect(campanhaVigente(camps, "2026-04-01")).toBeNull();
    expect(campanhaVigente(camps, "2026-02-01")?.descontoPerc).toBe(12);
    expect(campanhaVigente([{ ...camps[0], ativo: false }], "2026-02-01")).toBeNull();
  });
});

describe("SRE f) herança", () => {
  it("sem override herda tudo", () => {
    const r = resolveParamsPacote(CAT[0], PRM);
    expect([r.pctHorasGestao, r.custoHoraExecucao, r.custoHoraGestao, r.codigoProduto]).toEqual([20, 135, 135, "SRE"]);
    expect(Object.values(r.origem).every((o) => o === "parametro")).toBe(true);
  });
  it("custo exec 150 no pacote", () => {
    const cat = [pac(5, 24.51, { custo_hora_execucao: 150 })];
    expect(resolveParamsPacote(cat[0], PRM).origem.custoExec).toBe("pacote");
    R(custoPacote(montarEntradas([linha(5)], cat, PRM, taxFn)[0]), 885);
  });
  it("gestão 0 é valor real", () => {
    const cat = [pac(5, 24.51, { pct_horas_gestao: 0 })];
    R(custoPacote(montarEntradas([linha(5)], cat, PRM, taxFn)[0]), 675);
  });
  it("mudar o parâmetro geral move só quem herda", () => {
    const cat = [pac(5, 24.51), pac(10, 24.459, { custo_hora_execucao: 150 })];
    const prm2 = paramsFromRows([{ key: "custo_hora_execucao", value: 140 }]);
    const [a, b] = montarEntradas([linha(5), linha(10)], cat, prm2, taxFn);
    expect(a.custoHoraExecucao).toBe(140); expect(b.custoHoraExecucao).toBe(150);
  });
});

describe("SRE g) bordas", () => {
  it("quantidade 0 e negativa geram erro", () => {
    expect(calc(5, G, 0).erros.length).toBeGreaterThan(0);
    expect(calc(5, G, -1).erros.length).toBeGreaterThan(0);
  });
  it("quantidade 3 de HRS-ZBX-100", () => {
    const l = calc(100, G, 3); R(l.custoLinha, 48600); R(l.precoFinal, 100865.47);
  });
  it("desconto 100%", () => {
    const l = calc(5, G, 1, 100); expect(l.precoFinal).toBe(0); R(l.lucro, -810);
  });
  it("código sem alíquota e pacote ausente ficam fora do total", () => {
    const cat = [...CAT, pac(7, 24, { id: "px", codigo_produto: "XYZ" })];
    const ent = montarEntradas([linha(5), { id: "lx", pacoteId: "px", quantidade: 1, descontoPerc: 0 }, { id: "ly", pacoteId: "nao", quantidade: 1, descontoPerc: 0 }], cat, PRM, taxFn);
    const c = computeCarrinhoSre(ent, G, T);
    expect(c.linhas[1].erros.length).toBe(1); expect(c.linhas[2].erros.length).toBeGreaterThan(0);
    expect(c.temErros).toBe(true); R(c.precoFinalTotal, 1716.83); R(c.custoTotal, 810);
  });
  it("alvo 0 = custo / (1 − 20,99%)", () => {
    const l = calc(5, G, 1, 0, [pac(5, 0)]);
    R(l.precoTabela, 810 / (1 - 0.2099 - comissaoFromRentZero()));
  });
  it("alvo 80 é preço impossível", () => {
    const l = calc(5, G, 1, 0, [pac(5, 80)]);
    expect(l.erros[0]).toMatch(/impossível/);
  });
  it("horas 0 gera erro", () => {
    expect(calc(5, G, 1, 0, [pac(5, 24.51, { horas_execucao: 0 })]).erros.length).toBeGreaterThan(0);
  });
});
// Com alvo 0 a escala devolve 0% de comissão: fixos 20,99% sozinhos.
function comissaoFromRentZero() { return 0; }

describe("SRE h) vivo × congelado", () => {
  const linhas = [linha(5, 2, 3), linha(400)];
  const g = { ...G, campanha: camp12, descontoTotalPerc: 2 };
  it("entradas e resultados idênticos; mudanças posteriores não mexem no congelado", () => {
    const vivo = montarEntradas(linhas, CAT, PRM, taxFn);
    const snap = congelar(vivo, g, "Joinville", "u", T);
    expect(entradasDoSnapshot(snap)).toEqual(vivo);
    const rc = computeCarrinhoSre(entradasDoSnapshot(snap), globaisDoSnapshot(snap), snap.comissaoTiers);
    expect(rc).toEqual(computeCarrinhoSre(vivo, g, T));
    const prm2 = paramsFromRows([{ key: "custo_hora_execucao", value: 140 }]);
    const vivo2 = computeCarrinhoSre(montarEntradas(linhas, CAT, prm2, taxFn), { ...g, comissaoFixaPerc: 5, irpjCsllPerc: 12, campanha: null }, T);
    const cong2 = computeCarrinhoSre(entradasDoSnapshot(snap), globaisDoSnapshot(snap), snap.comissaoTiers);
    expect(cong2.precoFinalTotal).toBe(rc.precoFinalTotal);
    expect(vivo2.precoFinalTotal).not.toBeCloseTo(rc.precoFinalTotal, 2);
    expect(globaisDoSnapshot(snap).campanha).toEqual(camp12);
  });
  it("código ITS-SRE", () => {
    expect(proximoCodigoSre(["ITS-SRE-20261030-004", null], new Date(2026, 9, 30))).toBe("ITS-SRE-20261030-005");
  });
});
