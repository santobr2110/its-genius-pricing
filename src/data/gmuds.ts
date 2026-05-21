export type GmudTipo = "Padrão" | "Normal" | "Emergencial";
export type GmudComplexidade = "Baixa" | "Média" | "Alta";
export type GmudOferta = "Operation" | "Performance" | "Ambas";
export type GmudFrequencia =
  | "Semanal"
  | "Quinzenal"
  | "Mensal"
  | "Bimestral"
  | "Trimestral"
  | "Semestral"
  | "Anual";

export const GMUD_TIPOS: GmudTipo[] = ["Padrão", "Normal", "Emergencial"];
export const GMUD_COMPLEXIDADES: GmudComplexidade[] = ["Baixa", "Média", "Alta"];
export const GMUD_OFERTAS: GmudOferta[] = ["Operation", "Performance", "Ambas"];
export const GMUD_FREQUENCIAS: GmudFrequencia[] = [
  "Semanal",
  "Quinzenal",
  "Mensal",
  "Bimestral",
  "Trimestral",
  "Semestral",
  "Anual",
];

// Conversão de frequência para chamados/mês equivalentes.
export const GMUD_FREQ_TO_CHAMADOS: Record<GmudFrequencia, number> = {
  Semanal: 4,
  Quinzenal: 2,
  Mensal: 1,
  Bimestral: 0.5,
  Trimestral: 1 / 3,
  Semestral: 1 / 6,
  Anual: 1 / 12,
};

export const CAC_FACTOR_GMUD = 0.2;

export interface Gmud {
  id: string;
  tipo: GmudTipo;
  descricao: string;
  complexidade: GmudComplexidade;
  oferta: GmudOferta;
  frequencia: GmudFrequencia;
  chamadosMes: number;
  cac: number;
}

const g = (
  id: string,
  tipo: GmudTipo,
  descricao: string,
  complexidade: GmudComplexidade,
  oferta: GmudOferta,
  frequencia: GmudFrequencia,
): Gmud => {
  const chamadosMes = GMUD_FREQ_TO_CHAMADOS[frequencia];
  return {
    id,
    tipo,
    descricao,
    complexidade,
    oferta,
    frequencia,
    chamadosMes,
    cac: +(chamadosMes * CAC_FACTOR_GMUD).toFixed(4),
  };
};

export const GMUDS_DEFAULT: Gmud[] = [
  g("gmud-1", "Padrão", "Aplicação de patches/atualizações pré-aprovadas", "Baixa", "Operation", "Semanal"),
  g("gmud-2", "Padrão", "Reinicialização programada de serviços", "Baixa", "Operation", "Quinzenal"),
  g("gmud-3", "Normal", "Mudança de configuração em servidores", "Média", "Operation", "Quinzenal"),
  g("gmud-4", "Normal", "Atualização de regras de Firewall", "Média", "Performance", "Mensal"),
  g("gmud-5", "Normal", "Implantação de nova aplicação ou serviço", "Alta", "Performance", "Bimestral"),
  g("gmud-6", "Emergencial", "Correção crítica de incidente em produção", "Alta", "Ambas", "Bimestral"),
];