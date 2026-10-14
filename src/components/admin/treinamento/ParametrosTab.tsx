import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { STATUS_LABEL, STATUS_PENDENTES, type StatusParam, type TrainingParam } from "@/lib/treinamento/types";
import type { CadastroProps } from "./TreinamentoAdminTab";

const STATUS = Object.keys(STATUS_LABEL) as StatusParam[];

export default function ParametrosTab({ params, refresh }: CadastroProps) {
  const { user } = useAuth();
  const [rows, setRows] = useState<TrainingParam[]>(params);
  useEffect(() => setRows(params), [params]);
  const set = (key: string, patch: Partial<TrainingParam>) => setRows((p) => p.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const sujos = rows.filter((r) => {
    const o = params.find((p) => p.key === r.key);
    return o && (JSON.stringify(o.value) !== JSON.stringify(r.value) || o.status !== r.status);
  });

  const salvar = async () => {
    for (const r of sujos) {
      const res = await supabase.from("training_params").update({ value: r.value as never, status: r.status, updated_by: user?.id ?? null }).eq("key", r.key);
      if (res.error) return toast.error(res.error.message);
    }
    toast.success("Parâmetros salvos");
    refresh();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="text-base">Parâmetros do Treinamento</CardTitle>
          <p className="text-xs text-muted-foreground">Valores oficiais usados no cálculo. Hospedagem e deslocamento não são custo: aparecem na proposta In Company como despesas da contratante.</p>
        </div>
        <Button onClick={salvar} disabled={sujos.length === 0}>Salvar{sujos.length ? ` (${sujos.length})` : ""}</Button>
      </CardHeader>
      <CardContent className="divide-y">
        {rows.filter((r) => r.key !== "comissao_regra").map((r) => (
          <div key={r.key} className="grid grid-cols-1 md:grid-cols-[1fr_180px_160px] items-center gap-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-medium flex items-center gap-2">
                {r.label}
                {STATUS_PENDENTES.includes(r.status) && <Badge variant="outline" className="text-[10px]">{STATUS_LABEL[r.status]}</Badge>}
              </p>
              {r.descricao && <p className="text-[11px] text-muted-foreground">{r.descricao}</p>}
            </div>
            {r.tipo === "boolean" ? (
              <Switch checked={r.value === true} onCheckedChange={(v) => set(r.key, { value: v })} aria-label={r.label} />
            ) : r.key === "observacoes_proposta" ? (
              <Textarea rows={4} className="md:col-span-1" value={String(r.value ?? "")} placeholder="Aparece no final de todas as propostas" onChange={(e) => set(r.key, { value: e.target.value })} />
            ) : r.tipo === "text" ? (
              <Input value={String(r.value ?? "")} placeholder={r.key === "comissao_regra" ? "Vazio = tabela da empresa" : undefined} onChange={(e) => set(r.key, { value: e.target.value })} />
            ) : (
              <div className="flex items-center gap-1">
                <Input type="number" step="0.01" value={Number(r.value ?? 0)} onChange={(e) => set(r.key, { value: Number(e.target.value) || 0 })} />
                <span className="text-xs text-muted-foreground w-6">{r.tipo === "percent" ? "%" : "R$"}</span>
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
