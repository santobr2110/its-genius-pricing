import { useEffect, useState } from "react";
import { Package, Save, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useITSMContext } from "@/contexts/ITSMContext";
import { useTaxCodes } from "@/hooks/useTaxCodes";
import { useITOVinculos } from "@/hooks/useITOFiscal";
import { COMPOSICOES_ITO, composicaoFiscalITO, type VinculosFiscaisITO } from "@/lib/pricing/itoFiscal";
import { codigoServeOferta } from "@/lib/pricing/taxRates";

export default function ITOFiscalCard() {
  const { user, can } = useAuth();
  const { state, fiscalITO } = useITSMContext();
  const cadastro = useTaxCodes();
  const registro = useITOVinculos();
  const [draft, setDraft] = useState<VinculosFiscaisITO>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => setDraft(registro.vinculos), [registro.vinculos]);
  const editavel = can("params.save_defaults");
  const produtos = cadastro.codes.filter((c) => c.ativo && codigoServeOferta(c, "smart-ito"));
  const municipios = [...new Set(cadastro.rates.filter((r) => produtos.some((c) => c.id === r.tax_product_code_id)).map((r) => r.municipio))].sort();
  const ativo = composicaoFiscalITO(state);
  const salvar = async () => {
    if (!user || !editavel) return;
    setSaving(true);
    try { await registro.salvar(draft, user.id); toast.success("Vínculos fiscais salvos."); }
    catch { toast.error("Não foi possível salvar os vínculos fiscais."); }
    finally { setSaving(false); }
  };
  return <Card>
    <CardHeader className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> Produto fiscal por composição</CardTitle>
        {editavel && <Button size="sm" onClick={salvar} disabled={saving || registro.loading || cadastro.loading || JSON.stringify(draft) === JSON.stringify(registro.vinculos)}><Save /> {saving ? "Salvando…" : "Salvar vínculos"}</Button>}
      </div>
      <div className="space-y-1 max-w-xs">
        <Label className="text-xs flex items-center gap-1"><MapPin className="h-3 w-3" /> Município de faturamento</Label>
        <Select value={fiscalITO.municipio} onValueChange={fiscalITO.setMunicipio}><SelectTrigger aria-label="Município de faturamento"><SelectValue /></SelectTrigger><SelectContent>{municipios.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
      </div>
      {state.fiscalITO && <div className="text-xs border border-primary/30 bg-primary/5 p-3 rounded-md space-y-1">
        <p className="font-semibold break-words">{state.fiscalITO.sku}</p>
        <p className="text-muted-foreground break-words">Protheus: {state.fiscalITO.codigo} · {state.fiscalITO.municipio} · PIS {state.fiscalITO.pisPerc}% · COFINS {state.fiscalITO.cofinsPerc}% · ISS {state.fiscalITO.issPerc}%</p>
      </div>}
      {state.modeloObservabilidade !== "niveis" && <p className="text-xs text-muted-foreground">Modelo clássico: tributação histórica preservada; sem nível M contratado.</p>}
      {state.modeloObservabilidade === "niveis" && !ativo && <p className="text-xs text-destructive">Sem produto fiscal para a composição selecionada. Confira a camada e o nível contratado.</p>}
      {ativo && !fiscalITO.loading && !fiscalITO.next && <p className="text-xs text-destructive">Sem produto ativo ou alíquota vigente para esta composição e município.</p>}
      {(registro.error || cadastro.error) && <p className="text-xs text-destructive">Não foi possível carregar o cadastro tributário.</p>}
      {fiscalITO.next && <Button variant="outline" size="sm" className="self-start" onClick={fiscalITO.aplicar}>Aplicar vínculo atual à cotação</Button>}
    </CardHeader>
    <CardContent className="space-y-2">
      {registro.loading || cadastro.loading ? <p className="text-sm text-muted-foreground">Carregando produtos…</p> : COMPOSICOES_ITO.map((c) => <div key={c.key} className={`grid grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)] items-center gap-2 border rounded-md p-3 ${ativo === c.key ? "border-primary/40 bg-primary/5" : "bg-background"}`}>
        <Label className="text-xs font-semibold">{c.label}</Label>
        <Select value={draft[c.key] ?? ""} disabled={!editavel || saving} onValueChange={(v) => setDraft((prev) => ({ ...prev, [c.key]: v }))}>
          <SelectTrigger aria-label={`SKU ${c.label}`} className="min-h-10 h-auto text-xs text-left [&>span]:whitespace-normal [&>span]:break-words"><SelectValue placeholder="Selecionar SKU" /></SelectTrigger>
          <SelectContent className="max-w-[calc(100vw-3rem)] max-h-80">{produtos.map((p) => <SelectItem key={p.id} value={p.codigo} className="text-xs"><span className="block whitespace-normal break-words">{p.nome}</span><span className="block text-muted-foreground text-[10px]">{p.codigo}</span></SelectItem>)}</SelectContent>
        </Select>
      </div>)}
    </CardContent>
  </Card>;
}