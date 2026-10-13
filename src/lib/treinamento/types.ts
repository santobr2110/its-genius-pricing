// Tipos do modelo de dados do Treinamento (Fase 2).

export type Fabricante = "zabbix" | "grafana";
export type TipoCurso = "curso" | "exame" | "combo" | "extra";
export type NivelInstrutor = "A" | "B";
export type StatusParam = "planilha" | "simulado" | "a_confirmar" | "decisao" | "reuso" | "proposta" | "confirmado";

export interface TrainingCourse {
  id: string;
  slug: string;
  fabricante: Fabricante;
  nome: string;
  tipo: TipoCurso;
  part_number_interno: string | null;
  catalog_product_id: string | null;
  horas_execucao: number;
  dias: number | null;
  nivel_instrutor: NivelInstrutor | null;
  valor_fabricante: number | null;
  custo_material_aluno: number;
  custo_cloud_aluno: number;
  min_alunos: number;
  max_alunos: number | null;
  preco_referencia_mercado: number | null;
  piso_preco_aluno: number | null;
  exame_course_id: string | null;
  prerequisito_course_id: string | null;
  permite_somente_exame: boolean;
  custo_pendente: boolean;
  campos_a_confirmar: string[];
  ativo: boolean;
  ordem: number;
}

export interface ModuloCronograma {
  titulo: string;
  topicos: string[];
  resumo?: string;
}

export interface TrainingCourseContent {
  course_id: string;
  tagline: string | null;
  descricao: string | null;
  produtos_cobertos: string | null;
  formato: string | null;
  horario: string | null;
  pre_requisito: string | null;
  entregavel: string | null;
  exame_descricao: string | null;
  publico_alvo: string | null;
  disponibilidade_texto: string | null;
  link_mais_informacoes: string | null;
  cronograma: ModuloCronograma[];
  habilidades: string[];
  impacto_organizacional: string | null;
  impacto_individual: string | null;
  a_confirmar: boolean;
}

export interface TrainingComboItem {
  id: string;
  combo_id: string;
  course_id: string;
  ordem: number;
}

export interface TrainingParam {
  key: string;
  label: string;
  value: unknown;
  tipo: "number" | "percent" | "boolean" | "text";
  status: StatusParam;
  descricao: string | null;
  ordem: number;
}

export const STATUS_PENDENTES: StatusParam[] = ["simulado", "a_confirmar"];

export const STATUS_LABEL: Record<StatusParam, string> = {
  planilha: "planilha",
  simulado: "simulado",
  a_confirmar: "a confirmar",
  decisao: "decisão",
  reuso: "reuso",
  proposta: "proposta atual",
  confirmado: "confirmado",
};

export const CAMPO_LABEL: Record<string, string> = {
  max_alunos: "máximo de alunos",
  nivel_instrutor: "nível do instrutor",
  dias: "dias",
  custo: "linha de custo",
  ementa: "ementa",
  preco: "preço Selbetti",
  part_number_interno: "part number",
};

/** dias padrão = ceil(horas / horasPorDia). */
export const diasPadrao = (horas: number, horasPorDia = 8) =>
  horas > 0 ? Math.ceil(horas / Math.max(1, horasPorDia)) : 0;
