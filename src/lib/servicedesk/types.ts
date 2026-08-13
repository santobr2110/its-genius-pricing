import type { JanelaCobertura, PisoCobertura } from "./coberturaFTE";
import { DEFAULT_PISOS_COBERTURA } from "./coberturaFTE";
import type { CanalKey } from "./funilAtendimento";
import type { ItsmTipo, Modalidade } from "./regimeCusto";
import type {
  AtendimentoFaixa,
  AtendimentoPesos,
} from "./custoAtendimentoUM";
import {
  DEFAULT_ATENDIMENTO_FAIXAS,
  DEFAULT_ATENDIMENTO_PESOS,
  DEFAULT_ATENDIMENTO_PISO,
} from "./custoAtendimentoUM";
import { DEFAULT_CASCATA, type CascataPercentuais } from "./financeiroServiceDesk";
import { ROTINAS_SD_SEED, type RotinaSD } from "@/data/rotinasServiceDesk";

export type NivelSLA = "padrao" | "premium" | "critico";

export const SLA_LABEL: Record<NivelSLA, string> = {
  padrao: "Padrão",
  premium: "Premium",
  critico: "Crítico",
};

export interface SitePresencial {
  id: string;
  nome: string;
  cidade: string;
  headcount: number;
  adicionalMensal: number;
}

export interface ServiceDeskState extends CascataPercentuais {
  // Gate 1 — Modalidade
  modalidade: Modalidade;
  // Gate 2 — ITSM
  itsmTipo: ItsmTipo;
  fatorIneficiencia: number;
  custoIntegracaoOneTime: number;
  // Gate 3 — Cobertura
  janelaCobertura: JanelaCobertura;
  pisosCobertura: Record<JanelaCobertura, PisoCobertura>;
  horasMesFTE: number;
  // Gate 4 — Volume
  qtdUsuariosPadrao: number;
  qtdUsuariosVIP: number;
  qtdEstacoes: number;
  volumeBrutoMes: number;
  pctAutoatendimento: number;
  pctTriagem: number;
  produtividadeChamadosFTE: number;
  atendimentoPesos: AtendimentoPesos;
  atendimentoFaixas: AtendimentoFaixa[];
  atendimentoPiso: number;
  // Gate 5 — Escalonamento
  pctEscalonado: number;
  bolsaHorasEscalonamento: number;
  tempoMedioEscalonamentoH: number;
  valorHoraEscalonamento: number;
  horasMelhoria: number;
  // Gate 6 — Base de Conhecimento
  baseConhecimentoAtiva: boolean;
  baseConhecimentoSetup: number;
  baseConhecimentoHorasMes: number;
  // Gate 7 — Multicanal
  canais: CanalKey[];
  custoPorCanalAdicional: number;
  canaisInclusos: number;
  chatbotIA: boolean;
  chatbotIASetup: number;
  chatbotIAMensal: number;
  // Gate 8 — SLA
  nivelSLA: NivelSLA;
  fatoresSLA: Record<NivelSLA, number>;
  // Gate 8B — Rotinas preventivas
  rotinasAtivas: boolean;
  rotinas: RotinaSD[];
  // Gate 9 — Sites presenciais
  sites: SitePresencial[];
  custoFTEDedicadoAdicional: number;
}

export const DEFAULT_SERVICE_DESK_STATE: ServiceDeskState = {
  ...DEFAULT_CASCATA,
  modalidade: "remoto",
  itsmTipo: "selbetti",
  fatorIneficiencia: 1.3,
  custoIntegracaoOneTime: 12000,
  janelaCobertura: "comercial",
  pisosCobertura: DEFAULT_PISOS_COBERTURA,
  horasMesFTE: 176,
  qtdUsuariosPadrao: 500,
  qtdUsuariosVIP: 20,
  qtdEstacoes: 450,
  volumeBrutoMes: 900,
  pctAutoatendimento: 10,
  pctTriagem: 15,
  produtividadeChamadosFTE: 320,
  atendimentoPesos: DEFAULT_ATENDIMENTO_PESOS,
  atendimentoFaixas: DEFAULT_ATENDIMENTO_FAIXAS,
  atendimentoPiso: DEFAULT_ATENDIMENTO_PISO,
  pctEscalonado: 18,
  bolsaHorasEscalonamento: 80,
  tempoMedioEscalonamentoH: 1.2,
  valorHoraEscalonamento: 145,
  horasMelhoria: 8,
  baseConhecimentoAtiva: true,
  baseConhecimentoSetup: 8000,
  baseConhecimentoHorasMes: 12,
  canais: ["telefone", "portal", "email"],
  custoPorCanalAdicional: 1200,
  canaisInclusos: 3,
  chatbotIA: false,
  chatbotIASetup: 15000,
  chatbotIAMensal: 2500,
  nivelSLA: "padrao",
  fatoresSLA: { padrao: 1, premium: 1.12, critico: 1.25 },
  rotinasAtivas: false,
  rotinas: ROTINAS_SD_SEED,
  sites: [],
  custoFTEDedicadoAdicional: 800,
};