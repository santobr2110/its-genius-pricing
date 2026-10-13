import { describe, expect, it } from "vitest";
import { listarPendencias } from "@/lib/treinamento/pendencias";
import { diasPadrao, type TrainingCourse, type TrainingParam } from "@/lib/treinamento/types";

const curso = (p: Partial<TrainingCourse>): TrainingCourse => ({
  id: "c", slug: "c", fabricante: "zabbix", nome: "C", tipo: "curso", part_number_interno: null, catalog_product_id: null,
  horas_execucao: 8, dias: 1, nivel_instrutor: "A", valor_fabricante: null, custo_material_aluno: 0, custo_cloud_aluno: 0,
  min_alunos: 1, max_alunos: null, preco_referencia_mercado: null, piso_preco_aluno: null, exame_course_id: null,
  prerequisito_course_id: null, permite_somente_exame: false, custo_pendente: false, campos_a_confirmar: [], ativo: true, ordem: 0, ...p,
});
const param = (key: string, status: TrainingParam["status"]): TrainingParam => ({ key, label: key, value: 1, tipo: "number", status, descricao: null, ordem: 0 });

describe("treinamento", () => {
  it("diasPadrao = ceil(horas/8)", () => {
    expect(diasPadrao(8)).toBe(1);
    expect(diasPadrao(40)).toBe(5);
    expect(diasPadrao(64)).toBe(8);
    expect(diasPadrao(20)).toBe(3);
    expect(diasPadrao(0)).toBe(0);
  });

  it("lista pendências de cursos, conteúdo e parâmetros sem duplicar custo pendente", () => {
    const p = listarPendencias(
      [curso({ id: "a", campos_a_confirmar: ["max_alunos"] }), curso({ id: "b", custo_pendente: true, campos_a_confirmar: ["custo"] })],
      [{ course_id: "a", a_confirmar: true } as never],
      [param("x", "simulado"), param("y", "a_confirmar"), param("z", "planilha")],
    );
    expect(p.filter((x) => x.origem === "curso")).toHaveLength(2);
    expect(p.filter((x) => x.origem === "conteudo")).toHaveLength(1);
    expect(p.filter((x) => x.origem === "parametro").map((x) => x.ref)).toEqual(["x", "y"]);
  });
});
