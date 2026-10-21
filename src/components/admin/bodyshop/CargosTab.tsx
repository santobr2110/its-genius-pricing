import { useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Copy, Pencil, Plus, Trash2, Upload, Undo2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTaxCodes } from "@/hooks/useTaxCodes";
import type { BsCadastro } from "@/hooks/useBodyshopCadastro";
import { FAIXAS, brl, custoMensal, resolverCargo, salarioFaixa, type BodyshopCargo } from "@/lib/bodyshop/calc";
import { NIVEL_SENIORIDADE } from "@/lib/profissionais/parsers";
import { parseCargosFile, planejarImport, lerConteudoArquivo, anexarConteudo, CAMPOS_CONTEUDO, ROTULO_CONTEUDO, type PlanoImport, type ConteudoImport } from "@/lib/bodyshop/import";

type Override = "beneficios_mensais" | "encargos_perc" | "indiretos_perc" | "horas_mensais" | "piso_rentabilidade_perc" | "codigo_produto";
const OVERRIDES: { k: Override; label: string; un: string; texto?: boolean }[] = [
  { k: "encargos_perc", label: "Encargos", un: "%" },
  { k: "indiretos_perc", label: "Indiretos", un: "%" },
  { k: "beneficios_mensais", label: "Benefícios mensais", un: "R$" },
  { k: "horas_mensais", label: "Horas mensais", un: "h" },
  { k: "piso_rentabilidade_perc", label: "Piso de rentabilidade", un: "%" },
  { k: "codigo_produto", label: "Produto fiscal (SKU)", un: "", texto: true },
];
const TODAS = "__todas__";

const novoCargo = (ordem: number): Partial<BodyshopCargo> => ({
  cargo: "", area: "", nivel_num: 1, senioridade: "Júnior", ativo: true, ordem, campos_a_confirmar: [],
  vigencia_inicio: new Date().toISOString().slice(0, 10),
});

export default function BsCargosTab({ cargos, p, refresh }: BsCadastro) {
  const [area, setArea] = useState(TODAS);
  const [sen, setSen] = useState(TODAS);
  const [ativo, setAtivo] = useState<"todos" | "ativos" | "inativos">("todos");
  const [edit, setEdit] = useState<Partial<BodyshopCargo> | null>(null);
  const tax = useTaxCodes() as unknown as { codes?: { codigo: string; nome: string; ofertas?: string[] }[] };
  const skus = useMemo(() => (tax.codes ?? []).filter((c) => (c.ofertas ?? []).includes("bodyshop")), [tax.codes]);

  const areas = useMemo(() => Array.from(new Set(cargos.map((c) => c.area).filter(Boolean))) as string[], [cargos]);
  const lista = cargos.filter((c) => (area === TODAS || c.area === area) && (sen === TODAS || c.senioridade === sen)
    && (ativo === "todos" || (ativo === "ativos") === c.ativo));

  const salvar = async () => {
    if (!edit?.cargo?.trim()) return toast.error("Informe o cargo");
    const { id, ...rest } = edit as BodyshopCargo;
    const r = id ? await supabase.from("bodyshop_cargos").update(rest).eq("id", id) : await supabase.from("bodyshop_cargos").insert(rest as never);
    if (r.error) return toast.error(r.error.message);
    toast.success("Cargo salvo"); setEdit(null); refresh();
  };
  const patch = async (id: string, v: Partial<BodyshopCargo>) => {
    const r = await supabase.from("bodyshop_cargos").update(v).eq("id", id);
    if (r.error) toast.error(r.error.message); else refresh();
  };
  const mover = async (i: number, d: -1 | 1) => {
    const a = lista[i], b = lista[i + d];
    if (!a || !b) return;
    const oa = a.ordem === b.ordem ? i : a.ordem, ob = a.ordem === b.ordem ? i + d : b.ordem;
    await supabase.from("bodyshop_cargos").update({ ordem: ob }).eq("id", a.id);
    await supabase.from("bodyshop_cargos").update({ ordem: oa }).eq("id", b.id);
    refresh();
  };
  const duplicar = (c: BodyshopCargo) => { const { id: _i, slug: _s, ...rest } = c; setEdit({ ...rest, cargo: `${c.cargo} (cópia)` }); };
  const excluir = async (c: BodyshopCargo) => {
    if (!confirm(`Excluir ${c.cargo} · ${c.senioridade}?`)) return;
    const r = await supabase.from("bodyshop_cargos").delete().eq("id", c.id);
    if (r.error) toast.error(r.error.message); else refresh();
  };

  const resolvido = edit ? resolverCargo(edit as BodyshopCargo, p) : null;
  const custoEdit = edit && resolvido ? custoMensal(Number(edit.salario_c3) || 0, resolvido) : null;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle className="text-base">Cargos ({lista.length})</CardTitle>
          <p className="text-xs text-muted-foreground">Custo mensal calculado na faixa C3, com os parâmetros gerais ou as exceções do cargo.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={area} onValueChange={setArea}><SelectTrigger className="h-8 w-40"><SelectValue placeholder="Área" /></SelectTrigger>
            <SelectContent><SelectItem value={TODAS}>Todas as áreas</SelectItem>{areas.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select>
          <Select value={sen} onValueChange={setSen}><SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value={TODAS}>Toda senioridade</SelectItem>{Object.values(NIVEL_SENIORIDADE).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
          <Select value={ativo} onValueChange={(v) => setAtivo(v as typeof ativo)}><SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="ativos">Ativos</SelectItem><SelectItem value="inativos">Inativos</SelectItem></SelectContent></Select>
          <ImportDialog cargos={cargos} refresh={refresh} />
          <Button size="sm" onClick={() => setEdit(novoCargo(cargos.length))}><Plus className="h-4 w-4 mr-1" />Novo cargo</Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {lista.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhum cargo. Importe a tabela salarial para começar.</p> : (
          <Table className="text-xs">
            <TableHeader><TableRow>
              <TableHead className="w-14" /><TableHead>Cargo</TableHead><TableHead>Área</TableHead><TableHead>Nível</TableHead>
              {FAIXAS.map((f) => <TableHead key={f} className="text-right">{f.toUpperCase()}</TableHead>)}
              <TableHead>Part number</TableHead><TableHead>Produto fiscal</TableHead><TableHead>Vigência</TableHead>
              <TableHead className="text-right">Custo mensal (C3)</TableHead><TableHead>Ativo</TableHead><TableHead className="w-28" />
            </TableRow></TableHeader>
            <TableBody>
              {lista.map((c, i) => {
                const r = resolverCargo(c, p);
                const s3 = salarioFaixa(c, "c3");
                return (
                  <TableRow key={c.id} className={!c.ativo ? "opacity-60" : undefined}>
                    <TableCell><div className="flex"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir"><ArrowUp className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => mover(i, 1)} disabled={i === lista.length - 1} aria-label="Descer"><ArrowDown className="h-3 w-3" /></Button></div></TableCell>
                    <TableCell className="font-medium">{c.cargo}{c.campos_a_confirmar.length > 0 && <Badge variant="outline" className="ml-1 text-[10px]">a confirmar</Badge>}</TableCell>
                    <TableCell>{c.area ?? "—"}</TableCell>
                    <TableCell>{c.nivel_num} · {c.senioridade}</TableCell>
                    {FAIXAS.map((f) => <TableCell key={f} className="text-right tabular-nums">{salarioFaixa(c, f) == null ? "—" : brl(salarioFaixa(c, f)!)}</TableCell>)}
                    <TableCell>{c.part_number_interno ?? "—"}</TableCell>
                    <TableCell>{r.codigoProduto.valor}{r.codigoProduto.origem === "parametro" && <span className="ml-1 text-muted-foreground">(herdado)</span>}</TableCell>
                    <TableCell>{new Date(c.vigencia_inicio + "T00:00").toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{s3 == null ? "—" : brl(custoMensal(s3, r).total)}</TableCell>
                    <TableCell><Switch checked={c.ativo} onCheckedChange={(v) => patch(c.id, { ativo: v })} aria-label="Ativo" /></TableCell>
                    <TableCell><div className="flex">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEdit(c)} aria-label="Editar"><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicar(c)} aria-label="Duplicar"><Copy className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => excluir(c)} aria-label="Excluir"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit?.id ? "Editar cargo" : "Novo cargo"}</DialogTitle></DialogHeader>
          {edit && resolvido && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="col-span-2"><Label className="text-xs">Cargo</Label><Input value={edit.cargo ?? ""} onChange={(e) => setEdit({ ...edit, cargo: e.target.value })} /></div>
                <div><Label className="text-xs">Área</Label><Input value={edit.area ?? ""} onChange={(e) => setEdit({ ...edit, area: e.target.value || null })} /></div>
                <div><Label className="text-xs">Nível</Label>
                  <Select value={String(edit.nivel_num ?? 1)} onValueChange={(v) => setEdit({ ...edit, nivel_num: Number(v), senioridade: NIVEL_SENIORIDADE[Number(v)] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(NIVEL_SENIORIDADE).map(([n, s]) => <SelectItem key={n} value={n}>{n} · {s}</SelectItem>)}</SelectContent>
                  </Select></div>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {FAIXAS.map((f) => (
                  <div key={f}><Label className="text-xs">{f.toUpperCase()} (R$)</Label>
                    <Input type="number" value={edit[`salario_${f}`] ?? ""} onChange={(e) => setEdit({ ...edit, [`salario_${f}`]: e.target.value === "" ? null : Number(e.target.value) })} /></div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Part number interno</Label><Input value={edit.part_number_interno ?? ""} onChange={(e) => setEdit({ ...edit, part_number_interno: e.target.value || null })} /></div>
                <div><Label className="text-xs">Vigência a partir de</Label><Input type="date" value={edit.vigencia_inicio ?? ""} onChange={(e) => setEdit({ ...edit, vigencia_inicio: e.target.value })} /></div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold">Parâmetros de custo</p>
                {OVERRIDES.map(({ k, label, un, texto }) => {
                  const herda = edit[k] == null;
                  const res = { encargos_perc: resolvido.encargosPerc, indiretos_perc: resolvido.indiretosPerc, beneficios_mensais: resolvido.beneficios, horas_mensais: resolvido.horasMensais, piso_rentabilidade_perc: resolvido.pisoRentabilidadePerc, codigo_produto: resolvido.codigoProduto }[k];
                  return (
                    <div key={k} className="grid grid-cols-[180px_1fr_auto] items-center gap-3 rounded-md border px-3 py-2">
                      <span className="text-sm">{label}</span>
                      {herda ? (
                        <span className="text-sm text-muted-foreground">{res.valor == null ? "sem valor" : `${res.valor}${un && un !== "R$" ? ` ${un}` : ""}`}{un === "R$" && " (R$)"} <Badge variant="secondary" className="ml-2 text-[10px]">herdado do parâmetro</Badge></span>
                      ) : texto ? (
                        <Select value={String(edit[k] ?? "")} onValueChange={(v) => setEdit({ ...edit, [k]: v })}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>{(skus.length ? skus : [{ codigo: String(edit[k] ?? p.produtoPadrao), nome: "" }]).map((s) => <SelectItem key={s.codigo} value={s.codigo}>{s.codigo}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : (
                        <Input type="number" step="0.01" className="h-8" value={edit[k] as number} onChange={(e) => setEdit({ ...edit, [k]: e.target.value === "" ? 0 : Number(e.target.value) })} />
                      )}
                      {herda
                        ? <Button size="sm" variant="outline" onClick={() => setEdit({ ...edit, [k]: res.valor ?? (texto ? p.produtoPadrao : 0) })}>Criar exceção</Button>
                        : <Button size="sm" variant="ghost" onClick={() => setEdit({ ...edit, [k]: null })}><Undo2 className="h-3.5 w-3.5 mr-1" />Voltar a herdar</Button>}
                    </div>
                  );
                })}
              </div>
              {custoEdit && (
                <div className="rounded-md bg-muted p-3 text-sm grid grid-cols-2 md:grid-cols-5 gap-2">
                  <span>Salário C3<br /><b>{brl(custoEdit.salario)}</b></span>
                  <span>Encargos<br /><b>{brl(custoEdit.encargos)}</b></span>
                  <span>Indiretos<br /><b>{brl(custoEdit.indiretos)}</b></span>
                  <span>Benefícios<br /><b>{brl(custoEdit.beneficios)}</b></span>
                  <span>Custo mensal<br /><b className="text-primary">{brl(custoEdit.total)}</b></span>
                </div>
              )}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button><Button onClick={salvar}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Só envia os campos presentes no arquivo: campos ausentes mantêm o conteúdo já cadastrado.
async function gravarConteudo(cargo_id: string, c: ConteudoImport) {
  const r = await supabase.from("bodyshop_cargo_content").upsert({ cargo_id, ...c, a_confirmar: true, updated_at: new Date().toISOString() }, { onConflict: "cargo_id" }).select("cargo_id");
  if (r.error) throw r.error;
  if (!r.data?.length) throw new Error("Sem permissão para gravar o conteúdo do cargo.");
}

function ImportDialog({ cargos, refresh }: Pick<BsCadastro, "cargos" | "refresh">) {
  const ref = useRef<HTMLInputElement>(null);
  const [plano, setPlano] = useState<PlanoImport | null>(null);
  const [vig, setVig] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  const ler = async (f: File) => {
    try {
      const { rows } = await parseCargosFile(f);
      const idx = await lerConteudoArquivo(f).catch(() => new Map());
      setPlano(anexarConteudo(planejarImport(rows, cargos), idx));
    } catch (e) { toast.error(`Não foi possível ler o arquivo: ${(e as Error).message}`); }
  };

  const gravar = async () => {
    if (!plano) return;
    setBusy(true);
    try {
      let ordem = cargos.length;
      for (const it of plano.itens) {
        if (it.tipo === "igual") {
          if (it.conteudo && it.existenteId) await gravarConteudo(it.existenteId, it.conteudo);
          continue;
        }
        const base = { ...it.salarios, ativo: !it.semFaixa, campos_a_confirmar: it.semFaixa ? ["salario"] : [], vigencia_inicio: vig, vigencia_fim: null };
        let id = it.existenteId;
        if (id) {
          const r = await supabase.from("bodyshop_cargos").update(base).eq("id", id);
          if (r.error) throw r.error;
        } else {
          const r = await supabase.from("bodyshop_cargos").insert({ ...base, slug: it.slug, cargo: it.cargo, area: it.area, nivel_num: it.nivel_num, senioridade: it.senioridade, ordem: ordem++ }).select("id").single();
          if (r.error) throw r.error;
          id = r.data.id;
        }
        if (it.conteudo && id) await gravarConteudo(id, it.conteudo);
      }
      if (plano.desativar.length) {
        const r = await supabase.from("bodyshop_cargos").update({ ativo: false }).in("id", plano.desativar.map((c) => c.id));
        if (r.error) throw r.error;
      }
      toast.success("Tabela salarial importada"); setPlano(null); refresh();
    } catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  };

  const cont = (t: string) => plano?.itens.filter((i) => i.tipo === t).length ?? 0;
  return (
    <>
      <input ref={ref} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) ler(f); e.target.value = ""; }} />
      <Button size="sm" variant="outline" onClick={() => ref.current?.click()}><Upload className="h-4 w-4 mr-1" />Importar tabela salarial</Button>
      <Dialog open={!!plano} onOpenChange={(o) => !o && setPlano(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Pré-visualização do import</DialogTitle></DialogHeader>
          {plano && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="rounded-md border p-2"><p className="text-2xl font-bold">{cont("novo")}</p><p className="text-xs text-muted-foreground">novos</p></div>
                <div className="rounded-md border p-2"><p className="text-2xl font-bold">{cont("atualizado")}</p><p className="text-xs text-muted-foreground">atualizados</p></div>
                <div className="rounded-md border p-2"><p className="text-2xl font-bold">{cont("igual")}</p><p className="text-xs text-muted-foreground">sem mudança</p></div>
                <div className="rounded-md border p-2"><p className="text-2xl font-bold">{plano.desativar.length}</p><p className="text-xs text-muted-foreground">serão desativados</p></div>
              </div>
              {plano.itens.some((i) => i.semFaixa) && <p className="text-xs text-muted-foreground">{plano.itens.filter((i) => i.semFaixa).length} cargo(s) sem faixa salarial entram inativos e marcados "a confirmar".</p>}
              {plano.desativar.length > 0 && <p className="text-xs">Fora do arquivo (ficam inativos, não são apagados): {plano.desativar.map((c) => `${c.cargo} · ${c.senioridade}`).join("; ")}</p>}
              {(() => {
                const com = plano.itens.filter((i) => i.conteudo);
                if (!com.length) return <p className="text-xs text-muted-foreground">Nenhum conteúdo (descrição, atividades, competências…) encontrado no arquivo; o conteúdo já cadastrado é mantido.</p>;
                const campos = CAMPOS_CONTEUDO.filter((c) => com.some((i) => i.conteudo?.[c]));
                return (
                  <div className="rounded-md border p-2 space-y-1">
                    <p className="text-xs font-semibold">Conteúdo encontrado para {com.length} cargo(s): {campos.map((c) => ROTULO_CONTEUDO[c]).join(", ")}</p>
                    <div className="max-h-40 overflow-auto text-xs space-y-0.5">
                      {com.map((i) => <p key={i.slug}><b>{i.cargo} · {i.senioridade}</b> — {CAMPOS_CONTEUDO.filter((c) => i.conteudo?.[c]).map((c) => ROTULO_CONTEUDO[c]).join(", ")}</p>)}
                    </div>
                    <p className="text-xs text-muted-foreground">Campos presentes no arquivo substituem os atuais e ficam "a confirmar"; os demais são mantidos.</p>
                  </div>
                );
              })()}
              <p className="text-xs text-muted-foreground">Atualizar mantém exceções, part number e produto fiscal já cadastrados.</p>
              <div><Label className="text-xs">Vigência a partir de (data do dissídio)</Label><Input type="date" value={vig} onChange={(e) => setVig(e.target.value)} className="w-48" /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setPlano(null)}>Cancelar</Button>
            <Button onClick={gravar} disabled={busy}>{busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Gravar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
