import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowDown, ArrowUp, Copy, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CAMPO_LABEL, diasPadrao, type TrainingCourse } from "@/lib/treinamento/types";
import type { CadastroProps } from "./TreinamentoAdminTab";

const brl = (n: number | null) => (n == null ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
const TIPOS = ["curso", "exame", "combo", "extra"] as const;
const CAMPOS_SELO = Object.keys(CAMPO_LABEL);

type Draft = Omit<TrainingCourse, "id"> & { id?: string; _cloneFrom?: string };

const vazio = (ordem: number): Draft => ({
  slug: "", fabricante: "zabbix", nome: "", tipo: "curso", part_number_interno: null, catalog_product_id: null,
  horas_execucao: 8, dias: 1, horas_por_dia: 8, nivel_instrutor: "A", valor_fabricante: null, custo_material_aluno: 0, custo_cloud_aluno: 0,
  min_alunos: 1, max_alunos: null, preco_referencia_mercado: null, piso_preco_aluno: null, exame_course_id: null,
  prerequisito_course_id: null, permite_somente_exame: false, custo_pendente: false, campos_a_confirmar: [], ativo: true, ordem,
});

export default function CursosTab({ courses, refresh }: CadastroProps) {
  const [fab, setFab] = useState("todos");
  const [tipo, setTipo] = useState("todos");
  const [ativo, setAtivo] = useState("todos");
  const [edit, setEdit] = useState<Draft | null>(null);

  const lista = useMemo(() => courses.filter((c) =>
    (fab === "todos" || c.fabricante === fab) &&
    (tipo === "todos" || c.tipo === tipo) &&
    (ativo === "todos" || String(c.ativo) === ativo)), [courses, fab, tipo, ativo]);

  const salvar = async (d: Draft) => {
    if (!d.nome.trim() || !d.slug.trim()) return toast.error("Informe nome e identificador.");
    const { id, _cloneFrom, ...base } = d;
    const row = { ...base, dias_decimal: base.dias, dias: base.dias == null ? null : Math.ceil(base.dias) };
    const r = id ? await supabase.from("training_courses").update(row).eq("id", id) : await supabase.from("training_courses").insert(row);
    if (r.error) return toast.error(r.error.message);
    if (!id) {
      const { data } = await supabase.from("training_courses").select("id").eq("slug", row.slug).single();
      if (data) {
        let conteudo: Record<string, unknown> = {};
        if (_cloneFrom) {
          const { data: orig } = await supabase.from("training_course_content").select("*").eq("course_id", _cloneFrom).maybeSingle();
          if (orig) { const { course_id: _c, updated_at: _u, ...resto } = orig; conteudo = resto; }
        }
        await supabase.from("training_course_content").insert({ ...conteudo, course_id: data.id } as never);
      }
    }
    toast.success(_cloneFrom && !id ? "Curso clonado com o conteúdo" : "Curso salvo");
    setEdit(null);
    refresh();
  };

  const toggle = async (c: TrainingCourse) => {
    const r = await supabase.from("training_courses").update({ ativo: !c.ativo }).eq("id", c.id);
    if (r.error) toast.error(r.error.message); else refresh();
  };

  const mover = async (c: TrainingCourse, dir: -1 | 1) => {
    const idx = courses.findIndex((x) => x.id === c.id);
    const outro = courses[idx + dir];
    if (!outro) return;
    await Promise.all([
      supabase.from("training_courses").update({ ordem: outro.ordem }).eq("id", c.id),
      supabase.from("training_courses").update({ ordem: c.ordem }).eq("id", outro.id),
    ]);
    refresh();
  };

  const duplicar = (c: TrainingCourse) => {
    const { id: _id, ...rest } = c;
    setEdit({ ...rest, slug: `${c.slug}-copia`, nome: `${c.nome} (cópia)`, ordem: c.ordem + 1, _cloneFrom: c.id });
  };

  const excluir = async (c: TrainingCourse) => {
    if (!confirm(`Excluir "${c.nome}"? O conteúdo e os itens de combo ligados a ele também serão excluídos.`)) return;
    const r = await supabase.from("training_courses").delete().eq("id", c.id);
    if (r.error) toast.error(r.error.message); else { toast.success("Curso excluído"); refresh(); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="text-base">Cursos, exames, combos e extras</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Select value={fab} onValueChange={setFab}><SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="todos">Fabricante</SelectItem><SelectItem value="zabbix">Zabbix</SelectItem><SelectItem value="grafana">Grafana</SelectItem></SelectContent></Select>
          <Select value={tipo} onValueChange={setTipo}><SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="todos">Tipo</SelectItem>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
          <Select value={ativo} onValueChange={setAtivo}><SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="todos">Situação</SelectItem><SelectItem value="true">Ativos</SelectItem><SelectItem value="false">Inativos</SelectItem></SelectContent></Select>
          <Button size="sm" onClick={() => setEdit(vazio((courses.at(-1)?.ordem ?? 0) + 10))}><Plus className="h-4 w-4 mr-1" /> Novo</Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table className="text-xs">
          <TableHeader><TableRow className="[&>th]:whitespace-nowrap [&>th]:text-[11px]">
            <TableHead className="min-w-[240px]">Curso</TableHead><TableHead>Tipo</TableHead><TableHead className="text-right">Horas · Dias</TableHead>
            <TableHead className="text-center">Nível</TableHead><TableHead className="text-right">Material · Cloud /aluno</TableHead>
            <TableHead className="text-right">Alunos mín/máx</TableHead><TableHead className="text-right">Fabricante</TableHead><TableHead className="text-center">Ativo</TableHead><TableHead className="text-right">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {lista.map((c) => {
              const selos = c.campos_a_confirmar.filter((f) => !(f === "custo" && c.custo_pendente));
              return (
              <TableRow key={c.id} className={`[&>td]:py-2.5 [&>td]:align-middle ${c.ativo ? "" : "opacity-60"}`}>
                <TableCell>
                  <div className="font-medium text-sm leading-tight">{c.nome}</div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span className="text-[10px] text-muted-foreground font-mono">{c.part_number_interno ?? "sem part number"}</span>
                    {c.custo_pendente && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">custo pendente</Badge>}
                    {selos.length > 0 && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500 text-amber-600 cursor-help" title={selos.map((f) => CAMPO_LABEL[f] ?? f).join(", ")}>
                        {selos.length} a confirmar
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="capitalize whitespace-nowrap">{c.tipo}</TableCell>
                <TableCell className="text-right tabular-nums whitespace-nowrap">{c.horas_execucao}h · {c.dias ?? "—"}d{Number(c.horas_por_dia) === 3 ? " · noturno" : ""}</TableCell>
                <TableCell className="text-center">{c.nivel_instrutor ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums whitespace-nowrap">{brl(c.custo_material_aluno)}<span className="text-muted-foreground"> · {brl(c.custo_cloud_aluno)}</span></TableCell>
                <TableCell className="text-right tabular-nums whitespace-nowrap">{c.min_alunos} / {c.max_alunos ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums whitespace-nowrap">{brl(c.valor_fabricante)}</TableCell>
                <TableCell className="text-center"><Switch checked={c.ativo} onCheckedChange={() => toggle(c)} aria-label="Ativo" /></TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Ações"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setEdit({ ...c })}><Pencil className="h-3.5 w-3.5 mr-2" /> Editar</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => duplicar(c)}><Copy className="h-3.5 w-3.5 mr-2" /> Clonar com conteúdo</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => mover(c, -1)}><ArrowUp className="h-3.5 w-3.5 mr-2" /> Subir</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => mover(c, 1)}><ArrowDown className="h-3.5 w-3.5 mr-2" /> Descer</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onSelect={() => excluir(c)}><Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ); })}
          </TableBody>
        </Table>
      </CardContent>
      {edit && <EditorCurso draft={edit} courses={courses} onClose={() => setEdit(null)} onSave={salvar} />}
    </Card>
  );
}

function EditorCurso({ draft, courses, onClose, onSave }: { draft: Draft; courses: TrainingCourse[]; onClose: () => void; onSave: (d: Draft) => void }) {
  const [d, setD] = useState<Draft>(draft);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));
  const num = (v: string) => (v === "" ? null : Number(v));
  const hpd = Number(d.horas_por_dia) || 8;
  const [unid, setUnid] = useState<"horas" | "dias">("horas");
  const numField = ({ k, label, nullable }: { k: keyof Draft; label: string; nullable?: boolean }) => (
    <div key={k} className="space-y-1"><Label className="text-xs">{label}</Label>
      <Input type="number" value={(d[k] as number | null) ?? ""} onChange={(e) => set(k, (nullable ? num(e.target.value) : Number(e.target.value) || 0) as never)} /></div>
  );
  const outros = courses.filter((c) => c.id !== d.id);
  const toggleSelo = (f: string) => set("campos_a_confirmar", d.campos_a_confirmar.includes(f) ? d.campos_a_confirmar.filter((x) => x !== f) : [...d.campos_a_confirmar, f]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{d.id ? "Editar curso" : d._cloneFrom ? "Clonar curso (o conteúdo será copiado)" : "Novo curso"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1 col-span-2"><Label className="text-xs">Nome</Label><Input value={d.nome} onChange={(e) => set("nome", e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">Identificador</Label><Input value={d.slug} onChange={(e) => set("slug", e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">Part number interno</Label><Input value={d.part_number_interno ?? ""} onChange={(e) => set("part_number_interno", e.target.value || null)} /></div>
          <div className="space-y-1"><Label className="text-xs">Fabricante</Label>
            <Select value={d.fabricante} onValueChange={(v) => set("fabricante", v as Draft["fabricante"])}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="zabbix">Zabbix</SelectItem><SelectItem value="grafana">Grafana</SelectItem></SelectContent></Select></div>
          <div className="space-y-1"><Label className="text-xs">Tipo</Label>
            <Select value={d.tipo} onValueChange={(v) => set("tipo", v as Draft["tipo"])}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><Label className="text-xs">Nível do instrutor</Label>
            <Select value={d.nivel_instrutor ?? "nenhum"} onValueChange={(v) => set("nivel_instrutor", v === "nenhum" ? null : (v as "A" | "B"))}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="nenhum">Sem instrutor</SelectItem><SelectItem value="A">A</SelectItem><SelectItem value="B">B</SelectItem></SelectContent></Select></div>
          <div className="space-y-1"><Label className="text-xs">Período</Label>
            <Select value={hpd === 3 ? "noturno" : "diurno"} onValueChange={(v) => { const n = v === "noturno" ? 3 : 8; setD((p) => unid === "horas" ? { ...p, horas_por_dia: n, dias: diasPadrao(p.horas_execucao, n) } : { ...p, horas_por_dia: n, horas_execucao: (p.dias ?? 0) * n }); }}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="diurno">Diurno (8h/dia)</SelectItem><SelectItem value="noturno">Noturno (3h/noite)</SelectItem></SelectContent></Select></div>
          <div className="space-y-1"><Label className="text-xs">Duração em</Label>
            <Select value={unid} onValueChange={(v) => setUnid(v as "horas" | "dias")}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="horas">Horas</SelectItem><SelectItem value="dias">Dias</SelectItem></SelectContent></Select></div>
          {unid === "horas" ? (
            <div className="space-y-1"><Label className="text-xs">Horas de execução <span className="text-muted-foreground">({d.dias ?? 0} dia(s))</span></Label>
              <Input type="number" value={d.horas_execucao} onChange={(e) => { const h = Number(e.target.value) || 0; setD((p) => ({ ...p, horas_execucao: h, dias: diasPadrao(h, hpd) })); }} /></div>
          ) : (
            <div className="space-y-1"><Label className="text-xs">Dias <span className="text-muted-foreground">({d.horas_execucao}h, {hpd}h/dia)</span></Label>
              <Input type="number" step="0.5" value={d.dias ?? ""} onChange={(e) => { const n = num(e.target.value); setD((p) => ({ ...p, dias: n, horas_execucao: (n ?? 0) * hpd })); }} /></div>
          )}
          {numField({ k: "custo_material_aluno", label: "Material/aluno (R$)", })}
          {numField({ k: "custo_cloud_aluno", label: "Cloud/aluno (R$)", })}
          {numField({ k: "min_alunos", label: "Mín. alunos", })}
          {numField({ k: "max_alunos", label: "Máx. alunos", nullable: true, })}
          {numField({ k: "valor_fabricante", label: "Valor fabricante (R$)", nullable: true, })}
          {numField({ k: "preco_referencia_mercado", label: "Preço praticado no mercado (R$)", nullable: true, })}
          {numField({ k: "piso_preco_aluno", label: "Piso por aluno (R$)", nullable: true, })}
          <div className="space-y-1"><Label className="text-xs">Exame vinculado</Label>
            <Select value={d.exame_course_id ?? "nenhum"} onValueChange={(v) => set("exame_course_id", v === "nenhum" ? null : v)}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="nenhum">Nenhum</SelectItem>{outros.filter((c) => c.tipo === "exame").map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><Label className="text-xs">Pré-requisito (aviso)</Label>
            <Select value={d.prerequisito_course_id ?? "nenhum"} onValueChange={(v) => set("prerequisito_course_id", v === "nenhum" ? null : v)}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="nenhum">Nenhum</SelectItem>{outros.filter((c) => c.tipo !== "exame").map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select></div>
          <label className="flex items-center gap-2 text-xs col-span-2"><Switch checked={d.permite_somente_exame} onCheckedChange={(v) => set("permite_somente_exame", v)} /> Permite modalidade "Somente exame"</label>
          <label className="flex items-center gap-2 text-xs"><Switch checked={d.custo_pendente} onCheckedChange={(v) => set("custo_pendente", v)} /> Custo pendente</label>
          <label className="flex items-center gap-2 text-xs"><Switch checked={d.ativo} onCheckedChange={(v) => set("ativo", v)} /> Ativo</label>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Selos "a confirmar"</Label>
          <div className="flex flex-wrap gap-1.5">
            {CAMPOS_SELO.map((f) => (
              <button key={f} type="button" onClick={() => toggleSelo(f)}>
                <Badge variant={d.campos_a_confirmar.includes(f) ? "default" : "outline"}>{CAMPO_LABEL[f]}</Badge>
              </button>
            ))}
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={() => onSave(d)}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
