import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cenariosCusto, listaBrl, paramsFromRows, resolveDescontos, type ZabbixSubscription } from "@/lib/zabbix/calc";
import type { ZbxCadastro } from "@/hooks/useZabbixCadastro";

const brl = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }));
const usd = (n: number | null) => (n == null ? "—" : n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }));
const NIVEIS = ["Silver", "Gold", "Platinum", "Enterprise", "Global"];
const UNIDADES = ["server", "proxy", "tier", "aluno", "assinatura"] as const;

type Draft = Omit<ZabbixSubscription, "id"> & { id?: string };
const VAZIO: Draft = {
  slug: "", part_number: "", nome: "", categoria: "suporte", unidade: "server", nivel: null, venda_brl: 0, lista_usd: null, lista_brl: null,
  ro_perc: null, sem_ro_perc: null, pgto30_ro_perc: null, pgto30_sem_ro_perc: null, permite_quantidade: true, quantidade_maxima: null,
  codigo_produto: "ZBX", descricao: null, piso_rentabilidade_perc: null, ativo: true, ordem: 0, campos_a_confirmar: [],
};

export default function SubscricoesTab({ subs, params, refresh }: ZbxCadastro) {
  const zp = paramsFromRows(params);
  const cambio = zp.cambioUsd;
  const [cat, setCat] = useState("todas");
  const [niv, setNiv] = useState("todos");
  const [ativo, setAtivo] = useState("todos");
  const [edit, setEdit] = useState<Draft | null>(null);

  const lista = useMemo(() => subs.filter((s) =>
    (cat === "todas" || s.categoria === cat) && (niv === "todos" || (s.nivel ?? "—") === niv) &&
    (ativo === "todos" || (ativo === "sim") === s.ativo)), [subs, cat, niv, ativo]);

  const salvar = async () => {
    if (!edit) return;
    if (!edit.part_number.trim() || !edit.nome.trim()) return toast.error("Part number e nome são obrigatórios");
    const { id, ...row } = edit;
    const payload = { ...row, slug: row.slug.trim() || row.part_number.trim().toLowerCase(), quantidade_maxima: row.permite_quantidade ? row.quantidade_maxima : 1 };
    if (id) {
      const r = await supabase.from("zabbix_subscriptions").update(payload).eq("id", id);
      if (r.error) return toast.error(r.error.message);
    } else {
      const r = await supabase.from("zabbix_subscriptions").insert({ ...payload, ordem: Math.max(0, ...subs.map((s) => s.ordem)) + 1 }).select("id").single();
      if (r.error) return toast.error(r.error.message);
      await supabase.from("zabbix_subscription_content").insert({ subscription_id: r.data.id, a_confirmar: true });
    }
    toast.success("Subscrição salva");
    setEdit(null); refresh();
  };

  const duplicar = (s: ZabbixSubscription) => {
    const { id: _id, ...rest } = s;
    setEdit({ ...rest, slug: `${s.slug}-copia`, part_number: `${s.part_number}-COPIA`, nome: `${s.nome} (cópia)` });
  };
  const excluir = async (s: ZabbixSubscription) => {
    if (!confirm(`Excluir ${s.part_number}?`)) return;
    const r = await supabase.from("zabbix_subscriptions").delete().eq("id", s.id);
    if (r.error) return toast.error(r.error.message);
    refresh();
  };
  const toggle = async (s: ZabbixSubscription) => {
    const r = await supabase.from("zabbix_subscriptions").update({ ativo: !s.ativo }).eq("id", s.id);
    if (r.error) return toast.error(r.error.message);
    refresh();
  };
  const mover = async (s: ZabbixSubscription, dir: -1 | 1) => {
    const i = subs.findIndex((x) => x.id === s.id);
    const o = subs[i + dir];
    if (!o) return;
    await Promise.all([
      supabase.from("zabbix_subscriptions").update({ ordem: o.ordem }).eq("id", s.id),
      supabase.from("zabbix_subscriptions").update({ ordem: s.ordem }).eq("id", o.id),
    ]);
    refresh();
  };

  const catDesc = (k: keyof Draft) => {
    if (!edit) return 0;
    const d = zp.descontos[edit.categoria];
    return ({ ro_perc: d.ro, sem_ro_perc: d.semRo, pgto30_ro_perc: d.pgto30Ro, pgto30_sem_ro_perc: d.pgto30SemRo } as Record<string, number>)[k as string];
  };
  const herdado = (k: keyof Draft) => edit?.[k] == null
    ? <Badge variant="secondary" className="text-[10px]">herdado da categoria</Badge>
    : <button type="button" className="text-[10px] underline text-muted-foreground" onClick={() => setEdit((d) => d && { ...d, [k]: null })}>usar categoria</button>;
  const num = (k: keyof Draft, opt = false, desc = false) => (
    <Input type="number" step="0.01" value={edit?.[k] == null ? "" : Number(edit[k])} placeholder={desc ? `${catDesc(k)} (categoria)` : undefined}
      onChange={(e) => setEdit((d) => d && { ...d, [k]: e.target.value === "" ? (opt ? null : 0) : Number(e.target.value) })} />
  );

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle className="text-base">Subscrições</CardTitle>
          <p className="text-xs text-muted-foreground">Câmbio de referência: {cambio.toLocaleString("pt-BR")}. Custos = lista × (1 − desconto parceria/RO) × (1 − desconto 30 dias). Percentual em destaque = exceção do SKU; em cinza = herdado da categoria (aba Descontos).</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={cat} onValueChange={setCat}><SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="todas">Categorias</SelectItem><SelectItem value="suporte">Suporte</SelectItem><SelectItem value="academy">Academy</SelectItem></SelectContent></Select>
          <Select value={niv} onValueChange={setNiv}><SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="todos">Níveis</SelectItem>{NIVEIS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}<SelectItem value="—">Sem nível</SelectItem></SelectContent></Select>
          <Select value={ativo} onValueChange={setAtivo}><SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="todos">Todas</SelectItem><SelectItem value="sim">Ativas</SelectItem><SelectItem value="nao">Inativas</SelectItem></SelectContent></Select>
          <Button size="sm" onClick={() => setEdit({ ...VAZIO })}><Plus className="h-4 w-4 mr-1" />Nova</Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table className="text-xs">
          <TableHeader>
            <TableRow>
              <TableHead>Subscrição</TableHead><TableHead className="text-right">Venda</TableHead>
              <TableHead className="text-right">Lista USD</TableHead><TableHead className="text-right">Lista R$</TableHead>
              <TableHead className="text-center">RO / s/RO / 30d RO / 30d s/RO</TableHead>
              <TableHead className="text-right">Custo RO</TableHead><TableHead className="text-right">Custo s/RO</TableHead>
              <TableHead className="text-right">RO + 30d</TableHead><TableHead className="text-right">s/RO + 30d</TableHead>
              <TableHead>Ativa</TableHead><TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.map((s) => {
              const c = cenariosCusto(s, cambio, zp.descontos);
              const r = resolveDescontos(s, zp.descontos);
              const pc = (v: number, o: string) => <span className={o === "sku" ? "font-semibold text-primary" : "text-muted-foreground"} title={o === "sku" ? "Exceção deste SKU" : "Herdado da categoria"}>{v}%</span>;
              return (
                <TableRow key={s.id} className={s.ativo ? "" : "opacity-60"}>
                  <TableCell className="min-w-[220px]">
                    <p className="font-medium">{s.part_number} {s.campos_a_confirmar.length > 0 && <Badge variant="outline" className="ml-1 text-[10px]">A confirmar: {s.campos_a_confirmar.join(", ")}</Badge>}</p>
                    <p className="text-muted-foreground">{s.nome} · {s.unidade}{s.permite_quantidade ? "" : " (único)"}</p>
                  </TableCell>
                  <TableCell className="text-right">{brl(s.venda_brl)}</TableCell>
                  <TableCell className="text-right">{usd(s.lista_usd)}</TableCell>
                  <TableCell className="text-right">{brl(listaBrl(s, cambio))}</TableCell>
                  <TableCell className="text-center whitespace-nowrap">{pc(r.ro, r.origem.ro)} / {pc(r.semRo, r.origem.semRo)} / {pc(r.pgto30Ro, r.origem.pgto30Ro)} / {pc(r.pgto30SemRo, r.origem.pgto30SemRo)}</TableCell>
                  <TableCell className="text-right">{brl(c?.ro)}</TableCell>
                  <TableCell className="text-right">{brl(c?.semRo)}</TableCell>
                  <TableCell className="text-right">{brl(c?.ro30)}</TableCell>
                  <TableCell className="text-right">{brl(c?.semRo30)}</TableCell>
                  <TableCell><Switch checked={s.ativo} onCheckedChange={() => toggle(s)} aria-label="Ativa" /></TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => mover(s, -1)} aria-label="Subir"><ArrowUp className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => mover(s, 1)} aria-label="Descer"><ArrowDown className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEdit({ ...s })} aria-label="Editar"><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicar(s)} aria-label="Duplicar"><Copy className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => excluir(s)} aria-label="Excluir"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit?.id ? "Editar subscrição" : "Nova subscrição"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><Label>Part number</Label><Input value={edit.part_number} onChange={(e) => setEdit({ ...edit, part_number: e.target.value })} /></div>
              <div><Label>Slug</Label><Input value={edit.slug} placeholder="automático" onChange={(e) => setEdit({ ...edit, slug: e.target.value })} /></div>
              <div className="col-span-2"><Label>Nome</Label><Input value={edit.nome} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} /></div>
              <div><Label>Categoria</Label>
                <Select value={edit.categoria} onValueChange={(v) => setEdit({ ...edit, categoria: v as Draft["categoria"] })}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="suporte">Suporte</SelectItem><SelectItem value="academy">Academy</SelectItem></SelectContent></Select></div>
              <div><Label>Unidade</Label>
                <Select value={edit.unidade} onValueChange={(v) => setEdit({ ...edit, unidade: v as Draft["unidade"] })}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Nível</Label>
                <Select value={edit.nivel ?? "none"} onValueChange={(v) => setEdit({ ...edit, nivel: v === "none" ? null : v })}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Sem nível</SelectItem>{NIVEIS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Venda R$ (por unidade)</Label>{num("venda_brl")}</div>
              <div><Label>Lista USD</Label>{num("lista_usd", true)}</div>
              <div><Label>Lista R$ (só sem USD)</Label>{num("lista_brl", true)}</div>
              <div><Label className="flex items-center gap-1">Desconto RO % {herdado("ro_perc")}</Label>{num("ro_perc", true, true)}</div>
              <div><Label className="flex items-center gap-1">Desconto sem RO % {herdado("sem_ro_perc")}</Label>{num("sem_ro_perc", true, true)}</div>
              <div><Label className="flex items-center gap-1">Pgto 30 dias c/ RO % {herdado("pgto30_ro_perc")}</Label>{num("pgto30_ro_perc", true, true)}</div>
              <div><Label className="flex items-center gap-1">Pgto 30 dias s/ RO % {herdado("pgto30_sem_ro_perc")}</Label>{num("pgto30_sem_ro_perc", true, true)}</div>
              <div><Label>Piso de rentabilidade % (vazio = categoria)</Label>{num("piso_rentabilidade_perc", true)}</div>
              <div><Label>Quantidade máxima</Label>{num("quantidade_maxima", true)}</div>
              <div className="flex items-center gap-2 pt-5"><Switch checked={edit.permite_quantidade} onCheckedChange={(v) => setEdit({ ...edit, permite_quantidade: v })} /><Label>Permite quantidade</Label></div>
              <div className="flex items-center gap-2 pt-5"><Switch checked={edit.ativo} onCheckedChange={(v) => setEdit({ ...edit, ativo: v })} /><Label>Ativa</Label></div>
              <div className="col-span-2"><Label>Campos a confirmar (separados por vírgula)</Label>
                <Input value={edit.campos_a_confirmar.join(", ")} onChange={(e) => setEdit({ ...edit, campos_a_confirmar: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button><Button onClick={salvar}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
