import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDown, ArrowUp, Copy, Pencil, Plus, Trash2, Undo2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTaxCodes } from "@/hooks/useTaxCodes";
import { useParametrosFinanceiros } from "@/hooks/useParametrosFinanceiros";
import { taxPorProdutoFactory } from "@/lib/pricing/taxRates";
import { paramsFromRows, type SrePacote } from "@/lib/sre/calc";
import { computeLinhaSre, montarEntradas, type GlobaisSre } from "@/lib/sre/carrinho";
import type { SreCadastro } from "@/hooks/useSreCadastro";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const num = (n: number, d = 3) => n.toLocaleString("pt-BR", { maximumFractionDigits: d });
type Override = "pct_horas_gestao" | "custo_hora_execucao" | "custo_hora_gestao" | "codigo_produto";
type Form = Omit<SrePacote, "id" | "campos_a_confirmar"> & { id: string | null };

const VAZIO: Form = { id: null, slug: "", part_number: "", nome: "", descricao: null, horas_execucao: 0, pct_horas_gestao: null,
  custo_hora_execucao: null, custo_hora_gestao: null, codigo_produto: null, ativo: true, ordem: 0 };

export default function SrePacotesTab({ pacotes, params, refresh }: SreCadastro) {
  const prm = useMemo(() => paramsFromRows(params), [params]);
  const tax = useTaxCodes();
  const central = useParametrosFinanceiros();
  const [filtro, setFiltro] = useState<"todos" | "ativos" | "inativos">("todos");
  const [ed, setEd] = useState<Form | null>(null);
  const skus = useMemo(() => tax.codes.filter((c) => (c.ofertas ?? []).includes("consultivo-sre")), [tax.codes]);

  // Conferência ao vivo: mesma conta do configurador, município padrão, sem desconto nem campanha.
  const calc = useMemo(() => {
    const g: GlobaisSre = { comissaoFixaPerc: prm.comissaoFixaPerc, retencaoPerc: prm.retencaoPerc, irpjCsllPerc: central.irpjCsllPerc,
      irpjCsllConvencao: prm.irpjCsllConvencao, encFinancPerc: prm.encFinancPerc, descontoTotalPerc: 0, campanha: null };
    const taxFn = taxPorProdutoFactory(prm.municipioPadrao, new Date().toISOString().slice(0, 10), tax.codes, tax.rates);
    const ent = montarEntradas(pacotes.map((p) => ({ id: p.id, pacoteId: p.id, quantidade: 1, descontoPerc: 0 })), pacotes, prm, taxFn, prm.rentabilidadePadraoPerc);
    return new Map(ent.map((e) => [e.pacoteId, computeLinhaSre(e, g, central.comissaoTiers)]));
  }, [pacotes, prm, tax.codes, tax.rates, central]);

  const lista = pacotes.filter((p) => filtro === "todos" || (filtro === "ativos" ? p.ativo : !p.ativo));
  const escada = pacotes.filter((p) => p.ativo).map((p) => ({ horas: Number(p.horas_execucao), valorHora: calc.get(p.id)?.valorHoraExecucao ?? 0, pn: p.part_number }))
    .filter((x) => x.valorHora > 0).sort((a, b) => a.horas - b.horas);

  const salvar = async () => {
    if (!ed) return;
    if (!ed.part_number.trim() || !ed.nome.trim()) return toast.error("Informe part number e nome.");
    if (!(ed.horas_execucao > 0)) return toast.error("Horas de execução devem ser maiores que zero.");
    const { id, ...d } = ed;
    const dados = { ...d, part_number: d.part_number.trim(), slug: d.slug.trim() || d.part_number.trim().toLowerCase(), codigo_produto: d.codigo_produto?.trim() || null };
    const res = id ? await supabase.from("sre_pacotes").update(dados).eq("id", id)
      : await supabase.from("sre_pacotes").insert({ ...dados, ordem: Math.max(0, ...pacotes.map((p) => p.ordem)) + 10 }).select("id").single();
    if (res.error) return toast.error(res.error.message.includes("duplicate") ? "Já existe um pacote com esse part number ou slug." : res.error.message);
    if (!id && res.data) await supabase.from("sre_pacote_content").insert({ pacote_id: (res.data as { id: string }).id, a_confirmar: true });
    toast.success("Pacote salvo"); setEd(null); refresh();
  };

  const patch = async (id: string, p: Partial<SrePacote>) => {
    const res = await supabase.from("sre_pacotes").update(p).eq("id", id);
    if (res.error) return toast.error(res.error.message);
    refresh();
  };

  const mover = async (i: number, dir: -1 | 1) => {
    const a = lista[i], b = lista[i + dir];
    if (!a || !b) return;
    await supabase.from("sre_pacotes").update({ ordem: b.ordem }).eq("id", a.id);
    await supabase.from("sre_pacotes").update({ ordem: a.ordem }).eq("id", b.id);
    refresh();
  };

  const excluir = async (p: SrePacote) => {
    if (!confirm(`Excluir o pacote ${p.part_number}? Cotações já salvas continuam com os valores congelados.`)) return;
    const res = await supabase.from("sre_pacotes").delete().eq("id", p.id);
    if (res.error) return toast.error(res.error.message);
    refresh();
  };

  const herdado = (p: SrePacote, k: Override, valorHerdado: string, fmt: (v: number | string) => string) => {
    const v = p[k];
    return v == null ? (
      <div className="flex items-center justify-end gap-1">
        <span className="text-muted-foreground tabular-nums">{valorHerdado}</span>
        <Badge variant="outline" className="text-[9px] text-muted-foreground" title="Herdado do parâmetro">herdado</Badge>
      </div>
    ) : (
      <div className="flex items-center justify-end gap-1">
        <span className="font-semibold tabular-nums">{fmt(v as number)}</span>
        <Button size="icon" variant="ghost" className="h-6 w-6" title="Voltar a herdar do parâmetro" onClick={() => patch(p.id, { [k]: null } as Partial<SrePacote>)}><Undo2 className="h-3 w-3" /></Button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Valor por hora por pacote</CardTitle>
          <p className="text-xs text-muted-foreground">Valor por hora de execução contra o tamanho do pacote (município {prm.municipioPadrao}, sem desconto, rentabilidade padrão de {num(prm.rentabilidadePadraoPerc)}%). Na venda, o vendedor define a rentabilidade da cotação.</p>
        </CardHeader>
        <CardContent className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={escada} margin={{ left: 8, right: 16, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="horas" scale="log" domain={["dataMin", "dataMax"]} type="number" ticks={escada.map((x) => x.horas)} tick={{ fontSize: 10 }} />
              <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10 }} tickFormatter={(v) => `R$ ${Math.round(v)}`} width={60} />
              <Tooltip formatter={(v: number) => brl(v)} labelFormatter={(h) => `${h} horas`} />
              <Line type="monotone" dataKey="valorHora" name="Valor/hora" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Pacotes de horas</CardTitle>
            <p className="text-xs text-muted-foreground">Nenhum preço é digitado: custo, preço e valor por hora saem da conta. Valores em cinza são herdados dos Parâmetros; use o lápis para criar uma exceção.</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filtro} onValueChange={(v) => setFiltro(v as typeof filtro)}>
              <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="ativos">Ativos</SelectItem><SelectItem value="inativos">Inativos</SelectItem></SelectContent>
            </Select>
            <Button size="sm" onClick={() => setEd({ ...VAZIO })}><Plus className="h-4 w-4 mr-1" /> Novo</Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Ordem</TableHead>
                <TableHead>Part number</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="text-right">Horas exec.</TableHead>
                <TableHead className="text-right">Horas gestão</TableHead>
                <TableHead className="text-right">% gestão</TableHead>
                <TableHead className="text-right">Custo h exec.</TableHead>
                <TableHead className="text-right">Custo h gestão</TableHead>
                <TableHead className="text-right">Produto</TableHead>
                <TableHead className="text-right">Custo</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead className="text-right">R$/hora</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((p, i) => {
                const r = calc.get(p.id);
                const ok = r && r.erros.length === 0;
                return (
                  <TableRow key={p.id} className={p.ativo ? "" : "opacity-60"}>
                    <TableCell>
                      <div className="flex">
                        <Button size="icon" variant="ghost" className="h-6 w-6" disabled={i === 0} onClick={() => mover(i, -1)} aria-label="Subir"><ArrowUp className="h-3 w-3" /></Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" disabled={i === lista.length - 1} onClick={() => mover(i, 1)} aria-label="Descer"><ArrowDown className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium whitespace-nowrap">{p.part_number}</TableCell>
                    <TableCell className="text-xs max-w-[220px] truncate" title={p.nome}>{p.nome}</TableCell>
                    <TableCell className="text-right tabular-nums">{num(Number(p.horas_execucao), 1)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{r ? num(r.entrada.horasExecucao * r.entrada.pctHorasGestao / 100, 1) : "—"}</TableCell>
                    <TableCell className="text-right text-xs">{herdado(p, "pct_horas_gestao", `${num(prm.pctHorasGestao)}%`, (v) => `${num(Number(v))}%`)}</TableCell>
                    <TableCell className="text-right text-xs">{herdado(p, "custo_hora_execucao", brl(prm.custoHoraExecucao), (v) => brl(Number(v)))}</TableCell>
                    <TableCell className="text-right text-xs">{herdado(p, "custo_hora_gestao", brl(prm.custoHoraGestao), (v) => brl(Number(v)))}</TableCell>
                    <TableCell className="text-right text-xs">{herdado(p, "codigo_produto", prm.produtoPadrao, (v) => String(v))}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{ok ? brl(r.custoLinha) : "—"}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs font-semibold">{ok ? brl(r.precoTabela) : <span className="text-destructive" title={r?.erros.join(" ")}>erro</span>}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{ok ? brl(r.valorHoraExecucao) : "—"}</TableCell>
                    <TableCell><Switch checked={p.ativo} onCheckedChange={(v) => patch(p.id, { ativo: v })} aria-label={`Ativo ${p.part_number}`} /></TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Editar / criar exceção" onClick={() => setEd({ ...p })}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Duplicar" onClick={() => setEd({ ...p, id: null, slug: `${p.slug}-copia`, part_number: `${p.part_number}-COPIA`, ativo: false })}><Copy className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Excluir" onClick={() => excluir(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!ed} onOpenChange={(o) => !o && setEd(null)}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader><DialogTitle>{ed?.id ? `Editar ${ed.part_number}` : "Novo pacote"}</DialogTitle></DialogHeader>
          {ed && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Part number</Label><Input value={ed.part_number} onChange={(e) => setEd({ ...ed, part_number: e.target.value })} /></div>
              <div><Label className="text-xs">Slug (vazio = part number)</Label><Input value={ed.slug} onChange={(e) => setEd({ ...ed, slug: e.target.value })} /></div>
              <div className="col-span-2"><Label className="text-xs">Nome comercial</Label><Input value={ed.nome} onChange={(e) => setEd({ ...ed, nome: e.target.value })} /></div>
              <div><Label className="text-xs">Horas de execução</Label><Input type="number" value={ed.horas_execucao} onChange={(e) => setEd({ ...ed, horas_execucao: Number(e.target.value) })} /></div>
              <OverrideField label="% horas de gestão" inicial={prm.pctHorasGestao} herdado={`${num(prm.pctHorasGestao)}%`} value={ed.pct_horas_gestao} onChange={(v) => setEd({ ...ed, pct_horas_gestao: v })} />
              <OverrideField label="Custo hora de execução (R$)" inicial={prm.custoHoraExecucao} herdado={brl(prm.custoHoraExecucao)} value={ed.custo_hora_execucao} onChange={(v) => setEd({ ...ed, custo_hora_execucao: v })} />
              <OverrideField label="Custo hora de gestão (R$)" inicial={prm.custoHoraGestao} herdado={brl(prm.custoHoraGestao)} value={ed.custo_hora_gestao} onChange={(v) => setEd({ ...ed, custo_hora_gestao: v })} />
              <div>
                <Label className="text-xs">Produto fiscal</Label>
                <Select value={ed.codigo_produto ?? "__herda"} onValueChange={(v) => setEd({ ...ed, codigo_produto: v === "__herda" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__herda">Herdar do parâmetro ({prm.produtoPadrao})</SelectItem>
                    {skus.map((c) => <SelectItem key={c.codigo} value={c.codigo}>{c.codigo} · {c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 flex items-center gap-2"><Switch checked={ed.ativo} onCheckedChange={(v) => setEd({ ...ed, ativo: v })} /><Label>Ativo</Label></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEd(null)}>Cancelar</Button>
            <Button onClick={salvar}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Campo herdável: NULL mostra o herdado em cinza; "Criar exceção" grava valor próprio (inclusive 0). */
function OverrideField({ label, inicial, herdado, value, onChange }: { label: string; inicial: number; herdado: string; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      {value == null ? (
        <div className="flex items-center gap-2 h-10">
          <span className="text-sm text-muted-foreground">{herdado}</span>
          <Badge variant="outline" className="text-[9px] text-muted-foreground">herdado do parâmetro</Badge>
          <Button size="sm" variant="outline" className="h-7 ml-auto text-xs" onClick={() => onChange(inicial)}>Criar exceção</Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Input type="number" step="0.01" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} />
          <Button size="sm" variant="ghost" className="h-7 text-xs shrink-0" onClick={() => onChange(null)}><Undo2 className="h-3 w-3 mr-1" /> Herdar</Button>
        </div>
      )}
    </div>
  );
}
