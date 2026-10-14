import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TrainingComboItem, TrainingCourse, TrainingCourseContent, TrainingParam } from "@/lib/treinamento/types";

const KEY = ["treinamento-cadastro"];

/** Cursos, conteúdo, combos e parâmetros do Treinamento. */
export function useTreinamentoCadastro() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const [c, ct, ci, p] = await Promise.all([
        supabase.from("training_courses").select("*").order("ordem"),
        supabase.from("training_course_content").select("*"),
        supabase.from("training_combo_items").select("*").order("ordem"),
        supabase.from("training_params").select("*").order("ordem"),
      ]);
      for (const r of [c, ct, ci, p]) if (r.error) throw r.error;
      return {
        courses: (c.data ?? []).map(({ dias_decimal, ...x }) => ({ ...x, dias: dias_decimal ?? x.dias })) as unknown as TrainingCourse[],
        contents: (ct.data ?? []) as unknown as TrainingCourseContent[],
        comboItems: (ci.data ?? []) as unknown as TrainingComboItem[],
        params: (p.data ?? []) as unknown as TrainingParam[],
      };
    },
  });
  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: KEY }), [qc]);
  return {
    courses: q.data?.courses ?? [],
    contents: q.data?.contents ?? [],
    comboItems: q.data?.comboItems ?? [],
    params: q.data?.params ?? [],
    loading: q.isLoading,
    error: q.error,
    refresh,
  };
}
