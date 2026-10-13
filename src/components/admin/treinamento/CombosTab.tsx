import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { CadastroProps } from "./TreinamentoAdminTab";

export default function CombosTab({ courses, comboItems, refresh }: CadastroProps) {
  const combos = courses.filter((c) => c.tipo === "combo");
  const nome = new Map(courses.map((c) => [c.id, c]));
  const [add, setAdd] = useState<Record<string, string>>({});

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

  if (combos.length === 0) return <p className="text-sm text-muted-foreground">Nenhum combo. Crie um curso do tipo "combo" na aba Cursos.</p>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {combos.map((cb) => {
        const itens = comboItems.filter((i) => i.combo_id === cb.id);
        const horasItens = itens.reduce((s, i) => s + (nome.get(i.course_id)?.horas_execucao ?? 0), 0);
        const disponiveis = courses.filter((c) => c.tipo !== "combo" && c.tipo !== "exame" && !itens.some((i) => i.course_id === c.id));
        return (
          <Card key={cb.id} className={cb.ativo ? "" : "opacity-70"}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex flex-wrap items-center gap-2">
                {cb.nome}
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
  );
}
