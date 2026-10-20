import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import {
  AlertTriangle, Building2, FilePlus2, FileSignature, ListChecks, Loader2, Lock, Percent, Plus, RefreshCw,
  Save, ShieldCheck, Tag, TrendingUp, Wallet, Handshake, type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { usePricingApproval } from "@/hooks/usePricingApproval";
import { useBodyshopCotacoes } from "@/hooks/useBodyshopCotacoes";
import ApprovalBadge from "@/components/approval/ApprovalBadge";
import { congelar, CONFIG_BS_PADRAO, type CarrinhoBS, type LinhaBS } from "@/lib/bodyshop/carrinho";
import { BSLineEditor } from "./LinhaEditor";
import { BsIaDialog } from "./IaDialog";
import { COTACAO_BS_VAZIA } from "./useBsState";
import { useBodyshopResultado } from "./useBodyshopResultado";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct2 = (n: number) => `${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const novoId = () => Math.random().toString(36).slice(2, 10);

export default function BsConfigurador() {
  const { can, user } = useAuth();
  const R = useBodyshopResultado();
  const { cad, st, res, vivo, congelado, congeladoIntacto, diffs, params, municipios, entradasVivas, globaisVivos } = R;
  const { linhas, setLinhas, config, setConfig, atual, setAtual, snapshot, setSnapshot } = st;
  const cot = useBodyshopCotacoes();
  const [salvando, setSalvando] = useState(false);
  const [comparar, setComparar] = useState(false);
  const [ia, setIa] = useState(false);
  const podeCotar = can("page.prof.quote");
  useEffect(() => {
    if (!R.loading && !atual.id && !linhas.length && config.duracaoMeses === CONFIG_BS_PADRAO.duracaoMeses) {
      setConfig({ ...config, duracaoMeses: params.duracaoMeses, convencao: params.irpjCsllConvencao === "roi_ito" ? "roi_ito" : "padrao_site" });
    }
  }, [R.loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const ativos = useMemo(() => cad.cargos.filter((s) => s.ativo), [cad.cargos]);
  const approval = usePricingApproval({
    offering: "profissionais-alocados", targetType: "pricing_preset", targetId: atual.id, rentPct: congelado?.rentabilidadePerc ?? res.rentabilidadePerc,
    summary: { cliente: atual.cliente, valor: res.precoFinalTotalMensal, codigo: atual.codigo },
  });

  const upd = (id: string, patch: Partial<LinhaBS>) => setLinhas(linhas.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const adicionar = () => {
    const s = ativos[0];
    if (s) setLinhas([...linhas, { id: novoId(), cargoId: s.id, faixa: (["c3", "c1", "c2", "c4", "c5", "c6"] as const).find(f => s[`salario_${f}`] != null) ?? "c3", quantidade: 1, descontoPerc: 0, regime: "integral", horasLinha: null }]);
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
  const gravar = async (reavaliar = false) => {
    if (!podeCotar || res.temErros || !linhas.length || (reavaliar && vivo.temErros)) { toast.error("Corrija os itens antes de salvar."); return; }
    const nome = atual.nome.trim() || atual.cliente.trim();
    setSalvando(true);
    try {
      const snap = !reavaliar && congeladoIntacto && snapshot ? snapshot : congelar(entradasVivas, globaisVivos, config, user?.id ?? "", R.tiers, snapshot?.versao ?? 0);
      const resultado = !reavaliar && congeladoIntacto ? res : vivo;
      const r = await cot.salvar(atual.id, nome, atual.cliente, {
        linhas, config, snapshot: snap,
        resumo: { custoTotal: resultado.custoTotal, precoFinalTotalMensal: resultado.precoFinalTotalMensal, precoFinalTotalContrato: resultado.precoFinalTotalContrato, rentabilidadePerc: resultado.rentabilidadePerc },
      }, atual);
      setSnapshot(snap);
      setAtual({ ...atual, id: r.id, nome, codigo: r.codigo ?? atual.codigo });
      toast.success("Cotação salva e valores congelados");
      setComparar(false);
    } catch (e) { toast.error((e as Error).message); } finally { setSalvando(false); }
  };

  const salvar = () => {
    if (!validar()) return;
    if (snapshot && !congeladoIntacto) { setComparar(true); return; }
    gravar();
  };

  const nova = () => {
    if (linhas.length && !confirm("Começar uma nova cotação? Os itens atuais serão limpos da tela (o que já foi salvo continua em Cotações).")) return;
    setLinhas([]); setConfig({ ...CONFIG_BS_PADRAO, duracaoMeses: params.duracaoMeses, convencao: params.irpjCsllConvencao === "roi_ito" ? "roi_ito" : "padrao_site" }); setAtual(COTACAO_BS_VAZIA); setSnapshot(null);
  };

  if (R.loading) return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</p>;
  if (R.error) return <p className="text-sm text-destructive">Não foi possível carregar o catálogo ou os impostos do BodyShop. Atualize a página ou confira seu acesso.</p>;

  const codigoAtual = atual.codigo ?? cot.lista.find((x) => x.id === atual.id)?.quote_code ?? null;

  return (
    <div className="space-y-4">
      {snapshot && (
        <div className={`flex flex-wrap items-center gap-3 rounded-lg border px-4 py-2.5 text-sm ${congeladoIntacto ? "border-primary/40 bg-primary/5" : "border-primary/40 bg-muted"}`}>
          <Lock className="h-4 w-4 text-primary shrink-0" />
          <span className="flex-1 min-w-0">
            {congeladoIntacto
              ? <>Valores congelados em {new Date(snapshot.congeladoEm).toLocaleDateString("pt-BR")} — encargos {snapshot.itens[0]?.encargosPerc ?? "—"}%, benefícios {brl(snapshot.itens[0]?.beneficiosMensais ?? 0)}, indiretos {snapshot.itens[0]?.indiretosPerc ?? "—"}% · versão {snapshot.versao}</>
              : <>Cotação editada: valores atuais serão congelados após confirmação.</>}
          </span>
          {congeladoIntacto && (
            <Button size="sm" variant="outline" disabled={!podeCotar || !atual.id} onClick={() => setComparar(true)}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Reavaliar com os parâmetros atuais</Button>
          )}
        </div>
      )}
      {!snapshot && atual.id && (
        <p className="rounded-lg border border-primary/40 bg-muted px-4 py-2 text-sm">Esta cotação foi salva sem valores congelados; os números são recalculados com os parâmetros atuais.</p>
      )}

      {/* Cabeçalho da cotação */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1"><Label htmlFor="bs-cliente" className="text-xs flex items-center gap-1.5 h-4 text-muted-foreground"><Building2 className="h-3.5 w-3.5 text-primary" /> Nome do Cliente *</Label><Input id="bs-cliente" disabled={!podeCotar} value={atual.cliente} onChange={(e) => setAtual({ ...atual, cliente: e.target.value })} /></div>
            {([
              ["gerenteConta", "Gerente de Conta *", ""], ["especialistaBU", "Especialista da BU *", ""],
              ["salesforce", "No. Oportunidade Sales Force *", "Ex.: 0061x00000ABCDE"], ["arquitetoBU", "Arquiteto BU *", ""],
            ] as const).map(([k, label, ph]) => (
              <div key={k} className="space-y-1"><Label htmlFor={`bs-${k}`} className="text-xs flex items-center h-4 text-muted-foreground">{label}</Label><Input id={`bs-${k}`} disabled={!podeCotar} value={atual[k] ?? ""} placeholder={ph} onChange={(e) => setAtual({ ...atual, [k]: e.target.value })} /></div>
            ))}
            <div className="space-y-1"><Label htmlFor="bs-nome" className="text-xs flex items-center gap-1.5 h-4 text-muted-foreground"><FileSignature className="h-3.5 w-3.5 text-primary" /> Nome da cotação (opcional)</Label><Input id="bs-nome" disabled={!podeCotar} value={atual.nome} onChange={(e) => setAtual({ ...atual, nome: e.target.value })} /></div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {codigoAtual && <Badge variant="outline" className="font-mono">{codigoAtual}</Badge>}
            <Button variant="outline" disabled={!podeCotar} onClick={nova}><FilePlus2 className="h-4 w-4 mr-1" /> Nova</Button>
            <Button onClick={salvar} disabled={salvando || linhas.length === 0 || !podeCotar || res.temErros}><Save className="h-4 w-4 mr-1" /> Salvar</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Handshake className="h-4 w-4 text-primary" /> Condição comercial da cotação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3" id="condicoes">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="space-y-1"><Label htmlFor="bs-duracao" className="text-xs text-muted-foreground">Duração (meses)</Label><Input id="bs-duracao" className="h-9" type="number" min={1} disabled={!podeCotar} value={config.duracaoMeses} onChange={e => setConfig({ ...config, duracaoMeses: Number(e.target.value) })} /></div>
            <div className="space-y-1"><Label htmlFor="bs-inicio" className="text-xs text-muted-foreground">Início previsto</Label><Input id="bs-inicio" className="h-9" type="date" disabled={!podeCotar} value={config.dataInicio ?? ""} onChange={e => setConfig({ ...config, dataInicio: e.target.value || null })} /></div>
            <div className="space-y-1"><Label className="text-xs text-muted-foreground">Município (ISS)</Label><Select disabled={!podeCotar} value={config.municipio} onValueChange={municipio => setConfig({ ...config, municipio })}><SelectTrigger className="h-9" aria-label="Município de prestação"><SelectValue /></SelectTrigger><SelectContent>{municipios.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label htmlFor="bs-desconto" className="text-xs text-muted-foreground">Desconto total %</Label><Input id="bs-desconto" className="h-9" type="number" min={0} max={100} disabled={!podeCotar} value={config.descontoTotalPerc} onChange={e => setConfig({ ...config, descontoTotalPerc: Number(e.target.value) })} /></div>
            <div className="space-y-1"><Label htmlFor="bs-alvo" className="text-xs text-muted-foreground">Rentabilidade alvo %</Label><Input id="bs-alvo" className="h-9" type="number" disabled={!podeCotar} value={config.rentabilidadeAlvoPerc ?? params.rentabilidadeAlvoPerc} onChange={e => setConfig({ ...config, rentabilidadeAlvoPerc: e.target.value === "" ? null : Number(e.target.value) })} /></div>
          </div>
          <p className="text-xs rounded-md bg-muted/50 px-3 py-2 text-muted-foreground">Contrato de {config.duracaoMeses} meses, início {config.dataInicio ? `em ${new Date(config.dataInicio + "T12:00:00").toLocaleDateString("pt-BR")}` : "a definir"}, faturamento em {config.municipio}.</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4 items-start">
        <Card>
          <CardHeader className="flex flex-row flex-wrap gap-3 items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2"><ListChecks className="h-4 w-4 text-primary" /> Itens da proposta</CardTitle>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">{linhas.length} item(ns) · vagas profissionais</p>
            </div>
            <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={!podeCotar} onClick={() => setIa(true)}>Adicionar por descrição de vaga</Button><Button size="sm" onClick={adicionar} disabled={ativos.length === 0 || !podeCotar}><Plus className="h-4 w-4 mr-1" /> Adicionar item</Button></div>
          </CardHeader>
          <CardContent className="space-y-3">
            {linhas.length === 0 && (
              <div className="rounded-lg border border-dashed p-10 flex flex-col items-center gap-2 text-center">
                <ShieldCheck className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Nenhuma vaga adicionada.</p>
                <Button size="sm" variant="outline" onClick={adicionar} disabled={ativos.length === 0 || !podeCotar}><Plus className="h-4 w-4 mr-1" /> Adicionar item</Button>
              </div>
            )}
            {res.linhas.map((r) => {
              const l = linhas.find((x) => x.id === r.entrada.linhaId);
              if (!l) return null;
              return <BSLineEditor key={l.id} r={r} linha={l} ativos={ativos} disabled={!podeCotar} duracao={config.duracaoMeses}
                onChange={p => upd(l.id, p)} onRemove={() => setLinhas(linhas.filter(x => x.id !== l.id))} />;
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
                <Mini icon={TrendingUp} l="Lucro" v={brl(res.lucroTotalMensal)} />
              </div>
              {res.precoTabelaTotal !== res.precoFinalTotalMensal && <div className="flex justify-between"><span className="text-muted-foreground">Desconto</span><span className="tabular-nums font-medium">− {brl(res.precoTabelaTotal - res.precoFinalTotalMensal)}</span></div>}
              <div className="flex flex-wrap gap-2 justify-between items-baseline border-t pt-3"><span className="font-semibold">Valor Mensal Total</span><span className="text-xl font-bold tabular-nums">{brl(res.precoFinalTotalMensal)}</span></div>
              <div className="flex flex-wrap justify-between gap-2"><span>Valor Total do Contrato</span><strong>{brl(res.precoFinalTotalContrato)}</strong></div>
              <div className="bg-muted/50 p-2 text-xs text-muted-foreground space-y-1"><p>{config.municipio} · {config.duracaoMeses} meses</p><p>Comissão {res.cascataBase.comissaoFixaPerc ?? "Escala Selbetti"}% · Retenção {pct2(res.cascataBase.retencaoPerc)} · IR/CSLL {pct2(res.cascataBase.irpjCsllPerc)}</p><a href="#condicoes" className="text-primary underline">Alterar condições</a></div>
              {res.abaixoPiso && <p className="text-xs text-destructive flex gap-1"><AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Há itens abaixo do piso de rentabilidade.</p>}
              {res.temErros && <p className="text-xs text-destructive flex gap-1"><AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Há itens com erro; eles não entram no total.</p>}
              <ApprovalBadge approval={approval} canRequest={!!atual.id && congeladoIntacto && podeCotar} disabledReason={!atual.id ? "Salve a cotação primeiro" : !congeladoIntacto ? "Salve e confirme os valores antes de solicitar" : undefined} />
            </CardContent>
          </Card>
        </div>
      </div>

      <BsIaDialog open={ia} onOpenChange={setIa} cargos={ativos} onAdd={l => setLinhas([...linhas, l])} />
      <Comparacao open={comparar} onOpenChange={setComparar} antes={congelado} depois={vivo} diffs={diffs}
        avisoAprovacao={!!approval.request && Math.abs((congelado?.rentabilidadePerc ?? 0) - vivo.rentabilidadePerc) > 1e-6}
        salvando={salvando || vivo.temErros || !podeCotar} onConfirm={() => { if (validar()) gravar(true); }} />
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

function Comparacao({ open, onOpenChange, antes, depois, diffs, avisoAprovacao, salvando, onConfirm }: {
  open: boolean; onOpenChange: (o: boolean) => void; antes: CarrinhoBS | null; depois: CarrinhoBS; diffs: string[];
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
        {avisoAprovacao && <p className="text-xs rounded border border-primary/40 bg-muted p-2">Já existe uma aprovação registrada para esta cotação; ela se refere aos valores anteriores.</p>}
        <Table>
          <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-right">Custo</TableHead><TableHead className="text-right">Preço final</TableHead><TableHead className="text-right">Rentabilidade</TableHead></TableRow></TableHeader>
          <TableBody>
            {linhas.map(({ a, d }) => (
              <TableRow key={d.entrada.linhaId}>
                <TableCell className="text-xs">{`${d.entrada.cargo} · ${d.entrada.senioridade}`}</TableCell>
                {cel(a?.custoLinha, d.custoLinha, brl)}{cel(a?.precoFinal, d.precoFinal, brl)}{cel(a?.rentabilidadePerc, d.rentabilidadePerc, pct2)}
              </TableRow>
            ))}
            <TableRow className="font-semibold">
              <TableCell className="text-xs">Total</TableCell>
              {cel(antes?.custoTotal, depois.custoTotal, brl)}{cel(antes?.precoFinalTotalMensal, depois.precoFinalTotalMensal, brl)}{cel(antes?.rentabilidadePerc, depois.rentabilidadePerc, pct2)}
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
