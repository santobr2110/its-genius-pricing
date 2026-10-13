// Snapshots de NÃO-REGRESSÃO: congelam os resultados atuais de Smart ITO, BodyShop e
// Observabilidade M1–M4. Qualquer mudança nesses números quebra o teste.
import { describe, it, expect } from "vitest";
import { computeITSMResults, ITSM_DEFAULTS, type ITSMState } from "@/hooks/useITSMCalculator";
import { recomputeComposicaoComExtras } from "@/lib/extrasOperacionais";
import { calcularPrecificacao } from "@/lib/profissionais/calc";
import { computeCustoObservabilidadeNiveis } from "@/lib/custoObservabilidadeNiveis";

const inv = { qtdServidores: 120, qtdBancosDados: 8, qtdSistemas: 6, qtdAtivosRede: 40 };
const base: ITSMState = { ...ITSM_DEFAULTS, ...inv };
const round = (o: unknown) => JSON.parse(JSON.stringify(o, (_k, v) => (typeof v === "number" ? Math.round(v * 1e4) / 1e4 : v)));
const pick = (r: ReturnType<typeof computeITSMResults>) => round({
  custoTotalOperacao: r.custoTotalOperacao, precoVendaMensal: r.precoVendaMensal, composicaoPreco: r.composicaoPreco,
});

const CAMADAS: Record<string, Partial<ITSMState>> = {
  monitor: { tierMonitor: true, tierFlow: false, tierOperation: false, tierPerformance: false },
  flow: { tierMonitor: true, tierFlow: true, tierOperation: false, tierPerformance: false },
  operation: { tierMonitor: true, tierFlow: true, tierOperation: true, tierPerformance: false },
  performance: { tierMonitor: true, tierFlow: true, tierOperation: true, tierPerformance: true },
};

describe("não-regressão Smart ITO", () => {
  for (const [nome, tiers] of Object.entries(CAMADAS)) {
    it(`${nome} sem extras`, () => {
      expect(pick(computeITSMResults({ ...base, ...tiers }))).toMatchSnapshot();
    });
    it(`${nome} com extras`, () => {
      const s = { ...base, ...tiers };
      expect(pick(recomputeComposicaoComExtras(s, computeITSMResults(s), 2500))).toMatchSnapshot();
    });
  }
});

describe("não-regressão BodyShop", () => {
  const input = { salario: 12000, encargosPct: 80, overheadPct: 15, horasMensais: 168, markupDivisorPct: 43.27 };
  it("sem extras", () => expect(round(calcularPrecificacao(input))).toMatchSnapshot());
  it("com extras (benefício)", () => expect(round(calcularPrecificacao({ ...input, beneficio: 1500 }))).toMatchSnapshot());
});

describe("não-regressão Observabilidade M1–M4", () => {
  for (const nivel of ["M1", "M2", "M3", "M4"] as const) {
    it(nivel, () => {
      const r = computeCustoObservabilidadeNiveis({ inv, nivel, horas: 10, qtdProxies: 3 });
      expect(round({ ...r, detalheFaixas: undefined })).toMatchSnapshot();
    });
  }
});

// ---- Fase 1B: cenários adicionais congelados ANTES da migração para computeCascata ----
import { computeComposicao, PROF_FIN_DEFAULTS } from "@/hooks/useProfFinanceiro";

describe("não-regressão Fase 1B — bordas de Σ", () => {
  const altos = { pisPerc: 30, cofinsPerc: 30, issPerc: 20, comissaoPerc: 10, irpjCsllPerc: 5, encFinancPerc: 3, lucroPerc: 2 }; // Σ = 100
  it("Smart ITO Σ = 100 (sem preço)", () => {
    const s = { ...base, ...CAMADAS.operation, ...altos };
    expect(pick(computeITSMResults(s))).toMatchSnapshot();
    expect(pick(recomputeComposicaoComExtras(s, computeITSMResults(s), 2500))).toMatchSnapshot();
  });
  it("Smart ITO Σ = 99,5", () => {
    const s = { ...base, ...CAMADAS.flow, ...altos, lucroPerc: 1.5 };
    expect(pick(recomputeComposicaoComExtras(s, computeITSMResults(s), 777))).toMatchSnapshot();
  });
  it("Smart ITO percentuais negativos/NaN viram 0", () => {
    const s = { ...base, ...CAMADAS.monitor, pisPerc: -5, cofinsPerc: NaN as unknown as number };
    expect(pick(computeITSMResults(s))).toMatchSnapshot();
  });
  it("BodyShop teto 99 (Σ 120 e Σ negativo)", () => {
    const input = { salario: 9000, encargosPct: 70, overheadPct: 10, horasMensais: 160 };
    expect(round(calcularPrecificacao({ ...input, markupDivisorPct: 120 }))).toMatchSnapshot();
    expect(round(calcularPrecificacao({ ...input, markupDivisorPct: -10 }))).toMatchSnapshot();
    expect(round(calcularPrecificacao({ ...input, markupDivisorPct: 99.5, beneficio: 800 }))).toMatchSnapshot();
  });
  it("BodyShop composição financeira (defaults, Σ alto, negativos)", () => {
    expect(round(computeComposicao(PROF_FIN_DEFAULTS, 25000))).toMatchSnapshot();
    expect(round(computeComposicao({ ...PROF_FIN_DEFAULTS, lucroPerc: 95 }, 25000))).toMatchSnapshot();
    expect(round(computeComposicao({ ...PROF_FIN_DEFAULTS, pisPerc: -2, comissaoPerc: 0 }, 18000))).toMatchSnapshot();
    expect(round(computeComposicao(PROF_FIN_DEFAULTS, 0))).toMatchSnapshot();
  });
});
