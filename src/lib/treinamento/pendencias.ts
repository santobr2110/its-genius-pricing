import { CAMPO_LABEL, STATUS_LABEL, STATUS_PENDENTES, type TrainingCourse, type TrainingCourseContent, type TrainingParam } from "./types";

export interface Pendencia {
  origem: "curso" | "conteudo" | "parametro";
  ref: string; // id do curso ou key do parâmetro
  titulo: string;
  detalhe: string;
}

/** Lista tudo o que está marcado como simulado / a confirmar / custo pendente. */
export function listarPendencias(
  courses: TrainingCourse[],
  contents: TrainingCourseContent[],
  params: TrainingParam[],
): Pendencia[] {
  const out: Pendencia[] = [];
  for (const c of courses) {
    if (c.custo_pendente) out.push({ origem: "curso", ref: c.id, titulo: c.nome, detalhe: "custo pendente" });
    for (const f of c.campos_a_confirmar ?? []) {
      if (f === "custo" && c.custo_pendente) continue;
      out.push({ origem: "curso", ref: c.id, titulo: c.nome, detalhe: `${CAMPO_LABEL[f] ?? f} a confirmar` });
    }
  }
  const nomes = new Map(courses.map((c) => [c.id, c.nome]));
  for (const ct of contents) {
    if (ct.a_confirmar) out.push({ origem: "conteudo", ref: ct.course_id, titulo: nomes.get(ct.course_id) ?? "Curso", detalhe: "conteúdo da proposta a confirmar" });
  }
  for (const p of params) {
    if (STATUS_PENDENTES.includes(p.status)) out.push({ origem: "parametro", ref: p.key, titulo: p.label, detalhe: STATUS_LABEL[p.status] });
  }
  return out;
}
