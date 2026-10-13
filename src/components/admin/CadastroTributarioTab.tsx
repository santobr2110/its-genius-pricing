import { useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTaxCodes } from "@/hooks/useTaxCodes";
import type { TaxCode, TaxRate } from "@/lib/pricing/taxRates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

const MUNICIPIOS = ["Joinville", "Blumenau", "Barueri"];

function CodeRow({ code, rates, refresh }: { code: TaxCode; rates: TaxRate[]; refresh: () => void }) {
  const [c, setC] = useState(code);
  const [open, setOpen] = useState(false);
  const saveCode = async () => {
    const { error } = await supabase.from("tax_product_codes").update({
      codigo: c.codigo, nome: c.nome, descricao: c.descricao, lc116_item: c.lc116_item, ativo: c.ativo, a_confirmar: c.a_confirmar,
    }).eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Código salvo");
    refresh();
  };
  const removeCode = async () => {
    if (!confirm(`Excluir o código ${c.codigo}?`)) return;
    const { error } = await supabase.from("tax_product_codes").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    refresh();
  };
  const addRate = async () => {
    const { error } = await supabase.from("tax_product_code_rates").insert({
      tax_product_code_id: c.id, municipio: MUNICIPIOS[0], vigencia_inicio: new Date().toISOString().slice(0, 10), a_confirmar: true,
    });
    if (error) return toast.error(error.message);
    refresh();
  };
  return (
    <div className="border rounded-md p-2 space-y-2">
      <div className="grid grid-cols-[110px_1fr_70px_auto_auto_auto_auto] gap-2 items-center">
        <Input className="h-8 text-xs" value={c.codigo} onChange={(e) => setC({ ...c, codigo: e.target.value })} />
        <Input className="h-8 text-xs" value={c.nome} onChange={(e) => setC({ ...c, nome: e.target.value })} />
        <Input className="h-8 text-xs" placeholder="LC116" value={c.lc116_item ?? ""} onChange={(e) => setC({ ...c, lc116_item: e.target.value })} />
        <label className="flex items-center gap-1 text-[11px]"><Switch checked={c.ativo} onCheckedChange={(v) => setC({ ...c, ativo: v })} />Ativo</label>
        <label className="flex items-center gap-1 text-[11px]"><Switch checked={c.a_confirmar} onCheckedChange={(v) => setC({ ...c, a_confirmar: v })} />A confirmar</label>
        <Button size="sm" variant="outline" className="h-8" onClick={saveCode}><Save className="h-3.5 w-3.5" /></Button>
        <Button size="sm" variant="ghost" className="h-8 text-destructive" onClick={removeCode}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
      <div className="flex items-center gap-2">
        {c.a_confirmar && <Badge variant="outline" className="text-[10px]">alíquotas a confirmar com Fiscal</Badge>}
        <Button size="sm" variant="link" className="h-6 px-0 text-xs" onClick={() => setOpen(!open)}>
          {open ? "Ocultar" : "Ver"} alíquotas ({rates.length})
        </Button>
      </div>
      {open && (
        <div className="space-y-1 pl-2">
          <div className="grid grid-cols-[120px_70px_70px_70px_120px_120px_auto_auto_auto] gap-2 text-[10px] text-muted-foreground">
            <span>Município</span><span>PIS %</span><span>COFINS %</span><span>ISS %</span><span>Vigência início</span><span>Vigência fim</span><span>A confirmar</span><span /><span />
          </div>
          {rates.map((r) => <RateRow key={r.id} rate={r} refresh={refresh} />)}
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={addRate}><Plus className="h-3 w-3" /> Alíquota</Button>
        </div>
      )}
    </div>
  );
}

function RateRow({ rate, refresh }: { rate: TaxRate; refresh: () => void }) {
  const [r, setR] = useState(rate);
  const num = (v: string) => parseFloat(v.replace(",", ".")) || 0;
  const save = async () => {
    const { error } = await supabase.from("tax_product_code_rates").update({
      municipio: r.municipio, pis_perc: r.pis_perc, cofins_perc: r.cofins_perc, iss_perc: r.iss_perc,
      vigencia_inicio: r.vigencia_inicio, vigencia_fim: r.vigencia_fim || null, a_confirmar: r.a_confirmar,
    }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Alíquota salva");
    refresh();
  };
  const remove = async () => {
    const { error } = await supabase.from("tax_product_code_rates").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    refresh();
  };
  return (
    <div className="grid grid-cols-[120px_70px_70px_70px_120px_120px_auto_auto_auto] gap-2 items-center">
      <Input className="h-7 text-xs" value={r.municipio} onChange={(e) => setR({ ...r, municipio: e.target.value })} />
      <Input className="h-7 text-xs" type="number" step={0.01} value={r.pis_perc} onChange={(e) => setR({ ...r, pis_perc: num(e.target.value) })} />
      <Input className="h-7 text-xs" type="number" step={0.01} value={r.cofins_perc} onChange={(e) => setR({ ...r, cofins_perc: num(e.target.value) })} />
      <Input className="h-7 text-xs" type="number" step={0.01} value={r.iss_perc} onChange={(e) => setR({ ...r, iss_perc: num(e.target.value) })} />
      <Input className="h-7 text-xs" type="date" value={r.vigencia_inicio} onChange={(e) => setR({ ...r, vigencia_inicio: e.target.value })} />
      <Input className="h-7 text-xs" type="date" value={r.vigencia_fim ?? ""} onChange={(e) => setR({ ...r, vigencia_fim: e.target.value || null })} />
      <Switch checked={r.a_confirmar} onCheckedChange={(v) => setR({ ...r, a_confirmar: v })} />
      <Button size="sm" variant="outline" className="h-7" onClick={save}><Save className="h-3 w-3" /></Button>
      <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={remove}><Trash2 className="h-3 w-3" /></Button>
    </div>
  );
}

export default function CadastroTributarioTab() {
  const { codes, rates, loading, refresh } = useTaxCodes();
  const addCode = async () => {
    const codigo = prompt("Código do produto:");
    if (!codigo) return;
    const { error } = await supabase.from("tax_product_codes").insert({ codigo, nome: codigo, a_confirmar: true });
    if (error) return toast.error(error.message);
    refresh();
  };
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Cadastro tributário compartilhado</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Códigos de produto e alíquotas por município, com vigência. Fonte oficial usada por Smart ITO, BodyShop e Treinamento;
            alterações aqui valem para todas as precificações.
          </p>
        </div>
        <Button size="sm" className="gap-1" onClick={addCode}><Plus className="h-3.5 w-3.5" /> Código</Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? <p className="text-sm text-muted-foreground">Carregando…</p> : codes.map((c) => (
          <CodeRow key={c.id + c.codigo} code={c} rates={rates.filter((r) => r.tax_product_code_id === c.id)} refresh={refresh} />
        ))}
      </CardContent>
    </Card>
  );
}
