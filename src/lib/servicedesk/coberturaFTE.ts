/**
 * Piso mínimo de cobertura por janela de atendimento.
 *
 * Regra vinculante: o FTE contratado é sempre o MAIOR entre o FTE
 * calculado por volume e o piso mínimo da janela — nunca o menor.
 */

export type JanelaCobertura = "comercial" | "estendida" | "24x7";

export const JANELA_LABEL: Record<JanelaCobertura, string> = {
  comercial: "Comercial (8x5)",
  estendida: "Estendida (12x6)",
  "24x7": "24x7",
};

export interface PisoCobertura {
  /** Piso mínimo de FTE para manter a janela coberta. */
  min: number;
  /** Teto de referência do dimensionamento (informativo / alerta). */
  max: number;
}

export const DEFAULT_PISOS_COBERTURA: Record<JanelaCobertura, PisoCobertura> = {
  comercial: { min: 2, max: 40 },
  estendida: { min: 4, max: 60 },
  "24x7": { min: 6, max: 80 },
};

export interface CoberturaResultado {
  fteVolume: number;
  ftePiso: number;
  fteMax: number;
  fteContratado: number;
  pisoAplicado: boolean;
  acimaDoMax: boolean;
}

export function resolveCoberturaFTE(
  fteVolume: number,
  janela: JanelaCobertura,
  pisos: Record<JanelaCobertura, PisoCobertura>,
): CoberturaResultado {
  const cfg = pisos?.[janela] ?? DEFAULT_PISOS_COBERTURA[janela];
  const v = Math.max(0, fteVolume || 0);
  const min = Math.max(0, cfg?.min ?? 0);
  const max = Math.max(0, cfg?.max ?? 0);
  const fteContratado = Math.max(v, min);
  return {
    fteVolume: v,
    ftePiso: min,
    fteMax: max,
    fteContratado,
    pisoAplicado: min > v,
    acimaDoMax: max > 0 && fteContratado > max,
  };
}