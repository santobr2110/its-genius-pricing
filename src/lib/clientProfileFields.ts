/**
 * Campos do `itsm:calculator:v1` que NÃO são parâmetros do sistema
 * e sim entradas pontuais de uma precificação (Perfil de Cliente,
 * tier escolhido, horas selecionadas, etc.).
 *
 * Esses campos são removidos antes de salvar um perfil de parâmetros
 * e preservados quando um perfil é aplicado (não sobrescrevem o estado
 * atual da precificação em curso).
 */
import { SMART_ITO_NS } from "@/lib/offerings";

export const CALCULATOR_KEY = SMART_ITO_NS + "itsm:calculator:v1";

/** Campos do calculator que são "Perfil de Cliente" ou input pontual da precificação. */
export const CLIENT_PROFILE_CALCULATOR_FIELDS: ReadonlySet<string> = new Set([
  // Inventário
  "qtdUsuarios",
  "qtdEquipamentos",
  "qtdServidores",
  "qtdAtivosRede",
  "qtdBancosDados",
  "qtdSistemas",
  // Override de volume manual
  "semVolumesAtuais",
  "volumeChamadosAtivosManual",
  "volumeChamadosUsuariosManual",
  // Criticidade do ambiente (a escala em si é parâmetro: criticidadeEscala)
  "criticidadeNivel",
  // Complexidade do cliente (toggles)
  "complexVirtualizacaoCluster",
  "complexBancoDadosHA",
  "complexFirewallHA",
  "complexMultiSites",
  "complexSiteBackup",
  "complexHibridoCloudOnPrem",
  "complexOperacao24x7",
  "complexErpMercado",
  // Tiers selecionados nesta precificação
  "tierMonitor",
  "tierFlow",
  "tierOperation",
  "tierOperationN3",
  "tierPerformance",
  "tierEnterprise",
  "tierFieldOperation",
  "tierFieldPerformance",
  // Horas N3 escolhidas para esta precificação (min/max permanecem parâmetros)
  "horasN3Mensais",
  "horasN3Monitor",
  "horasN3MonitorManut",
  "horasN3Flow",
  "horasN3FlowManut",
  "horasN3Operation",
  "horasN3Performance",
  // Smart Monitor — quantidades escolhidas (custos e min/max permanecem parâmetros)
  "qtdAtendentesMonitor",
  "qtdProxysMonitor",
  // Smart Flow — quantidades escolhidas nesta precificação
  "qtdAtendentesFlow",
  "qtdProxysFlow",
  "itsmFlowSelected",
  // Field Service — quantidades escolhidas nesta precificação (modo direto)
  "fieldDirectQtdN1",
  "fieldDirectQtdN2",
  "fieldDirectQtdN3",
  // Fonte de demanda escolhida nesta precificação
  "demandSource",
]);

/**
 * Filtra um payload de parâmetros removendo, dentro do bloco do calculator,
 * os campos classificados como Perfil de Cliente / inputs pontuais.
 * Demais chaves do payload são mantidas intactas.
 */
export function stripClientProfileFields(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const calc = payload[CALCULATOR_KEY];
  if (!calc || typeof calc !== "object" || Array.isArray(calc)) return payload;
  const filteredCalc: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(calc as Record<string, unknown>)) {
    if (CLIENT_PROFILE_CALCULATOR_FIELDS.has(k)) continue;
    filteredCalc[k] = v;
  }
  return { ...payload, [CALCULATOR_KEY]: filteredCalc };
}
