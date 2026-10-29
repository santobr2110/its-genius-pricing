import { useEffect, useMemo, useState } from "react";
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
import { useTaxCodes } from "@/hooks/useTaxCodes";
import { STATUS_LABEL, STATUS_PENDENTES, type StatusParam } from "@/lib/treinamento/types";
import type { BodyshopParam } from "@/lib/bodyshop/calc";
import type { BsCadastro } from "@/hooks/useBodyshopCadastro";

const STATUS = Object.keys(STATUS_LABEL) as StatusParam[];

export default function BsParametrosTab({ params, refresh }: BsCadastro) {
  const { user } = useAuth();
  const tax = useTaxCodes() as unknown as { codes?: { codigo: string; nome: string; ofertas?: string[] }[] };
  const skus = useMemo(() => (tax.codes ?? []).filter((c) => (c.ofertas ?? []).includes("bodyshop")), [tax.codes]);
  const [rows, setRows] = useState<BodyshopParam[]>(params);
  useEffect(() => setRows(params), [params]);
  const set = (key: string, patch: Partial<BodyshopParam>) => setRows((p) => p.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const sujos = rows.filter((r) => {
    const o = params.find((p) => p.key === r.key);
    return o && (JSON.stringify(o.value) !== JSON.stringify(r.value) || o.status !== r.status);
  });

  const salvar = async () => {
    for (const r of sujos) {
      const res = await supabase.from("bodyshop_params").update({ value: r.value as never, status: r.status, updated_by: user?.id ?? null }).eq("key", r.key);
      if (res.error) return toast.error(res.error.message);
    }
    toast.success("Parâmetros salvos"); refresh();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="text-base">Parâmetros do BodyShop</CardTitle>
          <p className="text-xs text-muted-foreground">Valores gerais herdados por todos os cargos sem exceção. Comissão vazia usa a tabela da empresa.</p>
        </div>
        <Button onClick={salvar} disabled={sujos.length === 0}>Salvar{sujos.length ? ` (${sujos.length})` : ""}</Button>
      </CardHeader>
      <CardContent className="divide-y">
        {rows.filter(r => r.key !== "irpj_csll_convencao").map((r) => (
          <div key={r.key} className="grid grid-cols-1 md:grid-cols-[1fr_220px_160px] items-center gap-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-medium flex items-center gap-2">{r.label}
                {STATUS_PENDENTES.includes(r.status) && <Badge variant="outline" className="text-[10px]">{STATUS_LABEL[r.status]}</Badge>}</p>
              {r.descricao && <p className="text-[11px] text-muted-foreground">{r.descricao}</p>}
            </div>
            {r.tipo === "boolean" ? (
              <Switch checked={r.value === true} onCheckedChange={(v) => set(r.key, { value: v })} aria-label={r.label} />
            ) : r.key === "produto_padrao" ? (
              <Select value={String(r.value ?? "")} onValueChange={(v) => set(r.key, { value: v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="SKU" /></SelectTrigger>
                <SelectContent>{(skus.length ? skus : [{ codigo: String(r.value ?? "BS"), nome: "" }]).map((c) => (
                  <SelectItem key={c.codigo} value={c.codigo}>{c.codigo}</SelectItem>))}</SelectContent>
              </Select>
            ) : r.key === "irpj_csll_convencao" ? (
              <Select value={String(r.value ?? "padrao_site")} onValueChange={(v) => set(r.key, { value: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="padrao_site">Padrão do site</SelectItem></SelectContent>
              </Select>
            ) : r.tipo === "text" && r.key.startsWith("proposta_") && r.key !== "proposta_cidade" ? (
              <Textarea rows={3} value={String(r.value ?? "")} placeholder="Vazio = [A CONFIRMAR]" onChange={(e) => set(r.key, { value: e.target.value })} />
            ) : r.tipo === "text" ? (
              <Input value={String(r.value ?? "")} placeholder={r.key === "comissao_regra" ? "Vazio = tabela da empresa" : "Vazio"} onChange={(e) => set(r.key, { value: e.target.value === "" ? null : e.target.value })} />
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
