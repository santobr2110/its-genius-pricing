import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { campanhasSobrepostas, type SreCampanha } from "@/lib/sre/calc";
import type { SreCadastro } from "@/hooks/useSreCadastro";

const fmtData = (d: string | null) => (d ? d.split("-").reverse().join("/") : "sem fim");
const NOVA = (): SreCampanha => ({ id: "", nome: "", desconto_perc: 0, vigencia_inicio: new Date().toISOString().slice(0, 10), vigencia_fim: null, ativo: false, observacao: null, a_confirmar: true });

export default function SreCampanhasTab({ campanhas, refresh }: SreCadastro) {
  const [ed, setEd] = useState<SreCampanha | null>(null);

  const salvar = async () => {
    if (!ed) return;
    if (!ed.nome.trim()) return toast.error("Informe o nome da campanha.");
    if (!(ed.desconto_perc >= 0 && ed.desconto_perc < 100)) return toast.error("O desconto deve ser de 0% a menos de 100%.");
    if (ed.vigencia_fim && ed.vigencia_fim < ed.vigencia_inicio) return toast.error("O fim da vigência não pode ser antes do início.");
    const conflito = campanhasSobrepostas(ed, campanhas);
    if (conflito.length) {
      const c = conflito[0];
      return toast.error(`Não é possível salvar: o período se sobrepõe à campanha ativa "${c.nome}" (${fmtData(c.vigencia_inicio)} a ${fmtData(c.vigencia_fim)}). Desative-a ou ajuste as datas.`);
    }
    const { id, ...dados } = ed;
    const res = id ? await supabase.from("sre_campanhas").update(dados).eq("id", id) : await supabase.from("sre_campanhas").insert(dados);
    if (res.error) return toast.error(res.error.message);
    toast.success("Campanha salva"); setEd(null); refresh();
  };

  const excluir = async (c: SreCampanha) => {
    if (!confirm(`Excluir a campanha "${c.nome}"?`)) return;
    const res = await supabase.from("sre_campanhas").delete().eq("id", c.id);
    if (res.error) return toast.error(res.error.message);
    refresh();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Campanhas</CardTitle>
            <p className="text-xs text-muted-foreground">Desconto promocional com vigência. Só uma campanha ativa por período.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setEd(NOVA())}><Plus className="h-4 w-4" /> Nova</Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {campanhas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma campanha cadastrada.</p>}
          {campanhas.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-md border px-3 py-2">
              <button className="flex-1 text-left" onClick={() => setEd(c)}>
                <p className="text-sm font-medium flex items-center gap-2">
                  {c.nome}
                  <Badge variant={c.ativo ? "default" : "secondary"} className="text-[10px]">{c.ativo ? "Ativa" : "Inativa"}</Badge>
                  {c.a_confirmar && <Badge variant="outline" className="text-[10px]">a confirmar</Badge>}
                </p>
                <p className="text-xs text-muted-foreground">{Number(c.desconto_perc).toLocaleString("pt-BR")}% · {fmtData(c.vigencia_inicio)} a {fmtData(c.vigencia_fim)}</p>
              </button>
              <Button size="icon" variant="ghost" onClick={() => excluir(c)} aria-label={`Excluir ${c.nome}`}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>
      {ed && (
        <Card>
          <CardHeader><CardTitle className="text-base">{ed.id ? "Editar campanha" : "Nova campanha"}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label className="text-xs">Nome</Label><Input value={ed.nome} onChange={(e) => setEd({ ...ed, nome: e.target.value })} /></div>
            <div><Label className="text-xs">Desconto (%)</Label><Input type="number" step="0.01" value={ed.desconto_perc} onChange={(e) => setEd({ ...ed, desconto_perc: Number(e.target.value) })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Início</Label><Input type="date" value={ed.vigencia_inicio} onChange={(e) => setEd({ ...ed, vigencia_inicio: e.target.value })} /></div>
              <div><Label className="text-xs">Fim (vazio = sem fim)</Label><Input type="date" value={ed.vigencia_fim ?? ""} onChange={(e) => setEd({ ...ed, vigencia_fim: e.target.value || null })} /></div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={ed.ativo} onCheckedChange={(v) => setEd({ ...ed, ativo: v })} /><Label>Ativa</Label></div>
            <div className="flex items-center gap-2"><Switch checked={ed.a_confirmar} onCheckedChange={(v) => setEd({ ...ed, a_confirmar: v })} /><Label>A confirmar</Label></div>
            <div><Label className="text-xs">Observação</Label><Textarea rows={3} value={ed.observacao ?? ""} onChange={(e) => setEd({ ...ed, observacao: e.target.value || null })} /></div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEd(null)}>Cancelar</Button>
              <Button onClick={salvar}>Salvar</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
