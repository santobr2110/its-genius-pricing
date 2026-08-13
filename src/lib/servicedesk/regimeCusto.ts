/**
 * Regime de custo do Smart Service Desk.
 *
 * Resolve, a partir da modalidade (Gate 1) e do tipo de ITSM (Gate 2),
 * como o custo da equipe é apropriado:
 *  - pool          → rateio puro na operação compartilhada
 *  - semidedicado  → fração do pool "pesada" (eficiência reduzida)
 *  - dedicado      → headcount fixo por site, sem diluição
 */

export type Modalidade = "remoto" | "presencial" | "hibrido";
export type ItsmTipo = "selbetti" | "cliente-integrado" | "cliente-sem-integracao";
export type RegimeCusto = "pool" | "semidedicado" | "dedicado";

export const MODALIDADE_LABEL: Record<Modalidade, string> = {
  remoto: "Remoto",
  presencial: "Presencial",
  hibrido: "Híbrido",
};

export const ITSM_TIPO_LABEL: Record<ItsmTipo, string> = {
  selbetti: "ITSM Selbetti",
  "cliente-integrado": "ITSM do cliente (integrado)",
  "cliente-sem-integracao": "ITSM do cliente (sem integração)",
};

export const REGIME_LABEL: Record<RegimeCusto, string> = {
  pool: "Rateio (pool)",
  semidedicado: "Semidedicado",
  dedicado: "Dedicado",
};

export interface RegimeInput {
  modalidade: Modalidade;
  itsmTipo: ItsmTipo;
}

export function resolveRegimeCusto({ modalidade, itsmTipo }: RegimeInput): RegimeCusto {
  if (modalidade !== "remoto") return "dedicado";
  if (itsmTipo === "cliente-sem-integracao") return "semidedicado";
  return "pool";
}

/** Multiplicador aplicado ao custo de equipe conforme o regime resolvido. */
export function fatorRegime(regime: RegimeCusto, fatorIneficiencia: number): number {
  if (regime === "semidedicado") return Math.max(1, fatorIneficiencia || 1);
  return 1;
}

export function regimeExplicacao(regime: RegimeCusto): string {
  switch (regime) {
    case "pool":
      return "Equipe compartilhada: o custo é rateado pelo volume atendido.";
    case "semidedicado":
      return "Time opera na ferramenta do cliente sem integração — fração do pool com penalização de eficiência.";
    case "dedicado":
      return "Há componente presencial: headcount fixo por site, sem diluição no pool.";
  }
}