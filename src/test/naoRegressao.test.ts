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
