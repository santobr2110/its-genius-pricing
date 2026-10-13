import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ModuloCronograma, TrainingCourseContent } from "@/lib/treinamento/types";
import type { CadastroProps } from "./TreinamentoAdminTab";

const CAMPOS: { k: keyof TrainingCourseContent; label: string; long?: boolean }[] = [
  { k: "tagline", label: "Tagline" },
  { k: "descricao", label: "Descrição", long: true },
  { k: "produtos_cobertos", label: "Produtos cobertos" },
  { k: "formato", label: "Formato" },
  { k: "horario", label: "Horário" },
  { k: "pre_requisito", label: "Pré-requisito" },
  { k: "entregavel", label: "Entregável" },
  { k: "exame_descricao", label: "Exame" },
  { k: "publico_alvo", label: "Público-alvo" },
  { k: "disponibilidade_texto", label: "Disponibilidade e reagendamento", long: true },
  { k: "link_mais_informacoes", label: "Link para mais informações" },
  { k: "impacto_organizacional", label: "Impacto organizacional", long: true },
  { k: "impacto_individual", label: "Impacto individual", long: true },
];

const novoConteudo = (course_id: string): TrainingCourseContent => ({
  course_id, tagline: null, descricao: null, produtos_cobertos: null, formato: null, horario: null, pre_requisito: null,
  entregavel: null, exame_descricao: null, publico_alvo: null, disponibilidade_texto: null, link_mais_informacoes: null,
  cronograma: [], habilidades: [], impacto_organizacional: null, impacto_individual: null, a_confirmar: false,
});

export default function ConteudoTab({ courses, contents, refresh }: CadastroProps) {
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const curso = courses.find((c) => c.id === courseId);
  const [ct, setCt] = useState<TrainingCourseContent | null>(null);

  useEffect(() => {
    if (!courseId) return;
    const atual = contents.find((x) => x.course_id === courseId);
    setCt(atual ? { ...atual, cronograma: atual.cronograma ?? [], habilidades: atual.habilidades ?? [] } : novoConteudo(courseId));
  }, [courseId, contents]);

  if (!ct || !curso) return <p className="text-sm text-muted-foreground">Nenhum curso cadastrado.</p>;
  const set = <K extends keyof TrainingCourseContent>(k: K, v: TrainingCourseContent[K]) => setCt((p) => (p ? { ...p, [k]: v } : p));
  const setMod = (i: number, m: Partial<ModuloCronograma>) => set("cronograma", ct.cronograma.map((x, j) => (j === i ? { ...x, ...m } : x)));

  const salvar = async () => {
    const r = await supabase.from("training_course_content").upsert(ct as never);
    if (r.error) return toast.error(r.error.message);
    toast.success("Conteúdo salvo");
    refresh();
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="text-base">Conteúdo da proposta</CardTitle>
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-[60vh]">{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="space-y-3">
          {CAMPOS.map(({ k, label, long }) => (
            <div key={k} className="space-y-1">
              <Label className="text-xs">{label}</Label>
              {long
                ? <Textarea rows={3} value={(ct[k] as string) ?? ""} onChange={(e) => set(k, (e.target.value || null) as never)} />
                : <Input value={(ct[k] as string) ?? ""} onChange={(e) => set(k, (e.target.value || null) as never)} />}
            </div>
          ))}
          <div className="space-y-1">
            <Label className="text-xs">Habilidades (uma por linha)</Label>
            <Textarea rows={3} value={ct.habilidades.join("\n")} onChange={(e) => set("habilidades", e.target.value.split("\n").filter((s) => s.trim()))} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Cronograma (módulos)</Label>
              <Button size="sm" variant="outline" onClick={() => set("cronograma", [...ct.cronograma, { titulo: "Novo módulo", topicos: [] }])}><Plus className="h-3.5 w-3.5 mr-1" /> Módulo</Button>
            </div>
            {ct.cronograma.map((m, i) => (
              <div key={i} className="rounded-md border p-2 space-y-1.5">
                <div className="flex gap-2">
                  <Input value={m.titulo} onChange={(e) => setMod(i, { titulo: e.target.value })} placeholder="Título do módulo" />
                  <Button size="icon" variant="ghost" onClick={() => set("cronograma", ct.cronograma.filter((_, j) => j !== i))} aria-label="Remover módulo"><Trash2 className="h-4 w-4" /></Button>
                </div>
                <Input value={m.resumo ?? ""} onChange={(e) => setMod(i, { resumo: e.target.value || undefined })} placeholder="Resumo (opcional)" />
                <Textarea rows={3} value={m.topicos.join("\n")} onChange={(e) => setMod(i, { topicos: e.target.value.split("\n").filter((s) => s.trim()) })} placeholder="Tópicos, um por linha" />
              </div>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs"><Switch checked={ct.a_confirmar} onCheckedChange={(v) => set("a_confirmar", v)} /> Conteúdo a confirmar</label>
          <Button onClick={salvar}>Salvar conteúdo</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Pré-visualização na proposta</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <h3 className="text-lg font-bold text-foreground">{curso.nome}</h3>
            {ct.tagline && <p className="text-primary">{ct.tagline}</p>}
            {ct.a_confirmar && <Badge variant="outline" className="mt-1">a confirmar</Badge>}
          </div>
          {ct.descricao && <p className="text-muted-foreground whitespace-pre-line">{ct.descricao}</p>}
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            <dt className="font-semibold">Duração</dt><dd>{curso.dias ?? "—"} dia(s) · {curso.horas_execucao} h</dd>
            {CAMPOS.filter((c) => !["tagline", "descricao", "impacto_organizacional", "impacto_individual"].includes(c.k) && ct[c.k]).map((c) => (
              <div key={c.k} className="contents"><dt className="font-semibold">{c.label}</dt><dd className="whitespace-pre-line">{ct[c.k] as string}</dd></div>
            ))}
          </dl>
          {ct.cronograma.length > 0 && (
            <div className="space-y-2">
              <p className="font-semibold">Cronograma</p>
              {ct.cronograma.map((m, i) => (
                <div key={i}>
                  <p className="font-medium">{i + 1}. {m.titulo}</p>
                  {m.resumo && <p className="text-xs text-muted-foreground">{m.resumo}</p>}
                  <ul className="list-disc pl-5 text-xs">{m.topicos.map((t, j) => <li key={j}>{t}</li>)}</ul>
                </div>
              ))}
            </div>
          )}
          {ct.habilidades.length > 0 && (
            <div><p className="font-semibold">Habilidades desenvolvidas</p><ul className="list-disc pl-5 text-xs">{ct.habilidades.map((h, i) => <li key={i}>{h}</li>)}</ul></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
