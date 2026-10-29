import { useEffect, useState } from "react";
import { Landmark, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useParametrosFinanceiros } from "@/hooks/useParametrosFinanceiros";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ParametrosFinanceirosCard() {
  const { user, can } = useAuth();
  const central = useParametrosFinanceiros();
  const [ir, setIr] = useState(String(central.irpjCsllPerc));
  const [tiers, setTiers] = useState(central.comissaoTiers);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setIr(String(central.irpjCsllPerc)); setTiers(central.comissaoTiers); }, [central.irpjCsllPerc, central.comissaoTiers]);
  const pode = can("params.save_defaults");
  const salvar = async () => {
    const n = Number(ir.replace(",", "."));
    if (!ir.trim() || !Number.isFinite(n) || n < 0 || n >= 100) return toast.error("Informe IRPJ/CSLL entre 0 e menos de 100%.");
    if (!tiers.length || tiers.some((t, i) => !Number.isFinite(t.minRent) || t.minRent < 0 || !Number.isFinite(t.comissao) || t.comissao < 0 || t.comissao >= 100 || (t.maxRent != null && (!Number.isFinite(t.maxRent) || t.maxRent < t.minRent)) || (i > 0 && (tiers[i - 1].maxRent == null || t.minRent <= (tiers[i - 1].maxRent ?? 0))))) return toast.error("Confira os percentuais e a ordem das faixas, sem sobreposição.");
    setSaving(true);
    try { await central.salvar({ irpjCsllPerc: n, comissaoTiers: tiers }, user?.id); toast.success("Parâmetros financeiros compartilhados salvos"); }
    catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  };
  return <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Landmark className="h-4 w-4 text-primary" />Parâmetros financeiros compartilhados</CardTitle></CardHeader><CardContent className="space-y-4">
    <div className="space-y-1"><Label htmlFor="central-irpj">IRPJ / CSLL sobre a venda (%)</Label><Input id="central-irpj" className="w-32" inputMode="decimal" value={ir} disabled={!pode || central.loading} onChange={e => setIr(e.target.value)} /></div>
    <h3 className="text-sm font-semibold">Escala Selbetti — comissão por rentabilidade</h3>
    <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-xs text-muted-foreground"><span>Rent. mínima (%)</span><span>Rent. máxima (%)</span><span>Comissão (%)</span><span className="w-9" /></div>
    {tiers.map((t, i) => <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
      {(["minRent", "maxRent", "comissao"] as const).map(k => <Input key={k} aria-label={`${k} faixa ${i + 1}`} type="number" step="0.01" value={t[k] ?? ""} placeholder={k === "maxRent" ? "Sem limite" : ""} disabled={!pode} onChange={e => setTiers(tiers.map((r, j) => j === i ? { ...r, [k]: k === "maxRent" && e.target.value === "" ? null : Number(e.target.value) } : r))} />)}
      <Button size="icon" variant="ghost" aria-label={`Remover faixa ${i + 1}`} disabled={!pode || tiers.length <= 1} onClick={() => setTiers(tiers.filter((_, j) => i !== j))}><Trash2 className="h-4 w-4" /></Button>
    </div>)}
    <div className="flex gap-2 justify-end"><Button variant="outline" size="sm" disabled={!pode} onClick={() => { const last = tiers[tiers.length - 1]; const min = (last?.maxRent ?? last?.minRent ?? 0) + 5; setTiers([...tiers.map((t, i) => i === tiers.length - 1 && t.maxRent == null ? { ...t, maxRent: min - 0.01 } : t), { minRent: min, maxRent: null, comissao: last?.comissao ?? 0 }]); }}><Plus className="h-4 w-4 mr-1" />Faixa</Button><Button size="sm" disabled={!pode || central.loading || saving} onClick={salvar}><Save className="h-4 w-4 mr-1" />Salvar parâmetros</Button></div>
  </CardContent></Card>;
}