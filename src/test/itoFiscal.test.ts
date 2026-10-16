import { describe, expect, it } from "vitest";
import { ITSM_DEFAULTS, computeITSMResults } from "@/hooks/useITSMCalculator";
import { COMPOSICOES_ITO, aplicarFiscalITO, composicaoFiscalITO, deveAplicarFiscalITO, resolverFiscalITO, type FiscalSnapshotITO } from "@/lib/pricing/itoFiscal";
import { aliquotasEfetivas, type TaxCode } from "@/lib/pricing/taxRates";
import { PISO_NIVEL_POR_CAMADA } from "@/lib/custoObservabilidadeNiveis";
import { mergeCalculatorWithParameterPayload } from "@/lib/presetPricingParams";
import { CALCULATOR_KEY, stripClientProfileFields } from "@/lib/clientProfileFields";

const state = { ...ITSM_DEFAULTS, modeloObservabilidade: "niveis" as const, nivelObservabilidade: "M3" as const, tierMonitor: true, tierFlow: true, tierOperation: true, tierPerformance: false, tierEnterprise: false };
const fiscal: FiscalSnapshotITO = { composicao: "Operation.M3", codigo: "TMP-123", sku: "SELB - ITS - SERV - ITO - SMART OPERATION - M3", municipio: "Joinville", dataRef: "2026-10-16", pisPerc: 0.65, cofinsPerc: 3, issPerc: 2 };
describe("Vinculação fiscal Smart ITO", () => {
  it("cadastra exatamente as 17 combinações autorizadas", () => {
    expect(COMPOSICOES_ITO.map((c) => c.key)).toEqual(["Monitor.M1", "Monitor.M2", "Monitor.M3", "Monitor.M4", "Flow.M1", "Flow.M2", "Flow.M3", "Flow.M4", "Operation.M2", "Operation.M3", "Operation.M4", "Performance.M2", "Performance.M3", "Performance.M4", "Enterprise.M2", "Enterprise.M3", "Enterprise.M4"]);
  });
  it("usa apenas a camada ativa mais alta", () => {
    expect(composicaoFiscalITO(state)).toBe("Operation.M3");
    expect(composicaoFiscalITO({ ...state, tierEnterprise: true })).toBe("Enterprise.M3");
    expect(composicaoFiscalITO({ ...state, tierOperation: false })).toBe("Flow.M3");
  });
  it("libera M2 em Performance e Enterprise sem liberar M1", () => {
    expect(PISO_NIVEL_POR_CAMADA.Performance).toBe("M2");
    expect(PISO_NIVEL_POR_CAMADA.Enterprise).toBe("M2");
    expect(composicaoFiscalITO({ ...state, nivelObservabilidade: "M1" })).toBeNull();
  });
  it("herda PIS COFINS e ISS do serviço 1.07", () => {
    const codes: TaxCode[] = [{ id: "p", codigo: "TMP-123", nome: fiscal.sku, descricao: null, lc116_item: "1.07", ativo: true, a_confirmar: false, ofertas: ["smart-ito"], service_code_id: "s", usa_aliquota_propria: false }];
    const rates = aliquotasEfetivas(codes, [], [{ id: "s", lc116_item: "1.07", descricao: null, pis_perc: 0.65, cofins_perc: 3, ativo: true, a_confirmar: false }], [{ id: "iss", service_code_id: "s", municipio: "Joinville", iss_perc: 2, vigencia_inicio: "2000-01-01", vigencia_fim: null, a_confirmar: false }]);
    expect(resolverFiscalITO(state, { "Operation.M3": "TMP-123" }, "Joinville", "2026-10-16", codes, rates)).toEqual(fiscal);
    expect(resolverFiscalITO(state, { "Operation.M3": "TMP-123" }, "Cidade sem cadastro", "2026-10-16", codes, rates)).toBeNull();
  });
  it("não altera cotações antigas nem snapshots por mudança do cadastro", () => {
    expect(deveAplicarFiscalITO(state, fiscal, true)).toBe(false);
    const frozen = aplicarFiscalITO(state, fiscal);
    expect(deveAplicarFiscalITO(frozen, { ...fiscal, issPerc: 5 }, true)).toBe(false);
    expect(deveAplicarFiscalITO(frozen, { ...fiscal, composicao: "Enterprise.M3" }, true)).toBe(true);
    expect(deveAplicarFiscalITO(frozen, { ...fiscal, issPerc: 5 }, false)).toBe(true);
  });
  it("mantém o modelo clássico sem vinculação por nível", () => {
    expect(composicaoFiscalITO({ ...state, modeloObservabilidade: "classico" })).toBeNull();
  });
  it("aplica impostos ao divisor de venda sem mudar custos", () => {
    const next = aplicarFiscalITO({ ...state, pisPerc: 1, cofinsPerc: 7, issPerc: 5 }, fiscal);
    const result = computeITSMResults(next);
    expect(result.custoTotalOperacao).toBe(computeITSMResults(state).custoTotalOperacao);
    const soma = 0.65 + 3 + 2 + next.irpjCsllPerc + next.encFinancPerc + next.comissaoPerc + next.lucroPerc;
    expect(result.precoVendaMensal).toBeCloseTo(result.custoTotalOperacao / (1 - soma / 100), 6);
  });
  it("não deixa perfil padrão sobrescrever impostos congelados ou copiar SKU", () => {
    const frozen = aplicarFiscalITO(state, fiscal);
    const perfil = { [CALCULATOR_KEY]: { pisPerc: 9, cofinsPerc: 9, issPerc: 9, fiscalITO: fiscal } };
    const merged = mergeCalculatorWithParameterPayload(frozen, perfil);
    expect([merged.pisPerc, merged.cofinsPerc, merged.issPerc]).toEqual([0.65, 3, 2]);
    expect(mergeCalculatorWithParameterPayload(state, perfil).fiscalITO).toBeUndefined();
    expect((stripClientProfileFields({ [CALCULATOR_KEY]: frozen })[CALCULATOR_KEY] as Record<string, unknown>).fiscalITO).toBeUndefined();
  });
});