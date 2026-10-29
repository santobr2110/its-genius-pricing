import ReformaCBSCard from "./ReformaCBSCard";
import ParametrosFinanceirosCard from "./ParametrosFinanceirosCard";
import { useState } from "react";
import { Plus, Trash2, Save, Package } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTaxCodes } from "@/hooks/useTaxCodes";
import { OFERTAS_FISCAIS, type OfertaFiscal, type ServiceCode, type TaxCode, type TaxRate } from "@/lib/pricing/taxRates";
import CodigosServicoSection from "./CodigosServicoSection";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

const MUNICIPIOS = ["Joinville", "Blumenau", "Barueri"];

function CodeRow({ code, rates, efetivas, servicos, refresh }: { code: TaxCode; rates: TaxRate[]; efetivas: TaxRate[]; servicos: ServiceCode[]; refresh: () => void }) {
  const [c, setC] = useState(code);
  const [open, setOpen] = useState(false);
  const saveCode = async () => {
    const { error } = await supabase.from("tax_product_codes").update({
      codigo: c.codigo, nome: c.nome, descricao: c.descricao, lc116_item: servicos.find((x) => x.id === c.service_code_id)?.lc116_item ?? c.lc116_item, service_code_id: c.service_code_id ?? null, usa_aliquota_propria: !!c.usa_aliquota_propria, ativo: c.ativo, a_confirmar: c.a_confirmar, ofertas: c.ofertas ?? [],
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
      <div className="grid grid-cols-[120px_1fr_70px_220px_auto_auto_auto_auto] gap-2 items-center">
        <Input className="h-8 text-xs font-mono" value={c.codigo} onChange={(e) => setC({ ...c, codigo: e.target.value })} />
        <Input className="h-8 text-xs" placeholder="SKU" value={c.nome} onChange={(e) => setC({ ...c, nome: e.target.value })} />
        <Select value={c.service_code_id ?? ""} onValueChange={(v) => setC({ ...c, service_code_id: v })}>
          <SelectTrigger className="h-8 text-xs font-mono"><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>
            {servicos.map((sc) => (
              <SelectItem key={sc.id} value={sc.id}><span className="font-mono text-xs">{sc.lc116_item}</span>{sc.descricao && <span className="text-xs text-muted-foreground ml-2">{sc.descricao}</span>}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex flex-wrap gap-1">
          {OFERTAS_FISCAIS.map((o) => {
            const on = !!c.ofertas?.includes(o.value);
            return (
              <button key={o.value} type="button" onClick={() => setC({ ...c, ofertas: on ? (c.ofertas ?? []).filter((x) => x !== o.value) : [...(c.ofertas ?? []), o.value] })}>
                <Badge variant={on ? "default" : "outline"} className="text-[10px] cursor-pointer">{o.label}</Badge>
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-1 text-[11px]"><Switch checked={c.ativo} onCheckedChange={(v) => setC({ ...c, ativo: v })} />Ativo</label>
        <label className="flex items-center gap-1 text-[11px]"><Switch checked={c.a_confirmar} onCheckedChange={(v) => setC({ ...c, a_confirmar: v })} />A confirmar</label>
        <Button size="sm" variant="outline" className="h-8" onClick={saveCode}><Save className="h-3.5 w-3.5" /></Button>
        <Button size="sm" variant="ghost" className="h-8 text-destructive" onClick={removeCode}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
      <div className="flex items-center gap-2">
        {c.a_confirmar && <Badge variant="outline" className="text-[10px]">alíquotas a confirmar com Fiscal</Badge>}
        <label className="flex items-center gap-1 text-[11px]"><Switch checked={!!c.usa_aliquota_propria} onCheckedChange={(v) => setC({ ...c, usa_aliquota_propria: v })} />Alíquota própria (exceção)</label>
        <Button size="sm" variant="link" className="h-6 px-0 text-xs" onClick={() => setOpen(!open)}>
          {open ? "Ocultar" : "Ver"} alíquotas ({c.usa_aliquota_propria ? rates.length : efetivas.length})
        </Button>
      </div>
      {open && !c.usa_aliquota_propria && (
        <div className="pl-2 text-[11px] text-muted-foreground space-y-0.5">
          <p>Herdadas do código de serviço {servicos.find((x) => x.id === c.service_code_id)?.lc116_item ?? "—"} (edite em Códigos de serviço):</p>
          {efetivas.length === 0 ? <p className="text-destructive">Nenhuma alíquota — vincule um código de serviço com ISS cadastrado.</p> : efetivas.map((r) => (
            <p key={r.id} className="tabular-nums">{r.municipio}: PIS {r.pis_perc}% · COFINS {r.cofins_perc}% · ISS {r.iss_perc}%{r.a_confirmar ? " · a confirmar" : ""}</p>
          ))}
        </div>
      )}
      {open && c.usa_aliquota_propria && (
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

type Filtro = "todas" | OfertaFiscal | "geral";

export default function CadastroTributarioTab() {
  const { codes, rates, proprias, servicos, iss, loading, refresh } = useTaxCodes();
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const grupos = useMemo(() => {
    const defs: { key: string; label: string; match: (c: TaxCode) => boolean }[] = [
      ...OFERTAS_FISCAIS.map((o) => ({ key: o.value, label: o.label, match: (c: TaxCode) => !!c.ofertas?.includes(o.value) })),
      { key: "geral", label: "Sem oferta (não aparece em nenhum configurador)", match: (c: TaxCode) => !c.ofertas?.length },
    ];
    return defs.filter((d) => filtro === "todas" || d.key === filtro).map((d) => ({ ...d, itens: codes.filter(d.match) }));
  }, [codes, filtro]);
  const addCode = async () => {
    const codigo = prompt("Código Protheus:");
    if (!codigo) return;
    const ofertas = filtro !== "todas" && filtro !== "geral" ? [filtro] : [];
    const { error } = await supabase.from("tax_product_codes").insert({ codigo, nome: codigo, a_confirmar: true, ofertas, service_code_id: servicos[0]?.id ?? null, lc116_item: servicos[0]?.lc116_item ?? null });
    if (error) return toast.error(error.message);
    refresh();
  };
  return (
    <div className="space-y-4">
    <ParametrosFinanceirosCard />
    <ReformaCBSCard />
    <CodigosServicoSection servicos={servicos} iss={iss} codes={codes} refresh={refresh} />
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0 gap-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> Cadastro tributário de produtos</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Produtos de faturamento do Protheus. Cada produto escolhe um código de serviço (LC 116) e herda dele PIS, COFINS e ISS; use "Alíquota própria" só para exceções. Cada configurador mostra só os produtos
            marcados com a sua oferta; um produto pode servir a várias. Alterações aqui valem para todas as precificações.
          </p>
        </div>
        <Button size="sm" className="gap-1 shrink-0" onClick={addCode}><Plus className="h-3.5 w-3.5" /> Produto</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="todas">Todas</TabsTrigger>
            {OFERTAS_FISCAIS.map((o) => <TabsTrigger key={o.value} value={o.value}>{o.label}</TabsTrigger>)}
            <TabsTrigger value="geral">Sem oferta</TabsTrigger>
          </TabsList>
        </Tabs>
        {loading ? <p className="text-sm text-muted-foreground">Carregando…</p> : grupos.map((g) => (
          <section key={g.key} className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{g.label}</h3>
              <Badge variant="secondary" className="text-[10px]">{g.itens.length}</Badge>
            </div>
            <div className="grid grid-cols-[120px_1fr_70px_220px_auto_auto_auto_auto] gap-2 px-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              <span>Código Protheus</span><span>SKU (descrição do produto)</span><span>Código de serviço</span><span>Oferta</span><span /><span /><span /><span />
            </div>
            {g.itens.length === 0 ? <p className="text-xs text-muted-foreground px-2">Nenhum produto.</p> : g.itens.map((c) => (
              <CodeRow key={c.id + c.codigo + (c.ofertas ?? []).join() + c.service_code_id + c.usa_aliquota_propria} code={c} rates={proprias.filter((r) => r.tax_product_code_id === c.id)} efetivas={rates.filter((r) => r.tax_product_code_id === c.id)} servicos={servicos} refresh={refresh} />
            ))}
          </section>
        ))}
      </CardContent>
    </Card>
    </div>
  );
}
