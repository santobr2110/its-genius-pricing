import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { STATUS_LABEL, STATUS_PENDENTES, type StatusParam } from "@/lib/treinamento/types";
import type { SreParam } from "@/lib/sre/calc";
import type { SreCadastro } from "@/hooks/useSreCadastro";

const STATUS = Object.keys(STATUS_LABEL) as StatusParam[];
// Editados em Financeiro › Impostos & Markup (Fase 4): não repetir aqui.
const OCULTOS = ["comissao_regra", "irpj_csll_convencao", "produto_padrao"];

export default function SreParametrosTab({ params, refresh }: SreCadastro) {
  const { user } = useAuth();
  const filtrados = useMemo(() => params.filter((p) => !OCULTOS.includes(p.key)), [params]);
  const [rows, setRows] = useState<SreParam[]>(filtrados);
  useEffect(() => setRows(filtrados), [filtrados]);
  const set = (key: string, patch: Partial<SreParam>) => setRows((p) => p.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const sujos = rows.filter((r) => {
    const o = params.find((p) => p.key === r.key);
    return o && (JSON.stringify(o.value) !== JSON.stringify(r.value) || o.status !== r.status);
  });

  const salvar = async () => {
    for (const r of sujos) {
      const res = await supabase.from("sre_params").update({ value: r.value as never, status: r.status, updated_by: user?.id ?? null }).eq("key", r.key);
      if (res.error) return toast.error(res.error.message);
    }
    toast.success("Parâmetros salvos"); refresh();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="text-base">Parâmetros dos Pacotes Consultivos SRE</CardTitle>
          <p className="text-xs text-muted-foreground">Valores gerais herdados pelos pacotes. Sem piso de rentabilidade: a rentabilidade é exibida e o vendedor decide.</p>
        </div>
        <Button onClick={salvar} disabled={sujos.length === 0}>Salvar{sujos.length ? ` (${sujos.length})` : ""}</Button>
      </CardHeader>
      <CardContent className="divide-y">
        {rows.map((r) => (
          <div key={r.key} className="grid grid-cols-1 md:grid-cols-[1fr_260px_160px] items-center gap-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-medium flex items-center gap-2">
                {r.label}
                {STATUS_PENDENTES.includes(r.status) && <Badge variant="outline" className="text-[10px]">{STATUS_LABEL[r.status]}</Badge>}
              </p>
              {r.descricao && <p className="text-[11px] text-muted-foreground">{r.descricao}</p>}
            </div>
            {r.tipo === "text" && r.key.startsWith("proposta_") && r.key !== "proposta_cidade" ? (
              <Textarea rows={3} value={String(r.value ?? "")} placeholder="Vazio = [A CONFIRMAR]" onChange={(e) => set(r.key, { value: e.target.value })} />
            ) : r.tipo === "text" ? (
              <Input value={String(r.value ?? "")} onChange={(e) => set(r.key, { value: e.target.value })} />
            ) : (
              <div className="flex items-center gap-1">
                <Input type="number" step="0.01" value={r.value == null ? "" : Number(r.value)} placeholder="Vazio"
                  onChange={(e) => set(r.key, { value: e.target.value === "" ? null : Number(e.target.value) })} />
                <span className="text-xs text-muted-foreground w-6">{r.tipo === "percent" ? "%" : ""}</span>
              </div>
            )}
            <Select value={r.status} onValueChange={(v) => set(r.key, { status: v as StatusParam })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
