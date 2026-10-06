// Modelo de Observabilidade em Níveis (M1–M4) + carga de coleta (NVPS).
// Coexiste com o modelo clássico (custoMonitoramentoUM.ts) — nunca somam juntos.

export type NivelObservabilidade = "M1" | "M2" | "M3" | "M4";
export type ModeloObservabilidade = "classico" | "niveis";

export interface NivelConfig {
  fatorPlataforma: number;
  pisoManutencao: number;
  usaModeloUM: boolean;
}

export interface ObsPesos {
  servidores: number;
  bancoDados: number;
  firewall: number;
  ativosRede: number;
}

export type ObsNvpsPorAtivo = ObsPesos;

export interface ObsFaixaVolume {
  de: number;
  ate: number;
  custoBaseUM: number;
}

export interface PorteAmbiente {
  nome: string;
  limiteSuperior: number;
  fatorCarga: number;
}

export interface ObsInventario {
  qtdServidores: number;
  qtdBancosDados: number;
  qtdSistemas: number; // Firewall
  qtdAtivosRede: number;
}

export const DEFAULT_OBS_PESOS: ObsPesos = { servidores: 1.0, bancoDados: 1.2, firewall: 0.7, ativosRede: 0.5 };
export const DEFAULT_OBS_NVPS: ObsNvpsPorAtivo = { servidores: 2.5, bancoDados: 2.0, firewall: 2.0, ativosRede: 3.5 };
export const DEFAULT_OBS_FAIXAS: ObsFaixaVolume[] = [
  { de: 0, ate: 50, custoBaseUM: 11.6 },
  { de: 50, ate: 150, custoBaseUM: 9.5 },
  { de: 150, ate: 300, custoBaseUM: 6.3 },
  { de: 300, ate: 600, custoBaseUM: 4.7 },
  { de: 600, ate: 100000, custoBaseUM: 2.2 },
];
export const DEFAULT_NIVEIS: Record<NivelObservabilidade, NivelConfig> = {
  M1: { fatorPlataforma: 0.65, pisoManutencao: 0.25, usaModeloUM: true },
  M2: { fatorPlataforma: 1.0, pisoManutencao: 0.4, usaModeloUM: true },
  M3: { fatorPlataforma: 1.1, pisoManutencao: 0.55, usaModeloUM: true },
  M4: { fatorPlataforma: 0, pisoManutencao: 0, usaModeloUM: false },
};
export const DEFAULT_PORTES: PorteAmbiente[] = [
  { nome: "Nano", limiteSuperior: 50, fatorCarga: 0.8 },
  { nome: "Micro", limiteSuperior: 100, fatorCarga: 0.9 },
  { nome: "Small", limiteSuperior: 250, fatorCarga: 1.0 },
  { nome: "Medium", limiteSuperior: 1000, fatorCarga: 1.12 },
  { nome: "Large", limiteSuperior: 2500, fatorCarga: 1.3 },
  { nome: "xLarge", limiteSuperior: 5000, fatorCarga: 1.55 },
  { nome: "2xLarge", limiteSuperior: 10000, fatorCarga: 1.85 },
];
export const DEFAULT_OBS_CUSTO_HORA = 90;
export const DEFAULT_OBS_CUSTO_PROXY = 35;

export const NIVEL_INFO: Record<NivelObservabilidade, { titulo: string; pergunta: string }> = {
  M1: { titulo: "Infraestrutura & Disponibilidade", pergunta: "O ambiente está no ar e saudável?" },
  M2: { titulo: "Aplicações & Dados", pergunta: "O que está funcionando ou degradando?" },
  M3: { titulo: "Serviço Ponta a Ponta", pergunta: "Qual serviço foi impactado e onde está a origem?" },
  M4: { titulo: "Observabilidade Avançada & APM", pergunta: "O que acontece dentro da aplicação?" },
};

/** Piso mínimo de nível por camada (M4 nunca é piso). */
export const PISO_NIVEL_POR_CAMADA: Record<string, NivelObservabilidade> = {
  Monitor: "M1",
  Flow: "M1",
  Operation: "M2",
  Performance: "M3",
  Enterprise: "M3",
};

const ORDEM: Record<NivelObservabilidade, number> = { M1: 1, M2: 2, M3: 3, M4: 4 };
/** True se o nível escolhido está abaixo do piso. M4 sempre atende. */
export function nivelAbaixoDoPiso(nivel: NivelObservabilidade, piso: NivelObservabilidade): boolean {
  if (nivel === "M4") return false;
  return ORDEM[nivel] < ORDEM[piso];
}

export function computeObsUMTotal(inv: ObsInventario, pesos: ObsPesos): number {
  return (
    (inv.qtdServidores || 0) * (pesos.servidores || 0) +
    (inv.qtdBancosDados || 0) * (pesos.bancoDados || 0) +
    (inv.qtdSistemas || 0) * (pesos.firewall || 0) +
    (inv.qtdAtivosRede || 0) * (pesos.ativosRede || 0)
  );
}

export function computeNvpsPrevisto(inv: ObsInventario, nvps: ObsNvpsPorAtivo, nvpsMedido?: number): number {
  if (nvpsMedido && nvpsMedido > 0) return nvpsMedido;
  return computeObsUMTotal(inv, nvps);
}

export function classificaPorte(nvpsPrevisto: number, portes: PorteAmbiente[]): PorteAmbiente {
  const lista = portes && portes.length ? portes : DEFAULT_PORTES;
  return lista.find((p) => p.limiteSuperior >= nvpsPrevisto) ?? lista[lista.length - 1];
}

export interface ObsParams {
  inv: ObsInventario;
  nivel: NivelObservabilidade;
  pesos?: ObsPesos;
  nvpsPorAtivo?: ObsNvpsPorAtivo;
  faixas?: ObsFaixaVolume[];
  niveis?: Record<NivelObservabilidade, NivelConfig>;
  portes?: PorteAmbiente[];
  nvpsMedido?: number;
  horas?: number;
  qtdProxies?: number;
  custoHora?: number;
  custoProxy?: number;
}

export interface ObsResultado {
  umTotal: number;
  nvpsPrevisto: number;
  nvpsOrigem: "medido" | "estimado";
  porte: PorteAmbiente;
  detalheFaixas: { faixa: ObsFaixaVolume; umAlocada: number; custo: number }[];
  custoFaixas: number;
  custoAntesCarga: number;
  fatorCarga: number;
  custoMonitoramento: number;
  custoHoras: number;
  custoProxies: number;
  custoTotal: number;
  custoMedioPorUM: number;
  foraDoModeloUM: boolean;
}

export function computeCustoObservabilidadeNiveis(p: ObsParams): ObsResultado {
  const pesos = p.pesos ?? DEFAULT_OBS_PESOS;
  const faixas = p.faixas ?? DEFAULT_OBS_FAIXAS;
  const niveis = p.niveis ?? DEFAULT_NIVEIS;
  const portes = p.portes ?? DEFAULT_PORTES;
  const cfg = niveis[p.nivel] ?? DEFAULT_NIVEIS[p.nivel];

  const umTotal = computeObsUMTotal(p.inv, pesos);
  const detalheFaixas = faixas.map((faixa) => {
    const umAlocada = Math.max(0, Math.min(umTotal, faixa.ate) - faixa.de);
    return { faixa, umAlocada, custo: umAlocada * (faixa.custoBaseUM || 0) };
  });
  const custoFaixas = detalheFaixas.reduce((s, d) => s + d.custo, 0);
  const custoAntesCarga = cfg.fatorPlataforma * custoFaixas + cfg.pisoManutencao * umTotal;
  const medido = (p.nvpsMedido ?? 0) > 0;
  const nvpsPrevisto = computeNvpsPrevisto(p.inv, p.nvpsPorAtivo ?? DEFAULT_OBS_NVPS, p.nvpsMedido);
  const porte = classificaPorte(nvpsPrevisto, portes);
  const foraDoModeloUM = !cfg.usaModeloUM || p.nivel === "M4";
  const custoMonitoramento = foraDoModeloUM ? 0 : custoAntesCarga * porte.fatorCarga;
  const custoHoras = Math.max(0, p.horas ?? 0) * Math.max(0, p.custoHora ?? DEFAULT_OBS_CUSTO_HORA);
  const custoProxies = Math.max(0, p.qtdProxies ?? 0) * Math.max(0, p.custoProxy ?? DEFAULT_OBS_CUSTO_PROXY);
  const custoTotal = custoMonitoramento + custoHoras + custoProxies;
  return {
    umTotal,
    nvpsPrevisto,
    nvpsOrigem: medido ? "medido" : "estimado",
    porte,
    detalheFaixas,
    custoFaixas,
    custoAntesCarga,
    fatorCarga: porte.fatorCarga,
    custoMonitoramento,
    custoHoras,
    custoProxies,
    custoTotal,
    custoMedioPorUM: umTotal > 0 ? custoMonitoramento / umTotal : 0,
    foraDoModeloUM,
  };
}

/**
 * Custo marginal de 1 UM adicional no modelo de níveis:
 * (tarifa da faixa atual × fatorPlataforma + pisoManutencao) × fatorCarga.
 */
export function computeCustoPorUMMarginalNiveis(
  umTotal: number,
  nivel: NivelObservabilidade,
  faixas: ObsFaixaVolume[],
  niveis: Record<NivelObservabilidade, NivelConfig>,
  fatorCarga: number,
): number {
  const cfg = niveis[nivel] ?? DEFAULT_NIVEIS[nivel];
  if (!cfg.usaModeloUM || nivel === "M4" || !faixas.length) return 0;
  const um = Math.max(0, umTotal);
  let tarifa = faixas[faixas.length - 1].custoBaseUM;
  if (um <= faixas[0].de) tarifa = faixas[0].custoBaseUM;
  else {
    const f = faixas.find((x) => um > x.de && um <= x.ate);
    if (f) tarifa = f.custoBaseUM;
  }
  return (tarifa * cfg.fatorPlataforma + cfg.pisoManutencao) * fatorCarga;
}
