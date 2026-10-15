import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useZabbixMatriz, type LinhaMatrizDb } from "@/hooks/useZabbixMatriz";
import type { SecaoMatriz } from "@/lib/zabbix/proposta";

const SECOES: { k: SecaoMatriz; t: string }[] = [
  { k: "recursos", t: "Recursos suportados" }, { k: "apoio", t: "Apoio operacional" },
  { k: "servicos", t: "Serviços especializados" }, { k: "extras", t: "Extras estratégicos e treinamentos" },
];
const NIVEIS = ["silver", "gold", "platinum", "enterprise", "global"] as const;
type Row = Omit<LinhaMatrizDb, "id"> & { id?: string };

export default function ZbxMatrizTab() {
  const { linhas, loading, refresh } = useZabbixMatriz();
  const { can } = useAuth();
  const admin = can("page.zbx.admin");
  const [rows, setRows] = useState<Row[]>([]);
  const [removidos, setRemovidos] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);
  useEffect(() => { setRows(linhas.map((l) => ({ ...l }))); setRemovidos([]); }, [linhas]);

  const set = (r: Row, patch: Partial<Row>) => setRows((xs) => xs.map((x) => (x === r ? { ...x, ...patch } : x)));
  const mover = (secao: SecaoMatriz, i: number, d: number) => setRows((xs) => {
    const sec = xs.filter((x) => x.secao === secao).sort((a, b) => a.ordem - b.ordem);
    const j = i + d; if (j < 0 || j >= sec.length) return xs;
    [sec[i], sec[j]] = [sec[j], sec[i]];
    const novo = new Map(sec.map((x, k) => [x, k + 1]));
    return xs.map((x) => (novo.has(x) ? { ...x, ordem: novo.get(x)! } : x));
  });

  const salvar = async () => {
    if (rows.some((r) => !r.recurso.trim())) return toast.error("Preencha o nome de todos os recursos.");
    setSalvando(true);
    try {
      if (removidos.length) { const { error } = await supabase.from("zabbix_matriz_niveis").delete().in("id", removidos); if (error) throw error; }
      const { data: u } = await supabase.auth.getUser();
      const payload = rows.map((r) => ({ ...r, recurso: r.recurso.trim(), updated_at: new Date().toISOString(), updated_by: u.user?.id ?? null }));
      const novos = payload.filter((r) => !r.id).map(({ id: _id, ...r }) => r);
      const exist = payload.filter((r) => r.id);
      if (exist.length) { const { error } = await supabase.from("zabbix_matriz_niveis").upsert(exist as never); if (error) throw error; }
      if (novos.length) { const { error } = await supabase.from("zabbix_matriz_niveis").insert(novos as never); if (error) throw error; }
      toast.success("Matriz de níveis salva");
      await refresh();
    } catch (e) { toast.error((e as Error).message); } finally { setSalvando(false); }
  };

  if (loading) return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</p>;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Comparativo de níveis exibido no Word da proposta (só quando há suporte). Use ✓ para incluso, – para não incluso, ou texto livre.</p>
        {admin && <Button onClick={salvar} disabled={salvando}>{salvando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}Salvar</Button>}
      </div>
      {SECOES.map(({ k, t }) => {
        const sec = rows.filter((r) => r.secao === k).sort((a, b) => a.ordem - b.ordem);
        return (
          <Card key={k}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0"><CardTitle className="text-base">{t}</CardTitle>
              {admin && <Button size="sm" variant="outline" onClick={() => setRows((xs) => [...xs, { secao: k, ordem: sec.length + 1, recurso: "", silver: "–", gold: "–", platinum: "–", enterprise: "–", global: "–", ativo: true }])}><Plus className="h-4 w-4 mr-1" />Linha</Button>}
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-1 min-w-[220px]">Recurso</th>{NIVEIS.map((n) => <th key={n} className="capitalize px-1">{n}</th>)}<th className="px-1">Ativo</th><th /></tr></thead>
                <tbody>
                  {sec.map((r, i) => (
                    <tr key={r.id ?? `n${i}`} className={r.ativo ? "" : "opacity-50"}>
                      <td className="py-1 pr-1"><Input disabled={!admin} value={r.recurso} onChange={(e) => set(r, { recurso: e.target.value })} /></td>
                      {NIVEIS.map((n) => <td key={n} className="px-1"><Input disabled={!admin} className="text-center min-w-[90px]" value={r[n]} onChange={(e) => set(r, { [n]: e.target.value })} /></td>)}
                      <td className="px-1"><Switch disabled={!admin} checked={r.ativo} onCheckedChange={(v) => set(r, { ativo: v })} /></td>
                      <td className="whitespace-nowrap">{admin && <>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => mover(k, i, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => mover(k, i, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { if (r.id) setRemovidos((x) => [...x, r.id!]); setRows((xs) => xs.filter((x) => x !== r)); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
