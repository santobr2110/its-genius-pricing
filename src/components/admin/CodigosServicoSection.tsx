import { useState } from "react";
import { Plus, Trash2, Save, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ServiceCode, ServiceCodeIss, TaxCode } from "@/lib/pricing/taxRates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

const num = (v: string) => parseFloat(v.replace(",", ".")) || 0;
const GRID = "grid grid-cols-[90px_1fr_80px_80px_auto_auto_auto_auto] gap-2 items-center";
const GRID_ISS = "grid grid-cols-[130px_80px_130px_130px_auto_auto_auto] gap-2 items-center";

function IssRow({ row, refresh }: { row: ServiceCodeIss; refresh: () => void }) {
  const [r, setR] = useState(row);
  const save = async () => {
    const { error } = await supabase.from("service_code_iss").update({
      municipio: r.municipio, iss_perc: r.iss_perc, vigencia_inicio: r.vigencia_inicio, vigencia_fim: r.vigencia_fim || null, a_confirmar: r.a_confirmar,
    }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("ISS salvo");
    refresh();
  };
  const remove = async () => {
    const { error } = await supabase.from("service_code_iss").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    refresh();
  };
  return (
    <div className={GRID_ISS}>
      <Input className="h-7 text-xs" value={r.municipio} onChange={(e) => setR({ ...r, municipio: e.target.value })} />
      <Input className="h-7 text-xs" type="number" step={0.01} value={r.iss_perc} onChange={(e) => setR({ ...r, iss_perc: num(e.target.value) })} />
      <Input className="h-7 text-xs" type="date" value={r.vigencia_inicio} onChange={(e) => setR({ ...r, vigencia_inicio: e.target.value })} />
      <Input className="h-7 text-xs" type="date" value={r.vigencia_fim ?? ""} onChange={(e) => setR({ ...r, vigencia_fim: e.target.value || null })} />
      <Switch checked={r.a_confirmar} onCheckedChange={(v) => setR({ ...r, a_confirmar: v })} />
      <Button size="sm" variant="outline" className="h-7" onClick={save}><Save className="h-3 w-3" /></Button>
      <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={remove}><Trash2 className="h-3 w-3" /></Button>
    </div>
  );
}

function ServicoRow({ sc, iss, produtos, refresh }: { sc: ServiceCode; iss: ServiceCodeIss[]; produtos: TaxCode[]; refresh: () => void }) {
  const [s, setS] = useState(sc);
  const [open, setOpen] = useState(false);
  const save = async () => {
    const { error } = await supabase.from("service_codes").update({
      lc116_item: s.lc116_item, descricao: s.descricao, pis_perc: s.pis_perc, cofins_perc: s.cofins_perc, ativo: s.ativo, a_confirmar: s.a_confirmar,
    }).eq("id", s.id);
    if (error) return toast.error(error.message);
    await supabase.from("tax_product_codes").update({ lc116_item: s.lc116_item }).eq("service_code_id", s.id);
    toast.success("Código de serviço salvo");
    refresh();
  };
  const remove = async () => {
    if (produtos.length) return toast.error(`Há ${produtos.length} produto(s) usando este código. Troque o código deles antes de excluir.`);
    if (!confirm(`Excluir o código de serviço ${s.lc116_item}?`)) return;
    const { error } = await supabase.from("service_codes").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    refresh();
  };
  const addIss = async () => {
    const { error } = await supabase.from("service_code_iss").insert({ service_code_id: s.id, municipio: "Joinville", a_confirmar: true });
    if (error) return toast.error(error.message);
    setOpen(true);
    refresh();
  };
  return (
    <div className="border rounded-md p-2 space-y-2">
      <div className={GRID}>
        <Input className="h-8 text-xs font-mono" value={s.lc116_item} onChange={(e) => setS({ ...s, lc116_item: e.target.value })} />
        <Input className="h-8 text-xs" placeholder="Descrição do serviço" value={s.descricao ?? ""} onChange={(e) => setS({ ...s, descricao: e.target.value })} />
        <Input className="h-8 text-xs" type="number" step={0.01} value={s.pis_perc} onChange={(e) => setS({ ...s, pis_perc: num(e.target.value) })} />
        <Input className="h-8 text-xs" type="number" step={0.01} value={s.cofins_perc} onChange={(e) => setS({ ...s, cofins_perc: num(e.target.value) })} />
        <label className="flex items-center gap-1 text-[11px]"><Switch checked={s.ativo} onCheckedChange={(v) => setS({ ...s, ativo: v })} />Ativo</label>
        <label className="flex items-center gap-1 text-[11px]"><Switch checked={s.a_confirmar} onCheckedChange={(v) => setS({ ...s, a_confirmar: v })} />A confirmar</label>
        <Button size="sm" variant="outline" className="h-8" onClick={save}><Save className="h-3.5 w-3.5" /></Button>
        <Button size="sm" variant="ghost" className="h-8 text-destructive" onClick={remove}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <Button size="sm" variant="link" className="h-6 px-0 text-xs" onClick={() => setOpen(!open)}>
          {open ? "Ocultar" : "Ver"} ISS por município ({iss.length})
        </Button>
        <span>· Usado por {produtos.length} produto(s){produtos.length ? `: ${produtos.map((p) => p.codigo).join(", ")}` : ""}</span>
      </div>
      {open && (
        <div className="space-y-1 pl-2">
          <div className={`${GRID_ISS} text-[10px] text-muted-foreground`}>
            <span>Município</span><span>ISS %</span><span>Vigência início</span><span>Vigência fim</span><span>A confirmar</span><span /><span />
          </div>
          {iss.map((r) => <IssRow key={r.id} row={r} refresh={refresh} />)}
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={addIss}><Plus className="h-3 w-3" /> Município</Button>
        </div>
      )}
    </div>
  );
}

export default function CodigosServicoSection({ servicos, iss, codes, refresh }: { servicos: ServiceCode[]; iss: ServiceCodeIss[]; codes: TaxCode[]; refresh: () => void }) {
  const add = async () => {
    const item = prompt("Item da LC 116 (ex.: 1.07):");
    if (!item) return;
    const { error } = await supabase.from("service_codes").insert({ lc116_item: item.trim(), a_confirmar: true });
    if (error) return toast.error(error.message);
    refresh();
  };
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0 gap-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Códigos de serviço (LC 116)</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            PIS e COFINS valem para o código inteiro; o ISS é definido por município. Todos os produtos vinculados a um código
            usam estas alíquotas automaticamente.
          </p>
        </div>
        <Button size="sm" className="gap-1 shrink-0" onClick={add}><Plus className="h-3.5 w-3.5" /> Código de serviço</Button>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className={`${GRID} px-2 text-[10px] uppercase tracking-wider text-muted-foreground`}>
          <span>Item LC 116</span><span>Descrição</span><span>PIS %</span><span>COFINS %</span><span /><span /><span /><span />
        </div>
        {servicos.map((s) => (
          <ServicoRow key={s.id + s.lc116_item} sc={s} iss={iss.filter((i) => i.service_code_id === s.id)} produtos={codes.filter((c) => c.service_code_id === s.id)} refresh={refresh} />
        ))}
      </CardContent>
    </Card>
  );
}
