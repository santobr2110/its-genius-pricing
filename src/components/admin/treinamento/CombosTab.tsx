import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown, ArrowUp, Boxes, Pencil, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { TrainingCourse } from "@/lib/treinamento/types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { CadastroProps } from "./TreinamentoAdminTab";

export default function CombosTab({ courses, comboItems, refresh }: CadastroProps) {
  const combos = courses.filter((c) => c.tipo === "combo");
  const nome = new Map(courses.map((c) => [c.id, c]));
  const [add, setAdd] = useState<Record<string, string>>({});
  const [edit, setEdit] = useState<Partial<TrainingCourse> | null>(null);

  const salvarCombo = async () => {
    if (!edit?.nome?.trim()) return toast.error("Informe o nome do combo.");
    const slug = edit.slug?.trim() || edit.nome.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const row = {
      nome: edit.nome.trim(), slug, fabricante: edit.fabricante ?? "zabbix", tipo: "combo",
      part_number_interno: edit.part_number_interno || null, horas_execucao: Number(edit.horas_execucao) || 0,
      dias_decimal: edit.dias == null || (edit.dias as unknown) === "" ? null : Number(edit.dias),
      dias: edit.dias == null || (edit.dias as unknown) === "" ? null : Math.ceil(Number(edit.dias)), nivel_instrutor: edit.nivel_instrutor ?? "B",
      min_alunos: Number(edit.min_alunos) || 1, max_alunos: edit.max_alunos ? Number(edit.max_alunos) : null,
      custo_material_aluno: Number(edit.custo_material_aluno) || 0, valor_fabricante: edit.valor_fabricante ? Number(edit.valor_fabricante) : null,
    };
    if (edit.id) {
      const r = await supabase.from("training_courses").update(row).eq("id", edit.id);
      if (r.error) return toast.error(r.error.message);
    } else {
      const ordem = Math.max(0, ...courses.map((c) => c.ordem)) + 10;
      const r = await supabase.from("training_courses").insert({ ...row, ordem, ativo: true }).select("id").single();
      if (r.error) return toast.error(r.error.message);
      await supabase.from("training_course_content").insert({ course_id: r.data.id });
    }
    toast.success("Combo salvo");
    setEdit(null);
    refresh();
  };
  const excluirCombo = async (cb: TrainingCourse) => {
    if (!confirm(`Excluir o combo "${cb.nome}"? A composição e o conteúdo dele também serão excluídos.`)) return;
    const r = await supabase.from("training_courses").delete().eq("id", cb.id);
    if (r.error) toast.error(r.error.message); else { toast.success("Combo excluído"); refresh(); }
  };

  const adicionar = async (comboId: string) => {
    const courseId = add[comboId];
    if (!courseId) return;
    const ordem = Math.max(0, ...comboItems.filter((i) => i.combo_id === comboId).map((i) => i.ordem)) + 1;
    const r = await supabase.from("training_combo_items").insert({ combo_id: comboId, course_id: courseId, ordem });
    if (r.error) return toast.error(r.error.message);
    setAdd((p) => ({ ...p, [comboId]: "" }));
    refresh();
  };
  const remover = async (id: string) => {
    const r = await supabase.from("training_combo_items").delete().eq("id", id);
    if (r.error) toast.error(r.error.message); else refresh();
  };
  const mover = async (comboId: string, idx: number, dir: -1 | 1) => {
    const itens = comboItems.filter((i) => i.combo_id === comboId);
    const a = itens[idx], b = itens[idx + dir];
    if (!a || !b) return;
    await Promise.all([
      supabase.from("training_combo_items").update({ ordem: b.ordem }).eq("id", a.id),
      supabase.from("training_combo_items").update({ ordem: a.ordem }).eq("id", b.id),
    ]);
    refresh();
  };

  const f = (k: keyof TrainingCourse, label: string, type = "text") => (
    <div className="space-y-1"><Label className="text-xs">{label}</Label>
      <Input type={type} value={(edit?.[k] as string | number | null) ?? ""} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} /></div>
  );

  return (
    <div className="space-y-4">
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground flex items-center gap-2"><Boxes className="h-4 w-4 text-primary" /> {combos.length} combo(s)</p>
      <Button size="sm" onClick={() => setEdit({ fabricante: "zabbix", nivel_instrutor: "B", min_alunos: 5, horas_execucao: 0 })}><Plus className="h-4 w-4 mr-1" /> Novo combo</Button>
    </div>
    {combos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum combo cadastrado.</p>}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {combos.map((cb) => {
        const itens = comboItems.filter((i) => i.combo_id === cb.id);
        const horasItens = itens.reduce((s, i) => s + (nome.get(i.course_id)?.horas_execucao ?? 0), 0);
        const disponiveis = courses.filter((c) => c.tipo !== "combo" && c.tipo !== "exame" && !itens.some((i) => i.course_id === c.id));
        return (
          <Card key={cb.id} className={cb.ativo ? "" : "opacity-70"}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex flex-wrap items-center gap-2">
                <span className="flex-1 min-w-0">{cb.nome}</span>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEdit({ ...cb })} aria-label="Editar combo"><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => excluirCombo(cb)} aria-label="Excluir combo"><Trash2 className="h-3.5 w-3.5" /></Button>
                {!cb.ativo && <Badge variant="secondary">inativo</Badge>}
                {cb.custo_pendente && <Badge variant="destructive">custo pendente</Badge>}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Linha de custo própria: {cb.horas_execucao} h · {cb.dias ?? "—"} dias. Soma dos itens: {horasItens} h.
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {itens.map((i, idx) => (
                <div key={i.id} className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm">
                  <span className="text-muted-foreground tabular-nums w-5">{idx + 1}.</span>
                  <span className="flex-1">{nome.get(i.course_id)?.nome ?? "?"}</span>
                  <span className="text-xs text-muted-foreground">{nome.get(i.course_id)?.horas_execucao} h</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => mover(cb.id, idx, -1)} aria-label="Subir"><ArrowUp className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => mover(cb.id, idx, 1)} aria-label="Descer"><ArrowDown className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remover(i.id)} aria-label="Remover"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <Select value={add[cb.id] ?? ""} onValueChange={(v) => setAdd((p) => ({ ...p, [cb.id]: v }))}>
                  <SelectTrigger className="h-8"><SelectValue placeholder="Adicionar curso…" /></SelectTrigger>
                  <SelectContent>{disponiveis.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
                <Button size="sm" onClick={() => adicionar(cb.id)} disabled={!add[cb.id]}><Plus className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
    <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{edit?.id ? "Editar combo" : "Novo combo"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">{f("nome", "Nome")}</div>
          {f("part_number_interno", "Part number")}
          <div className="space-y-1"><Label className="text-xs">Fabricante</Label>
            <Select value={edit?.fabricante ?? "zabbix"} onValueChange={(v) => setEdit({ ...edit, fabricante: v as TrainingCourse["fabricante"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="zabbix">Zabbix</SelectItem><SelectItem value="grafana">Grafana</SelectItem></SelectContent></Select></div>
          {f("horas_execucao", "Horas", "number")}
          {f("dias", "Dias", "number")}
          <div className="space-y-1"><Label className="text-xs">Nível do instrutor</Label>
            <Select value={edit?.nivel_instrutor ?? "B"} onValueChange={(v) => setEdit({ ...edit, nivel_instrutor: v as "A" | "B" })}>
              <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="A">A</SelectItem><SelectItem value="B">B</SelectItem></SelectContent></Select></div>
          {f("min_alunos", "Mínimo de alunos", "number")}
          {f("max_alunos", "Máximo de alunos", "number")}
          {f("custo_material_aluno", "Material por aluno (R$)", "number")}
          {f("valor_fabricante", "Preço do fabricante (R$)", "number")}
        </div>
        <p className="text-[11px] text-muted-foreground">Depois de salvar, monte a composição adicionando os cursos no quadro do combo. Os demais campos ficam em Cursos.</p>
        <DialogFooter><Button variant="ghost" onClick={() => setEdit(null)}>Cancelar</Button><Button onClick={salvarCombo}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    </div>
  );
}