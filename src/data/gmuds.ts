export type GmudTipo = "Padrão" | "Normal" | "Emergencial";
export type GmudComplexidade = "Baixa" | "Média" | "Alta";
export type GmudOferta = "Operation" | "Performance" | "Ambas";

export const GMUD_TIPOS: GmudTipo[] = ["Padrão", "Normal", "Emergencial"];
export const GMUD_COMPLEXIDADES: GmudComplexidade[] = ["Baixa", "Média", "Alta"];
export const GMUD_OFERTAS: GmudOferta[] = ["Operation", "Performance", "Ambas"];

export const CAC_FACTOR_GMUD = 0.2;

export interface Gmud {
  id: string;
  tipo: GmudTipo;
  descricao: string;
  complexidade: GmudComplexidade;
  oferta: GmudOferta;
  chamadosMes: number;
  cac: number;
}

const g = (
  id: string,
  tipo: GmudTipo,
  descricao: string,
  complexidade: GmudComplexidade,
  oferta: GmudOferta,
  chamadosMes: number,
): Gmud => ({
  id,
  tipo,
  descricao,
  complexidade,
  oferta,
  chamadosMes,
  cac: +(chamadosMes * CAC_FACTOR_GMUD).toFixed(4),
});

export const GMUDS_DEFAULT: Gmud[] = [
  g("gmud-1", "Padrão", "Aplicação de patches/atualizações pré-aprovadas", "Baixa", "Operation", 4),
  g("gmud-2", "Padrão", "Reinicialização programada de serviços", "Baixa", "Operation", 2),
  g("gmud-3", "Normal", "Mudança de configuração em servidores", "Média", "Operation", 2),
  g("gmud-4", "Normal", "Atualização de regras de Firewall", "Média", "Performance", 1),
  g("gmud-5", "Normal", "Implantação de nova aplicação ou serviço", "Alta", "Performance", 0.5),
  g("gmud-6", "Emergencial", "Correção crítica de incidente em produção", "Alta", "Ambas", 0.5),
];