import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTaxCodes } from "@/hooks/useTaxCodes";
import { GROUPS } from "@/lib/offerings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Produto {
  id: string; sku_faturamento: string | null; part_number_interno: string | null; nome: string;
  grupo_slug: string; offering_slug: string; tax_product_code_id: string | null; ativo: boolean; observacao: string | null;
}

const OFERTAS = GROUPS.flatMap((g) => g.offerings.map((o) => ({ grupo: g.slug, slug: o.slug, label: `${g.name} · ${o.name}` })));

function Row({ p, refresh }: { p: Produto; refresh: () => void }) {
  const [v, setV] = useState(p);
  const { codes } = useTaxCodes();
  const save = async () => {
    const { id, ...rest } = v;
    const { error } = await supabase.from("catalog_products").update(rest).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Produto salvo");
    refresh();
  };
  const remove = async () => {
    if (!confirm(`Excluir ${v.nome}?`)) return;
    const { error } = await supabase.from("catalog_products").delete().eq("id", v.id);
    if (error) return toast.error(error.message);
    refresh();
  };
  return (
    <div className="grid grid-cols-[1fr_120px_140px_180px_160px_auto_auto_auto] gap-2 items-center">
      <Input className="h-8 text-xs" value={v.nome} onChange={(e) => setV({ ...v, nome: e.target.value })} />
      <Input className="h-8 text-xs" placeholder="PN interno" value={v.part_number_interno ?? ""} onChange={(e) => setV({ ...v, part_number_interno: e.target.value })} />
      <div className="relative">
        <Input className="h-8 text-xs" placeholder="SKU faturamento" value={v.sku_faturamento ?? ""} onChange={(e) => setV({ ...v, sku_faturamento: e.target.value || null })} />
        {!v.sku_faturamento && <Badge variant="outline" className="absolute -top-2 right-1 text-[9px] px-1 py-0 bg-background">a definir</Badge>}
      </div>
      <Select value={`${v.grupo_slug}/${v.offering_slug}`} onValueChange={(x) => { const [g, o] = x.split("/"); setV({ ...v, grupo_slug: g, offering_slug: o }); }}>
        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>{OFERTAS.map((o) => <SelectItem key={o.slug} value={`${o.grupo}/${o.slug}`} className="text-xs">{o.label}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={v.tax_product_code_id ?? "none"} onValueChange={(x) => setV({ ...v, tax_product_code_id: x === "none" ? null : x })}>
        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Código tributário" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none" className="text-xs">—</SelectItem>
          {codes.map((c) => <SelectItem key={c.id} value={c.id} className="text-xs">{c.codigo}</SelectItem>)}
        </SelectContent>
      </Select>
      <Switch checked={v.ativo} onCheckedChange={(x) => setV({ ...v, ativo: x })} />
      <Button size="sm" variant="outline" className="h-8" onClick={save}><Save className="h-3.5 w-3.5" /></Button>
      <Button size="sm" variant="ghost" className="h-8 text-destructive" onClick={remove}><Trash2 className="h-3.5 w-3.5" /></Button>
    </div>
  );
}

export default function ProdutosCatalogoTab() {
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState("all");
  const { data = [], isLoading } = useQuery({
    queryKey: ["catalog-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("catalog_products").select("*").order("nome");
      if (error) throw error;
      return data as Produto[];
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["catalog-products"] });
  const lista = data.filter((p) => filtro === "all" || p.offering_slug === filtro);
  const add = async () => {
    const o = OFERTAS.find((x) => x.slug === filtro) ?? OFERTAS[0];
    const { error } = await supabase.from("catalog_products").insert({ nome: "Novo produto", grupo_slug: o.grupo, offering_slug: o.slug });
    if (error) return toast.error(error.message);
    refresh();
  };
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 gap-2">
        <CardTitle className="text-base">Produtos</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={filtro} onValueChange={setFiltro}>
            <SelectTrigger className="h-8 w-[260px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Todas as ofertas</SelectItem>
              {OFERTAS.map((o) => <SelectItem key={o.slug} value={o.slug} className="text-xs">{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" className="gap-1" onClick={add}><Plus className="h-3.5 w-3.5" /> Produto</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-[1fr_120px_140px_180px_160px_auto_auto_auto] gap-2 text-[10px] text-muted-foreground">
          <span>Nome</span><span>PN interno</span><span>SKU faturamento</span><span>Oferta</span><span>Código tributário</span><span>Ativo</span><span /><span />
        </div>
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : lista.map((p) => <Row key={p.id} p={p} refresh={refresh} />)}
        {!isLoading && lista.length === 0 && <p className="text-sm text-muted-foreground">Nenhum produto.</p>}
      </CardContent>
    </Card>
  );
}
