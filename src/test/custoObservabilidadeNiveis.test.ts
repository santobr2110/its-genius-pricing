import { describe, it, expect } from "vitest";
import { computeCustoObservabilidadeNiveis } from "@/lib/custoObservabilidadeNiveis";
import {
  computeCustoMonitoramentoTotal, DEFAULT_MONITOR_FAIXAS, DEFAULT_MONITOR_PESOS,
} from "@/lib/custoMonitoramentoUM";
import { computeITSMResults, ITSM_DEFAULTS, type ITSMState } from "@/hooks/useITSMCalculator";

const inv = { qtdServidores: 802, qtdBancosDados: 8, qtdSistemas: 23, qtdAtivosRede: 198 };

describe("Observabilidade em níveis", () => {
  it("benchmark oficial", () => {
    const m2 = computeCustoObservabilidadeNiveis({ inv, nivel: "M2", horas: 10, qtdProxies: 20 });
    expect(m2.umTotal).toBeCloseTo(926.7, 1);
    expect(m2.nvpsPrevisto).toBeCloseTo(2760, 0);
    expect(m2.porte.nome).toBe("xLarge");
    expect(m2.fatorCarga).toBe(1.55);
    expect(m2.custoFaixas).toBeCloseTo(4603.74, 1);
    expect(m2.custoTotal).toBeCloseTo(9310.35, 1);
    const m3 = computeCustoObservabilidadeNiveis({ inv, nivel: "M3", horas: 10, qtdProxies: 20 });
    expect(m3.custoTotal).toBeCloseTo(10239.39, 1);
  });

  it("M4 zera monitoramento e preserva horas e proxies", () => {
    const r = computeCustoObservabilidadeNiveis({ inv, nivel: "M4", horas: 10, qtdProxies: 20 });
    expect(r.custoMonitoramento).toBe(0);
    expect(r.foraDoModeloUM).toBe(true);
    expect(r.custoTotal).toBe(1600);
  });

  it("NVPS medido sobrescreve a estimativa", () => {
    const r = computeCustoObservabilidadeNiveis({ inv, nivel: "M2", nvpsMedido: 1500 });
    expect(r.porte.nome).toBe("Large");
    expect(r.nvpsOrigem).toBe("medido");
  });

  const base: ITSMState = { ...ITSM_DEFAULTS, tierMonitor: true, horasN3MonitorManut: 5, qtdProxysMonitor: 3, valorProxyInicial: 100, valorProxyAdicional: 50 };

  it("não regressão do modelo clássico", () => {
    const r = computeITSMResults({ ...base, modeloObservabilidade: "classico" });
    const ref = computeCustoMonitoramentoTotal(
      { qtdServidores: base.qtdServidores, qtdBancosDados: base.qtdBancosDados, qtdSistemas: base.qtdSistemas, qtdAtivosRede: base.qtdAtivosRede },
      DEFAULT_MONITOR_PESOS, DEFAULT_MONITOR_FAIXAS, 0,
    );
    expect(r.smartMonitor.custoMonitoramento).toBeCloseTo(ref.custoTotal, 6);
  });

  it("isolamento entre modelos", () => {
    const niv = { ...base, modeloObservabilidade: "niveis" as const };
    const a = computeITSMResults(niv).custoTotalOperacao;
    const b = computeITSMResults({ ...niv, horasN3MonitorManut: 30, qtdProxysMonitor: 5 }).custoTotalOperacao;
    expect(b).toBeCloseTo(a, 6);
    const cla = { ...base, modeloObservabilidade: "classico" as const };
    const c = computeITSMResults(cla).custoTotalOperacao;
    const d = computeITSMResults({ ...cla, obsHorasManutencao: 50, obsQtdProxies: 30 }).custoTotalOperacao;
    expect(d).toBeCloseTo(c, 6);
  });
});
