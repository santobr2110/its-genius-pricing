/** Execuções por mês de cada frequência — tabela única para rotinas e GMUDs. */
export const FREQ_TO_EXECUCOES_MES = {
  Semanal: 4,
  Quinzenal: 2,
  Mensal: 1,
  Bimestral: 0.5,
  Trimestral: 1 / 3,
  Semestral: 1 / 6,
  Anual: 1 / 12,
} as const;
