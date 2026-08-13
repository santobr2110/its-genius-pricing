/**
 * Funil de atendimento do Service Desk.
 *
 * volume bruto (por canal) → autoatendimento → triagem/N0 → N1 → escalonado (N2/N3)
 */

export type CanalKey = "telefone" | "portal" | "email" | "chat" | "whatsapp" | "teams";

export const CANAIS_ALL: CanalKey[] = ["telefone", "portal", "email", "chat", "whatsapp", "teams"];

export const CANAL_LABEL: Record<CanalKey, string> = {
  telefone: "Telefone",
  portal: "Portal de Autoatendimento",
  email: "E-mail",
  chat: "Chat",
  whatsapp: "WhatsApp",
  teams: "Microsoft Teams",
};

export interface FunilInput {
  /** Volume bruto mensal de contatos. */
  volumeBrutoMes: number;
  /** % desviado por autoatendimento / base de conhecimento. */
  pctAutoatendimento: number;
  /** % resolvido na triagem (N0 / bot). */
  pctTriagem: number;
  /** % dos chamados que chegam ao N1 e são escalonados. */
  pctEscalonado: number;
}

export interface FunilResultado {
  volumeBruto: number;
  desviadoAutoatendimento: number;
  resolvidoTriagem: number;
  chamadosN1: number;
  chamadosEscalonados: number;
  chamadosResolvidosN1: number;
  taxaDesvioTotalPct: number;
}

const clampPct = (v: number) => Math.min(100, Math.max(0, v || 0));

export function computeFunil(input: FunilInput): FunilResultado {
  const volumeBruto = Math.max(0, input.volumeBrutoMes || 0);
  const desviadoAutoatendimento = volumeBruto * (clampPct(input.pctAutoatendimento) / 100);
  const posAuto = volumeBruto - desviadoAutoatendimento;
  const resolvidoTriagem = posAuto * (clampPct(input.pctTriagem) / 100);
  const chamadosN1 = Math.max(0, posAuto - resolvidoTriagem);
  const chamadosEscalonados = chamadosN1 * (clampPct(input.pctEscalonado) / 100);
  const chamadosResolvidosN1 = Math.max(0, chamadosN1 - chamadosEscalonados);
  return {
    volumeBruto,
    desviadoAutoatendimento,
    resolvidoTriagem,
    chamadosN1,
    chamadosEscalonados,
    chamadosResolvidosN1,
    taxaDesvioTotalPct:
      volumeBruto > 0
        ? ((desviadoAutoatendimento + resolvidoTriagem) / volumeBruto) * 100
        : 0,
  };
}