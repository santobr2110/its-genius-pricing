/**
 * Catálogo semente de rotinas preventivas de microinformática do
 * Smart Service Desk (Gate 8B — opcional).
 *
 * Mesma estrutura conceitual do catálogo do Smart ITO:
 *  frequência → chamados/mês, fator CAC, automação e horas de execução.
 */

export type FrequenciaSD =
  | "Semanal"
  | "Quinzenal"
  | "Mensal"
  | "Bimestral"
  | "Trimestral"
  | "Semestral"
  | "Anual";

export const FREQUENCIAS_SD: FrequenciaSD[] = [
  "Semanal",
  "Quinzenal",
  "Mensal",
  "Bimestral",
  "Trimestral",
  "Semestral",
  "Anual",
];

export const FREQ_SD_TO_CHAMADOS: Record<FrequenciaSD, number> = {
  Semanal: 4,
  Quinzenal: 2,
  Mensal: 1,
  Bimestral: 0.5,
  Trimestral: 0.3,
  Semestral: 0.2,
  Anual: 0.1,
};

/** Fator CAC (Custo Adicional de Coordenação) aplicado às rotinas. */
export const CAC_FACTOR_SD = 0.2;

/** Abrangência da rotina: por ambiente (uma vez) ou por estação/usuário. */
export type AbrangenciaSD = "Ambiente" | "Estação" | "Usuário";

/** Nível: rotinas "Base" consomem a bolsa de horas; "Avançado" são cobradas à parte. */
export type NivelRotinaSD = "Base" | "Avançado";

export interface RotinaSD {
  id: string;
  grupo: string;
  rotina: string;
  descricao?: string;
  frequencia: FrequenciaSD;
  abrangencia: AbrangenciaSD;
  nivel: NivelRotinaSD;
  /** Horas de execução por ocorrência. */
  horasExecucao: number;
  /** 0 a 100 — quanto maior, menor o esforço humano. */
  automacaoPct: number;
}

export const ROTINAS_SD_SEED: RotinaSD[] = [
  { id: "sd-r01", grupo: "Estação de Trabalho", rotina: "Verificação de atualizações do sistema operacional", frequencia: "Mensal", abrangencia: "Estação", nivel: "Base", horasExecucao: 0.25, automacaoPct: 70 },
  { id: "sd-r02", grupo: "Estação de Trabalho", rotina: "Limpeza de disco e temporários", frequencia: "Mensal", abrangencia: "Estação", nivel: "Base", horasExecucao: 0.2, automacaoPct: 80 },
  { id: "sd-r03", grupo: "Segurança", rotina: "Validação de antivírus / EDR ativo e atualizado", frequencia: "Semanal", abrangencia: "Estação", nivel: "Base", horasExecucao: 0.15, automacaoPct: 85 },
  { id: "sd-r04", grupo: "Segurança", rotina: "Revisão de contas de usuário e acessos", frequencia: "Mensal", abrangencia: "Ambiente", nivel: "Base", horasExecucao: 3, automacaoPct: 30 },
  { id: "sd-r05", grupo: "Backup", rotina: "Conferência de backup de perfis e OneDrive", frequencia: "Mensal", abrangencia: "Usuário", nivel: "Base", horasExecucao: 0.15, automacaoPct: 60 },
  { id: "sd-r06", grupo: "Inventário", rotina: "Atualização de inventário de hardware e software", frequencia: "Mensal", abrangencia: "Ambiente", nivel: "Base", horasExecucao: 4, automacaoPct: 50 },
  { id: "sd-r07", grupo: "Licenciamento", rotina: "Conciliação de licenças de software", frequencia: "Trimestral", abrangencia: "Ambiente", nivel: "Avançado", horasExecucao: 6, automacaoPct: 20 },
  { id: "sd-r08", grupo: "Estação de Trabalho", rotina: "Manutenção preventiva de imagem padrão (golden image)", frequencia: "Trimestral", abrangencia: "Ambiente", nivel: "Avançado", horasExecucao: 8, automacaoPct: 25 },
  { id: "sd-r09", grupo: "Impressão", rotina: "Verificação de filas e drivers de impressão", frequencia: "Mensal", abrangencia: "Ambiente", nivel: "Base", horasExecucao: 2, automacaoPct: 40 },
  { id: "sd-r10", grupo: "Colaboração", rotina: "Saúde de caixas postais e grupos de distribuição", frequencia: "Mensal", abrangencia: "Ambiente", nivel: "Base", horasExecucao: 2.5, automacaoPct: 45 },
  { id: "sd-r11", grupo: "Experiência do Usuário", rotina: "Pesquisa de satisfação e plano de ação", frequencia: "Mensal", abrangencia: "Ambiente", nivel: "Avançado", horasExecucao: 5, automacaoPct: 20 },
  { id: "sd-r12", grupo: "Melhoria Contínua", rotina: "Análise de chamados recorrentes e problem management", frequencia: "Mensal", abrangencia: "Ambiente", nivel: "Avançado", horasExecucao: 8, automacaoPct: 10 },
];