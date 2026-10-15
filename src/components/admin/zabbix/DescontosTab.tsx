import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { resolveDescontos, paramsFromRows, type CategoriaZbx } from "@/lib/zabbix/calc";
import type { ZbxCadastro } from "@/hooks/useZabbixCadastro";

const CATS: { c: CategoriaZbx; label: string }[] = [{ c: "suporte", label: "Suporte" }, { c: "academy", label: "Academy" }];
const CAMPOS = [
  { k: "ro", label: "Desconto RO" },
  { k: "sem_ro", label: "Desconto sem RO" },
  { k: "pgto30_ro", label: "Pagamento 30 dias (com RO)" },
  { k: "pgto30_sem_ro", label: "Pagamento 30 dias (sem RO)" },
];

export default function ZbxDescontosTab({ params, subs, refresh }: ZbxCadastro) {
  const { user } = useAuth();
  const orig = useMemo(() => Object.fromEntries(params.filter((p) => p.key.startsWith("desconto_")).map((p) => [p.key, p.value])), [params]);
  const [vals, setVals] = useState<Record<string, unknown>>(orig);
  useEffect(() => setVals(orig), [orig]);
  const sujos = Object.keys(vals).filter((k) => JSON.stringify(vals[k]) !== JSON.stringify(orig[k]));
  const zp = paramsFromRows(params);

  const salvar = async () => {
    for (const k of sujos) {
      const r = await supabase.from("zabbix_params").update({ value: (vals[k] ?? 0) as never, updated_by: user?.id ?? null }).eq("key", k);
      if (r.error) return toast.error(r.error.message);
    }
    toast.success("Descontos salvos");
    refresh();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="text-base">Descontos por categoria</CardTitle>
          <p className="text-xs text-muted-foreground">Valem para toda subscrição da categoria, exceto as que têm exceção própria no cadastro do SKU.</p>
        </div>
        <Button onClick={salvar} disabled={sujos.length === 0}>Salvar{sujos.length ? ` (${sujos.length})` : ""}</Button>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {CATS.map(({ c, label }) => {
          const excecoes = subs.filter((s) => s.categoria === c && Object.values(resolveDescontos(s, zp.descontos).origem).includes("sku"));
          return (
            <div key={c} className="space-y-3">
              <p className="text-sm font-semibold">{label}</p>
              {CAMPOS.map(({ k, label: l }) => {
                const key = `desconto_${k}_${c}`;
                return (
                  <div key={key} className="grid grid-cols-[1fr_120px] items-center gap-2">
                    <span className="text-sm">{l}</span>
                    <div className="flex items-center gap-1">
                      <Input type="number" step="0.01" value={vals[key] == null ? "" : Number(vals[key])}
                        onChange={(e) => setVals((v) => ({ ...v, [key]: e.target.value === "" ? 0 : Number(e.target.value) }))} />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  </div>
                );
              })}
              <div className="text-xs text-muted-foreground">
                Exceções: {excecoes.length === 0 ? "nenhuma" : excecoes.map((s) => <Badge key={s.id} variant="outline" className="mr-1 text-[10px]">{s.part_number}</Badge>)}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
