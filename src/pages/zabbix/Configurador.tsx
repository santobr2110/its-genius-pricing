import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertTriangle, Building2, ChevronDown, FilePlus2, FileSignature, ListChecks, Loader2, Lock, Percent, Plus, RefreshCw,
  Save, ShieldCheck, Tag, Trash2, TrendingUp, Wallet, Handshake, type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { usePricingApproval } from "@/hooks/usePricingApproval";
import { useZabbixCotacoes } from "@/hooks/useZabbixCotacoes";
import ApprovalBadge from "@/components/approval/ApprovalBadge";
import { congelar, CONFIG_ZBX_PADRAO, type CarrinhoZbx, type LinhaResultadoZbx, type LinhaZbx } from "@/lib/zabbix/carrinho";
import type { ZabbixSubscription } from "@/lib/zabbix/calc";
import { COTACAO_ZBX_VAZIA, ZBX_BASE } from "./useZbxState";
import { useZabbixResultado } from "./useZabbixResultado";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (n: number) => `${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}%`;
const pct2 = (n: number) => `${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const usd = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const novoId = () => Math.random().toString(36).slice(2, 10);
const NIVEIS = ["Silver", "Gold", "Platinum", "Enterprise", "Global"];

export default function ZbxConfigurador() {
  const { can, user } = useAuth();
  const R = useZabbixResultado();
  const { cad, st, res, vivo, congelado, congeladoIntacto, diffs, params, municipios, entradasVivas, globaisVivos } = R;
  const { linhas, setLinhas, config, setConfig, atual, setAtual, snapshot, setSnapshot } = st;
  const cot = useZabbixCotacoes();
  const [salvando, setSalvando] = useState(false);
  const [comparar, setComparar] = useState(false);
  const podeCotar = can("page.zbx.quote");

  const ativos = useMemo(() => cad.subs.filter((s) => s.ativo), [cad.subs]);
  const approval = usePricingApproval({
    offering: "subscricoes-zabbix", targetType: "pricing_preset", targetId: atual.id, rentPct: res.rentabilidadePerc,
    summary: { cliente: atual.cliente, valor: res.precoFinalTotal, codigo: atual.codigo },
  });

  const upd = (id: string, patch: Partial<LinhaZbx>) => setLinhas(linhas.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const adicionar = () => {
    const s = ativos[0];
    if (s) setLinhas([...linhas, { id: novoId(), subscriptionId: s.id, quantidade: 1, descontoPerc: 0 }]);
  };

  const validar = () => {
    const faltando = [
      [atual.cliente, "Nome do Cliente"], [atual.gerenteConta, "Gerente de Conta"], [atual.especialistaBU, "Especialista da BU"],
      [atual.salesforce, "No. Oportunidade Sales Force"], [atual.arquitetoBU, "Arquiteto BU"],
    ].filter(([v]) => !v?.trim()).map(([, l]) => l);
    if (faltando.length) { toast.error(`Preencha: ${faltando.join(", ")}`); return false; }
    return true;
  };

  /** Grava com snapshot novo, congelando os parâmetros vigentes. */
  const gravar = async () => {
    const nome = atual.nome.trim() || atual.cliente.trim();
    setSalvando(true);
    try {
      const snap = congelar(entradasVivas, globaisVivos, config.municipio, params.cambioUsd, user?.id ?? "", snapshot?.versao ?? 0);
      const r = await cot.salvar(atual.id, nome, atual.cliente, {
        linhas, config, snapshot: snap,
        resumo: { custoTotal: vivo.custoTotal, precoFinalTotal: vivo.precoFinalTotal, rentabilidadePerc: vivo.rentabilidadePerc },
      }, atual);
      setSnapshot(snap);
      setAtual({ ...atual, id: r.id, nome, codigo: r.codigo ?? atual.codigo });
      toast.success("Cotação salva e valores congelados");
      setComparar(false);
    } catch (e) { toast.error((e as Error).message); } finally { setSalvando(false); }
  };

  const salvar = () => {
    if (!validar()) return;
    if (snapshot && diffs.length) { setComparar(true); return; }
    gravar();
  };

  const nova = () => {
    if (linhas.length && !confirm("Começar uma nova cotação? Os itens atuais serão limpos da tela (o que já foi salvo continua em Cotações).")) return;
    setLinhas([]); setConfig(CONFIG_ZBX_PADRAO); setAtual(COTACAO_ZBX_VAZIA); setSnapshot(null);
  };

  const pendentes = cad.params.filter((p) => p.status === "simulado" || p.status === "a_confirmar");
  const descRO = params.descontos.suporte;
  const resumoCondicao = `Custo apurado ${config.temRO ? `com RO de ${descRO.ro}%` : `sem RO (desconto de parceria de ${descRO.semRo}%)`} e ${config.pagamento30d ? `pagamento em 30 dias (${config.temRO ? descRO.pgto30Ro : descRO.pgto30SemRo}%)` : "sem desconto de pagamento em 30 dias"} · categoria Suporte`;

  if (R.loading) return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</p>;
  if (cad.error) return <p className="text-sm text-destructive">Você não tem acesso ao catálogo das Subscrições Zabbix. Peça a permissão "Acessar Subscrições Zabbix" a um administrador.</p>;

  const codigoAtual = atual.codigo ?? cot.lista.find((x) => x.id === atual.id)?.quote_code ?? null;

  return (
    <div className="space-y-4">
      {snapshot && (
        <div className={`flex flex-wrap items-center gap-3 rounded-lg border px-4 py-2.5 text-sm ${congeladoIntacto ? "border-primary/40 bg-primary/5" : "border-amber-500/50 bg-amber-500/10"}`}>
          <Lock className="h-4 w-4 text-primary shrink-0" />
          <span className="flex-1 min-w-0">
            {congeladoIntacto
              ? <>Valores congelados em {new Date(snapshot.congeladoEm).toLocaleDateString("pt-BR")} — câmbio {snapshot.cambio.toLocaleString("pt-BR")}, {snapshot.cenario.temRO ? "com" : "sem"} RO{snapshot.itens[0] ? ` (${snapshot.cenario.temRO ? snapshot.itens[0].descontos.ro : snapshot.itens[0].descontos.semRo}%)` : ""}{snapshot.cenario.pagamento30d ? ", pagamento 30 dias" : ""} · versão {snapshot.versao}{diffs.length ? ` · ${diffs.length} parâmetro(s) mudaram desde então` : ""}</>
              : <>Cotação alterada desde o congelamento de {new Date(snapshot.congeladoEm).toLocaleDateString("pt-BR")}: os valores abaixo usam os parâmetros atuais e serão congelados de novo ao salvar.</>}
          </span>
          {congeladoIntacto && (
            <Button size="sm" variant="outline" disabled={!podeCotar || !atual.id} onClick={() => setComparar(true)}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Reavaliar com os parâmetros atuais</Button>
          )}
        </div>
      )}
      {!snapshot && atual.id && (
        <p className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm">Esta cotação foi salva sem valores congelados; os números são recalculados com os parâmetros atuais.</p>
      )}

      {/* Cabeçalho da cotação */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1"><Label className="text-xs flex items-center gap-1.5 h-4 text-muted-foreground"><Building2 className="h-3.5 w-3.5 text-primary" /> Nome do Cliente *</Label><Input value={atual.cliente} onChange={(e) => setAtual({ ...atual, cliente: e.target.value })} /></div>
            {([
              ["gerenteConta", "Gerente de Conta *", ""], ["especialistaBU", "Especialista da BU *", ""],
              ["salesforce", "No. Oportunidade Sales Force *", "Ex.: 0061x00000ABCDE"], ["arquitetoBU", "Arquiteto BU *", ""],
            ] as const).map(([k, label, ph]) => (
              <div key={k} className="space-y-1"><Label className="text-xs flex items-center h-4 text-muted-foreground">{label}</Label><Input value={atual[k] ?? ""} placeholder={ph} onChange={(e) => setAtual({ ...atual, [k]: e.target.value })} /></div>
            ))}
            <div className="space-y-1"><Label className="text-xs flex items-center gap-1.5 h-4 text-muted-foreground"><FileSignature className="h-3.5 w-3.5 text-primary" /> Nome da cotação (opcional)</Label><Input value={atual.nome} onChange={(e) => setAtual({ ...atual, nome: e.target.value })} placeholder="Ex.: Suporte Gold 2027" /></div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {codigoAtual && <Badge variant="outline" className="font-mono">{codigoAtual}</Badge>}
            <Button variant="outline" onClick={nova}><FilePlus2 className="h-4 w-4 mr-1" /> Nova</Button>
            <Button onClick={salvar} disabled={salvando || linhas.length === 0 || !podeCotar}><Save className="h-4 w-4 mr-1" /> Salvar</Button>
          </div>
        </CardContent>
      </Card>

      {/* Condição comercial */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Handshake className="h-4 w-4 text-primary" /> Condição comercial da cotação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <label className="flex items-center gap-2 text-sm"><Switch checked={config.temRO} onCheckedChange={(v) => setConfig({ ...config, temRO: v })} /> Temos Registered Opportunity (RO)</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={config.pagamento30d} onCheckedChange={(v) => setConfig({ ...config, pagamento30d: v })} /> Pagamento em 30 dias</label>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground shrink-0">Município (ISS)</Label>
              <Select value={config.municipio} onValueChange={(v) => setConfig({ ...config, municipio: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{(municipios.length ? municipios : [config.municipio]).map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs rounded-md bg-muted/50 px-3 py-2 text-muted-foreground">{resumoCondicao}. Exceções de cada SKU aparecem no detalhe do item.</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4 items-start">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2"><ListChecks className="h-4 w-4 text-primary" /> Itens da proposta</CardTitle>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">{linhas.length} item(ns) · suporte e academy</p>
            </div>
            <Button size="sm" onClick={adicionar} disabled={ativos.length === 0}><Plus className="h-4 w-4 mr-1" /> Adicionar item</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendentes.length > 0 && (
              <p className="text-xs rounded border border-amber-500/50 bg-amber-500/10 p-2">
                <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600 mr-1">a confirmar</Badge>
                Valores ainda a confirmar: {pendentes.map((p) => p.label).join(" · ")}
              </p>
            )}
            {linhas.length === 0 && (
              <div className="rounded-lg border border-dashed p-10 flex flex-col items-center gap-2 text-center">
                <ShieldCheck className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Adicione subscrições de suporte ou Academy para montar a proposta.</p>
                <Button size="sm" variant="outline" onClick={adicionar} disabled={ativos.length === 0}><Plus className="h-4 w-4 mr-1" /> Adicionar item</Button>
              </div>
            )}
            {res.linhas.map((r) => {
              const l = linhas.find((x) => x.id === r.entrada.linhaId);
              if (!l) return null;
              return <LinhaEditor key={l.id} r={r} linha={l} ativos={ativos} quantidadeLivre={cad.subs.find((s) => s.id === l.subscriptionId)?.permite_quantidade ?? true}
                onChange={(p) => upd(l.id, p)} onRemove={() => setLinhas(linhas.filter((x) => x.id !== l.id))} />;
            })}
          </CardContent>
        </Card>

        <div className="space-y-4 xl:sticky xl:top-28">
          <Card className="border-2">
            <CardContent className="pt-5 space-y-3 text-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Composição do valor total</p>
              <div className="grid grid-cols-2 gap-2">
                <Mini icon={Wallet} l="Custo total" v={brl(res.custoTotal)} />
                <Mini icon={Tag} l="Preço de tabela" v={brl(res.precoTabelaTotal)} />
                <Mini icon={Percent} l="Rentabilidade" v={pct2(res.rentabilidadePerc)} alerta={res.abaixoPiso || res.rentabilidadePerc < 0} />
                <Mini icon={TrendingUp} l="Lucro" v={brl(res.lucroTotal)} />
              </div>
              {res.precoTabelaTotal !== res.precoFinalTotal && <div className="flex justify-between"><span className="text-muted-foreground">Desconto</span><span className="tabular-nums font-medium">− {brl(res.precoTabelaTotal - res.precoFinalTotal)}</span></div>}
              <div className="flex justify-between items-baseline border-t pt-3"><span className="font-semibold">Valor Total de Venda</span><span className="text-2xl font-bold tabular-nums">{brl(res.precoFinalTotal)}</span></div>
              <div className="rounded-md bg-muted/50 p-2 text-[11px] text-muted-foreground space-y-0.5">
                <p>Município {config.municipio} · {config.temRO ? "com RO" : "sem RO"}{config.pagamento30d ? " · pagamento 30 dias" : ""}{config.descontoTotalPerc ? ` · desconto ${pct2(config.descontoTotalPerc)}` : ""}</p>
                <p>Comissão {res.cascataBase.comissaoFixaPerc != null ? `fixa ${pct2(res.cascataBase.comissaoFixaPerc)}` : "Escala Selbetti"} · Retenção {pct2(res.cascataBase.retencaoPerc)} · IR/CSLL {pct2(res.cascataBase.irpjCsllPerc)} · <Link to={`${ZBX_BASE}/financeiro/impostos`} className="text-primary hover:underline">Alterar condições</Link></p>
              </div>
              {res.abaixoPiso && <p className="text-xs text-destructive flex gap-1"><AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Há itens abaixo do piso de rentabilidade.</p>}
              {res.temErros && <p className="text-xs text-destructive flex gap-1"><AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Há itens com erro; eles não entram no total.</p>}
              <ApprovalBadge approval={approval} canRequest={!!atual.id} disabledReason={!atual.id ? "Salve a cotação primeiro" : undefined} />
            </CardContent>
          </Card>
        </div>
      </div>

      <Comparacao open={comparar} onOpenChange={setComparar} antes={congelado} depois={vivo} diffs={diffs}
        avisoAprovacao={!!approval.request && Math.abs((congelado?.rentabilidadePerc ?? 0) - vivo.rentabilidadePerc) > 1e-6}
        salvando={salvando} onConfirm={() => { if (validar()) gravar(); }} />
    </div>
  );
}

function Mini({ icon: Icon, l, v, alerta }: { icon: LucideIcon; l: string; v: string; alerta?: boolean }) {
  return (
    <div className="rounded-md border p-2">
      <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Icon className="h-3 w-3" /> {l}</p>
      <p className={`font-semibold tabular-nums ${alerta ? "text-destructive" : ""}`}>{v}</p>
    </div>
  );
}

function Kpi({ l, v, destaque, alerta, sub }: { l: string; v: string; destaque?: boolean; alerta?: boolean; sub?: string }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground">{l}</p>
      <p className={`font-semibold tabular-nums ${destaque ? "text-primary" : ""} ${alerta ? "text-destructive" : ""}`}>{v}</p>
      {sub && <p className="text-[10px] text-muted-foreground tabular-nums">{sub}</p>}
    </div>
  );
}

function M({ l, v, strong, neg }: { l: string; v: string; strong?: boolean; neg?: boolean }) {
  return <div className={`flex justify-between gap-3 ${strong ? "font-semibold" : ""}`}><span className={neg ? "text-muted-foreground" : ""}>{l}</span><span className="tabular-nums">{v}</span></div>;
}

function LinhaEditor({ r, linha, ativos, quantidadeLivre, onChange, onRemove }: {
  r: LinhaResultadoZbx; linha: LinhaZbx; ativos: ZabbixSubscription[]; quantidadeLivre: boolean;
  onChange: (p: Partial<LinhaZbx>) => void; onRemove: () => void;
}) {
  const e = r.entrada;
  const ok = r.erros.length === 0;
  const grupos = [
    ...NIVEIS.map((n) => ({ label: `Suporte · ${n}`, itens: ativos.filter((s) => s.categoria === "suporte" && s.nivel === n) })),
    { label: "Suporte · outros", itens: ativos.filter((s) => s.categoria === "suporte" && !NIVEIS.includes(s.nivel ?? "")) },
    { label: "Academy", itens: ativos.filter((s) => s.categoria === "academy") },
  ].filter((g) => g.itens.length);
  const temRO = r.descBasePerc === e.descontos.ro && r.fixos != null;
  const o = e.origemDesconto;
  const tagOrigem = (k: keyof typeof o) => (o[k] === "sku" ? " (exceção do SKU)" : " (categoria)");
  const f = r.fixos;
  const v = (p: number) => (r.precoFinal * p) / 100;

  return (
    <div className="rounded-lg border bg-background p-3 space-y-3 transition-colors hover:border-primary/40">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0"><ShieldCheck className="h-4 w-4" /></div>
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">{e.nome}</p>
          <p className="text-[11px] text-muted-foreground">{e.partNumber} · por {e.unidade}{e.codigoProduto ? ` · produto ${e.codigoProduto}` : ""}</p>
        </div>
        <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">{e.categoria === "academy" ? "Academy" : "Suporte"}</Badge>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-[2fr_100px_100px_auto] gap-2 items-end">
        <div className="space-y-1 col-span-2 md:col-span-1">
          <Label className="text-xs">Subscrição</Label>
          <Select value={linha.subscriptionId} onValueChange={(id) => {
            const s = ativos.find((x) => x.id === id);
            onChange({ subscriptionId: id, quantidade: s && !s.permite_quantidade ? 1 : linha.quantidade });
          }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-[60vh]">
              {grupos.map((g) => (
                <SelectGroup key={g.label}><SelectLabel className="text-[11px]">{g.label}</SelectLabel>
                  {g.itens.map((s) => <SelectItem key={s.id} value={s.id}>{s.part_number} · {s.nome}</SelectItem>)}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label className="text-xs">Quantidade</Label>
          <Input type="number" min={1} disabled={!quantidadeLivre} value={linha.quantidade} onChange={(ev) => onChange({ quantidade: Math.floor(Number(ev.target.value) || 0) })} /></div>
        <div className="space-y-1"><Label className="text-xs">Desconto %</Label>
          <Input type="number" step="0.5" value={linha.descontoPerc} onChange={(ev) => onChange({ descontoPerc: Number(ev.target.value) || 0 })} /></div>
        <Button size="icon" variant="ghost" onClick={onRemove} aria-label="Remover item"><Trash2 className="h-4 w-4" /></Button>
      </div>

      {r.erros.map((x, i) => <p key={i} className="text-xs text-destructive flex gap-1"><AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {x}</p>)}
      {r.abaixoPiso && <p className="text-xs text-destructive flex gap-1"><AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Rentabilidade abaixo do piso de {pct2(e.pisoRentabilidadePerc ?? 0)}.</p>}
      {r.comissaoInstavel && <p className="text-xs text-amber-600 flex gap-1"><AlertTriangle className="h-3.5 w-3.5 shrink-0" /> A comissão oscila entre faixas da Escala Selbetti neste valor; confira com o Financeiro.</p>}

      {ok && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 rounded-md bg-muted/40 p-2 text-xs">
          <Kpi l="Custo" v={brl(r.custoLinha)} />
          <Kpi l="Preço de venda" v={brl(r.precoFinal)} destaque sub={`${brl(r.precoFinal / 12)}/mês (12 meses)`} />
          <Kpi l="Rentabilidade" v={pct2(r.rentabilidadePerc)} alerta={r.abaixoPiso || r.rentabilidadePerc < 0} />
          <Kpi l="Comissão" v={pct2(r.comissaoPerc)} />
          <Kpi l="Lucro" v={brl(r.lucro)} />
          <Kpi l="Desconto" v={pct2(r.descontoEfetivoPerc)} />
        </div>
      )}

      {ok && f && (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-1 text-xs text-primary hover:underline"><ChevronDown className="h-3.5 w-3.5" /> Detalhes do cálculo</CollapsibleTrigger>
          <CollapsibleContent className="mt-2 rounded-md border bg-muted/30 p-3 text-xs font-mono space-y-0.5">
            <M l={e.listaUsd != null ? `Lista Zabbix  USD ${usd(e.listaUsd)} × ${e.cambio.toLocaleString("pt-BR")}` : "Lista Zabbix (R$)"} v={brl(r.listaUnitariaBrl)} />
            <M neg l={`(−) Desconto ${temRO ? "RO" : "sem RO"} ${r.descBasePerc}%${tagOrigem(temRO ? "ro" : "semRo")}`} v={`− ${brl(r.listaUnitariaBrl * r.descBasePerc / 100)}`} />
            <M l={`= Custo ${temRO ? "com RO" : "sem RO"}`} v={brl(r.listaUnitariaBrl * (1 - r.descBasePerc / 100))} />
            {r.descPgtoPerc > 0 && <M neg l={`(−) Pagamento 30 dias ${r.descPgtoPerc}%${tagOrigem(temRO ? "pgto30Ro" : "pgto30SemRo")}`} v={`− ${brl(r.listaUnitariaBrl * (1 - r.descBasePerc / 100) * r.descPgtoPerc / 100)}`} />}
            <M strong l="= Custo unitário" v={brl(r.custoUnitario)} />
            <M l={`× Quantidade ${e.quantidade}`} v={brl(r.custoLinha)} />
            <div className="h-2" />
            <M l={`Venda apontada  ${brl(e.vendaUnitaria)} × ${e.quantidade}`} v={brl(r.vendaTabela)} />
            <M neg l={`(−) Desconto ${pct2(r.descontoEfetivoPerc)}`} v={`− ${brl(r.vendaTabela - r.precoFinal)}`} />
            <M strong l="= Preço final" v={brl(r.precoFinal)} />
            <M neg l={`(−) PIS ${pct2(f.pisPerc)} · COFINS ${pct2(f.cofinsPerc)} · ISS ${pct2(f.issPerc)}`} v={`− ${brl(v(f.pisPerc + f.cofinsPerc + f.issPerc))}`} />
            <M neg l={`(−) Comissão ${pct2(r.comissaoPerc)}`} v={`− ${brl(v(r.comissaoPerc))}`} />
            <M neg l={`(−) Retenção ${pct2(f.retencaoPerc)}`} v={`− ${brl(v(f.retencaoPerc))}`} />
            <M neg l={`(−) IR/CSLL ${pct2(f.irpjCsllPerc)}`} v={`− ${brl(v(f.irpjCsllPerc))}`} />
            {f.encFinancPerc > 0 && <M neg l={`(−) Enc. financeiros ${pct2(f.encFinancPerc)}`} v={`− ${brl(v(f.encFinancPerc))}`} />}
            <M neg l="(−) Custo" v={`− ${brl(r.custoLinha)}`} />
            <M strong l={`= Lucro  (${pct(r.rentabilidadePerc)})`} v={brl(r.lucro)} />
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

function Comparacao({ open, onOpenChange, antes, depois, diffs, avisoAprovacao, salvando, onConfirm }: {
  open: boolean; onOpenChange: (o: boolean) => void; antes: CarrinhoZbx | null; depois: CarrinhoZbx; diffs: string[];
  avisoAprovacao: boolean; salvando: boolean; onConfirm: () => void;
}) {
  const linhas = depois.linhas.map((d) => ({ d, a: antes?.linhas.find((x) => x.entrada.linhaId === d.entrada.linhaId) ?? null }));
  const cel = (a: number | undefined, d: number, fmt: (n: number) => string) => {
    const mudou = a == null || Math.abs(a - d) > 0.005;
    return <TableCell className="text-right tabular-nums text-xs"><span className="text-muted-foreground">{a == null ? "—" : fmt(a)}</span><span className={`block ${mudou ? "font-semibold text-primary" : ""}`}>{fmt(d)}</span></TableCell>;
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reavaliar com os parâmetros atuais</DialogTitle>
          <DialogDescription>Em cada célula, em cima o valor congelado e embaixo o novo. Nada é gravado até você confirmar.</DialogDescription>
        </DialogHeader>
        {diffs.length > 0
          ? <div className="flex flex-wrap gap-1">{diffs.map((x) => <Badge key={x} variant="outline" className="text-[10px]">{x}</Badge>)}</div>
          : <p className="text-xs text-muted-foreground">Nenhum parâmetro mudou desde o congelamento.</p>}
        {avisoAprovacao && <p className="text-xs rounded border border-amber-500/50 bg-amber-500/10 p-2">Já existe uma aprovação registrada para esta cotação; ela se refere aos valores anteriores.</p>}
        <Table>
          <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-right">Custo</TableHead><TableHead className="text-right">Preço final</TableHead><TableHead className="text-right">Rentabilidade</TableHead></TableRow></TableHeader>
          <TableBody>
            {linhas.map(({ a, d }) => (
              <TableRow key={d.entrada.linhaId}>
                <TableCell className="text-xs">{d.entrada.partNumber}</TableCell>
                {cel(a?.custoLinha, d.custoLinha, brl)}{cel(a?.precoFinal, d.precoFinal, brl)}{cel(a?.rentabilidadePerc, d.rentabilidadePerc, pct2)}
              </TableRow>
            ))}
            <TableRow className="font-semibold">
              <TableCell className="text-xs">Total</TableCell>
              {cel(antes?.custoTotal, depois.custoTotal, brl)}{cel(antes?.precoFinalTotal, depois.precoFinalTotal, brl)}{cel(antes?.rentabilidadePerc, depois.rentabilidadePerc, pct2)}
            </TableRow>
          </TableBody>
        </Table>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onConfirm} disabled={salvando}>{salvando && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Confirmar e congelar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
