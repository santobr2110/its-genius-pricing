import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { paramsFromRows, resolvePacote, type SrePacote } from "@/lib/sre/calc";
import type { SreCadastro } from "@/hooks/useSreCadastro";

type Campo = "horas_execucao" | "rentabilidade_alvo_perc" | "pct_horas_gestao" | "custo_hora_execucao" | "custo_hora_gestao";
const OPCIONAIS: Campo[] = ["pct_horas_gestao", "custo_hora_execucao", "custo_hora_gestao"];

export default function SrePacotesTab({ pacotes, params, refresh }: SreCadastro) {
  const prm = useMemo(() => paramsFromRows(params), [params]);
  const [rows, setRows] = useState<SrePacote[]>(pacotes);
  useEffect(() => setRows(pacotes), [pacotes]);
  const set = (id: string, patch: Partial<SrePacote>) => setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const sujos = rows.filter((r) => JSON.stringify(r) !== JSON.stringify(pacotes.find((p) => p.id === r.id)));

  const salvar = async () => {
    for (const r of sujos) {
      const { id, horas_execucao, rentabilidade_alvo_perc, pct_horas_gestao, custo_hora_execucao, custo_hora_gestao, codigo_produto, ativo, part_number, nome } = r;
      const res = await supabase.from("sre_pacotes").update({ horas_execucao, rentabilidade_alvo_perc, pct_horas_gestao, custo_hora_execucao, custo_hora_gestao, codigo_produto: codigo_produto?.trim() || null, ativo, part_number, nome }).eq("id", id);
      if (res.error) return toast.error(`${r.part_number}: ${res.error.message}`);
    }
    toast.success("Pacotes salvos"); refresh();
  };

  const num = (r: SrePacote, k: Campo, herdado?: number) => (
    <Input type="number" step="0.001" className="h-8 w-24 text-right" value={r[k] == null ? "" : Number(r[k])}
      placeholder={herdado != null ? String(herdado) : undefined}
      title={herdado != null && r[k] == null ? "Herdado do parâmetro geral" : undefined}
      onChange={(e) => set(r.id, { [k]: e.target.value === "" ? (OPCIONAIS.includes(k) ? null : 0) : Number(e.target.value) } as Partial<SrePacote>)} />
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="text-base">Pacotes de horas</CardTitle>
          <p className="text-xs text-muted-foreground">O preço nasce do custo e da rentabilidade alvo de cada pacote. Campos em cinza herdam o parâmetro geral; preencher cria exceção (inclusive 0).</p>
        </div>
        <Button onClick={salvar} disabled={sujos.length === 0}>Salvar{sujos.length ? ` (${sujos.length})` : ""}</Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Part number</TableHead>
              <TableHead className="text-right">Horas</TableHead>
              <TableHead className="text-right">Rentab. alvo %</TableHead>
              <TableHead className="text-right">% gestão</TableHead>
              <TableHead className="text-right">Custo h exec.</TableHead>
              <TableHead className="text-right">Custo h gestão</TableHead>
              <TableHead>Produto fiscal</TableHead>
              <TableHead>Ativo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const res = resolvePacote(r, prm);
              return (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap font-medium">{r.part_number}</TableCell>
                  <TableCell className="text-right">{num(r, "horas_execucao")}</TableCell>
                  <TableCell className="text-right">{num(r, "rentabilidade_alvo_perc")}</TableCell>
                  <TableCell className="text-right">{num(r, "pct_horas_gestao", prm.pctHorasGestao)}</TableCell>
                  <TableCell className="text-right">{num(r, "custo_hora_execucao", prm.custoHoraExecucao)}</TableCell>
                  <TableCell className="text-right">{num(r, "custo_hora_gestao", prm.custoHoraGestao)}</TableCell>
                  <TableCell>
                    <Input className="h-8 w-24" value={r.codigo_produto ?? ""} placeholder={res.codigoProduto}
                      onChange={(e) => set(r.id, { codigo_produto: e.target.value || null })} />
                  </TableCell>
                  <TableCell><Switch checked={r.ativo} onCheckedChange={(v) => set(r.id, { ativo: v })} aria-label={`Ativo ${r.part_number}`} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
