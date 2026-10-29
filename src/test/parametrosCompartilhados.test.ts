import { describe, it, expect } from "vitest";
import { irpjEfetivo, parametrosFinanceiros } from "@/lib/pricing/parametrosCompartilhados";
import { composicaoSmartITO, computeCascata } from "@/lib/pricing/cascata";
import { decomporVenda } from "@/lib/pricing/chegada";
import { globaisDoSnapshot, congelar } from "@/lib/zabbix/carrinho";

describe("Parâmetros corporativos separados da rentabilidade", () => {
  it("adota IRPJ/CSLL 10,34% para todas as novas contas", () => {
    const central = parametrosFinanceiros(null);
    expect(central.irpjCsllPerc).toBe(10.34);
    const p = { pis: 0, cofins: 0, iss: 0, comissao: 0, irpjCsll: central.irpjCsllPerc, encFinanc: 0, lucro: 20 };
    const ito = composicaoSmartITO(1000, p);
    expect(ito.composicao.irpjCsll / ito.precoVenda * 100).toBeCloseTo(10.34, 10);
    const subida = computeCascata(1000, { pisPerc: 0, cofinsPerc: 0, issPerc: 0, comissaoPerc: 0, irpjCsllPerc: central.irpjCsllPerc, encFinancPerc: 0, lucroPerc: 20 });
    expect(subida.irpjCsll / subida.precoVenda * 100).toBeCloseTo(10.34, 10);
    const chegada = decomporVenda(1000, 2000, 0, { pisPerc: 0, cofinsPerc: 0, issPerc: 0, irpjCsllPerc: central.irpjCsllPerc, encFinancPerc: 0, retencaoPerc: 0 }, [], 0);
    expect(chegada.rentabilidadePerc).toBeCloseTo(39.66, 10);
  });
  it("alterar rentabilidade não altera o percentual de imposto", () => {
    const p = { pis: 0, cofins: 0, iss: 0, comissao: 0, irpjCsll: 10.34, encFinanc: 0, lucro: 20 };
    const a = composicaoSmartITO(1000, p), b = composicaoSmartITO(1000, { ...p, lucro: 30 });
    expect(a.composicao.irpjCsll / a.precoVenda).toBeCloseTo(b.composicao.irpjCsll / b.precoVenda, 10);
    expect(b.composicao.lucro / b.precoVenda).toBeCloseTo(0.30, 10);
    expect(a.precoVenda).not.toBe(b.precoVenda);
  });
  it("preserva imposto congelado de cotação antiga, inclusive zero", () => {
    expect(irpjEfetivo(10.34, 10.3)).toBe(10.3);
    expect(irpjEfetivo(10.34, 0)).toBe(0);
    expect(irpjEfetivo(10.34)).toBe(10.34);
  });
  it("congela a escala corporativa junto do imposto no Zabbix", () => {
    const g = { cenario: { temRO: true, pagamento30d: true }, comissaoFixaPerc: null, retencaoPerc: 0, irpjCsllPerc: 10.34, encFinancPerc: 0, descontoTotalPerc: 0 };
    const tiers = [{ minRent: 0, maxRent: null, comissao: 5 }];
    const snap = congelar([], g, "Joinville", 5, "u", 0, new Date("2026-10-29"), tiers);
    tiers[0].comissao = 9;
    expect(snap.comissaoTiers?.[0].comissao).toBe(5);
    expect(globaisDoSnapshot(snap).irpjCsllPerc).toBe(10.34);
  });
});