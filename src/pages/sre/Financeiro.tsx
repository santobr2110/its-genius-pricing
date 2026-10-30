import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Calculator, Clock, DollarSign, Loader2, Percent, Receipt, Table as TableIcon, TrendingUp, Undo2, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PrecoReformaInfo from "@/components/PrecoReformaInfo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { parcelasDeLinhas } from "@/lib/pricing/reformaTributaria";
import { parseComissao } from "@/lib/treinamento/calc";
import { computeCarrinhoSre, type CarrinhoSre } from "@/lib/sre/carrinho";
import SubNav from "@/pages/treinamento/financeiro/SubNav";
import { useSreResultado } from "./useSreResultado";
import { SRE_BASE } from "./useSreState";

const BASE = `${SRE_BASE}/financeiro`;
const ITEMS = [
  { to: BASE, label: "Resultado da Operação", icon: Receipt, end: true },
  { to: `${BASE}/impostos`, label: "Impostos & Markup", icon: Calculator },
  { to: `${BASE}/comissoes`, label: "Comissões", icon: TableIcon },
];
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (n: number) => `${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const hrs = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`;

function Shell({ children }: { children: React.ReactNode }) {
  const { loading } = useSreResultado();
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <SubNav items={ITEMS} />
      {loading ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</p> : children}
    </div>
  );
}

async function salvarParam(key: string, value: unknown, userId: string | undefined) {
  const { error } = await supabase.from("sre_params").update({ value: value as never, updated_by: userId ?? null }).eq("key", key);
  if (error) throw error;
}

/** Decomposição da venda (soma das linhas válidas); reutilizada pelo Resumo. */
export function composicaoSre(res: CarrinhoSre) {
  const ok = res.linhas.filter((l) => l.erros.length === 0 && l.fixos);
  const soma = (f: (l: typeof ok[number]) => number) => ok.reduce((s, l) => s + f(l), 0);
  const custoExec = soma((l) => l.entrada.horasExecucao * l.entrada.custoHoraExecucao * l.entrada.quantidade);
  const custoGestao = soma((l) => l.horasGestaoLinha * l.entrada.custoHoraGestao);
  return {
    ok,
    impostos: soma((l) => l.precoFinal * (l.fixos!.pisPerc + l.fixos!.cofinsPerc + l.fixos!.issPerc) / 100),
    comissao: soma((l) => l.precoFinal * l.comissaoPerc / 100),
    retencao: soma((l) => l.precoFinal * l.fixos!.retencaoPerc / 100),
    ir: soma((l) => l.precoFinal * l.fixos!.irpjCsllPerc / 100),
    enc: soma((l) => l.precoFinal * l.fixos!.encFinancPerc / 100),
    custoExec, custoGestao,
  };
}

export function SreResultado() {
  const { res, st } = useSreResultado();
  const c = composicaoSre(res);
  const pv = res.precoFinalTotal;
  const p = (v: number) => (pv > 0 ? (v / pv) * 100 : 0);
  const L = (label: string, v: number, perc: number | null, o: { bold?: boolean; tone?: "neg" | "pos"; muted?: boolean } = {}) => (
    <div className={`flex items-center justify-between text-sm ${o.bold ? "font-semibold" : ""} ${o.muted ? "text-muted-foreground" : ""}`}>
      <span className="truncate">{label}</span>
      <span className="flex items-baseline gap-3 tabular-nums">
        <span className="w-16 text-right text-xs text-muted-foreground">{perc == null ? "" : pct(perc)}</span>
        <span className={`w-32 text-right ${o.bold && o.tone === "neg" ? "text-destructive" : o.bold && o.tone === "pos" ? "text-primary" : ""}`}>{brl(v)}</span>
      </span>
    </div>
  );
  return (
    <Shell>
      <ResumoCards custo={res.custoTotal} pv={pv} rent={res.rentabilidadePerc} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" /> Composição do Resultado da Operação</CardTitle>
          <p className="text-xs text-muted-foreground">Cotação {st.atual.nome || "atual"}. Aqui a venda é a base e o lucro é o que sobra.</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {c.ok.length === 0 ? <p className="text-sm text-muted-foreground">Adicione pacotes no <Link to={SRE_BASE} className="text-primary hover:underline">Configurador</Link>.</p> : <>
            {L("Valor de VENDA", pv, 100, { bold: true })}
            <Separator className="my-2" />
            {L("(−) Impostos (PIS + COFINS + ISS)", -c.impostos, p(c.impostos))}
            {L("(−) Comissão", -c.comissao, p(c.comissao))}
            {L("(−) Retenção", -c.retencao, p(c.retencao))}
            {L("(−) IR / CSLL", -c.ir, p(c.ir))}
            {c.enc > 0 && L("(−) Encargos financeiros", -c.enc, p(c.enc))}
            {L("(−) Custo (horas de execução + gestão)", -res.custoTotal, p(res.custoTotal))}
            <Separator className="my-2" />
            {L("Lucro", res.lucroTotal, res.rentabilidadePerc, { bold: true, tone: res.lucroTotal < 0 ? "neg" : "pos" })}
            <Separator className="my-3" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Horas da cotação</p>
            {L(`Horas de execução vendidas · ${hrs(res.horasExecucaoTotal)}`, c.custoExec, p(c.custoExec), { muted: true })}
            {L(`Horas de gestão embutidas (não faturadas) · ${hrs(res.horasGestaoTotal)}`, c.custoGestao, p(c.custoGestao), { muted: true })}
            <p className="text-[11px] text-muted-foreground">O cliente compra só as horas de execução; a gestão é custo interno da Selbetti, já embutido no preço.</p>
            <div className="pt-2"><PrecoReformaInfo parcelas={parcelasDeLinhas(c.ok)} /></div>
          </>}
        </CardContent>
      </Card>
    </Shell>
  );
}

function Comp({ label, tag, desc, valor, children, edit }: { label: string; tag: string; desc: React.ReactNode; valor?: number; children?: React.ReactNode; edit?: boolean }) {
  return (
    <div className={`space-y-2 rounded-lg border p-3 ${edit ? "border-primary/30 bg-background" : "border-dashed border-muted-foreground/30 bg-muted/30"}`}>
      <div className="flex justify-between items-center gap-3">
        <div className="min-w-0">
          <Label className="text-sm font-medium">{label} <span className={`text-[10px] uppercase tracking-wider ml-1 ${edit ? "text-primary" : "text-muted-foreground"}`}>({tag})</span></Label>
          <p className="text-[11px] text-muted-foreground leading-snug">{desc}</p>
        </div>
        {valor != null && !children && <span className="text-base font-bold tabular-nums shrink-0">{pct(valor)}</span>}
      </div>
      {children}
    </div>
  );
}

export function SreImpostos() {
  const { can } = useAuth();
  const { st, res, globais, params, rentabilidadeCotacao } = useSreResultado();
  const { config, setConfig } = st;
  const podeParams = can("page.sre.params");
  const editPerc = (k: "encFinancPerc" | "descontoTotalPerc" | "rentabilidadePerc", atual: number, max: number) => (
    <>
      <div className="flex justify-end items-center gap-2 -mt-9">
        <Input type="number" step={0.01} value={atual} onChange={(e) => setConfig({ ...config, [k]: Number(e.target.value) || 0 })} className="h-8 w-20 text-right" />
        <span className="text-sm font-semibold w-4">%</span>
      </div>
      <Slider value={[atual]} onValueChange={([v]) => setConfig({ ...config, [k]: v })} min={0} max={max} step={0.01} />
    </>
  );
  const t0 = res.linhas.find((l) => l.fixos)?.fixos;
  return (
    <Shell>
      <ProdutosPorPacote />
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /> Componentes sobre a venda</CardTitle>
          <p className="text-xs text-muted-foreground">Como no Smart ITO: o custo vem das horas e o vendedor define a rentabilidade da cotação. Os demais percentuais se somam a ela na cascata.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Comp label="Rentabilidade" tag="editável" edit desc={`Definida pelo vendedor para a cotação inteira. Valor inicial: ${pct(params.rentabilidadePadraoPerc)} (Configurações › Parâmetros).`}>{editPerc("rentabilidadePerc", rentabilidadeCotacao, 60)}</Comp>
          <Comp label="PIS · COFINS · ISS" tag="automático" desc="Vêm do produto fiscal de cada pacote no município escolhido." valor={t0 ? t0.pisPerc + t0.cofinsPerc + t0.issPerc : 0} />
          <Comp label="IRPJ / CSLL" tag="central" desc={<>Convenção {globais.irpjCsllConvencao === "padrao_site" ? "padrão do site" : globais.irpjCsllConvencao}. Percentual definido na Administração; cotações congeladas preservam o imposto original.{!podeParams && " Só quem tem a permissão de parâmetros do SRE vê a convenção."}</>} valor={globais.irpjCsllPerc} />
          <Comp label="Encargos financeiros" tag="editável" edit desc="Custos financeiros do contrato.">{editPerc("encFinancPerc", config.encFinancPerc ?? params.encFinancPerc, 15)}</Comp>
          <Comp label="Retenção" tag="parâmetro" desc={<>Somada à comissão na cascata. Definida em Configurações › Parâmetros.</>} valor={globais.retencaoPerc} />
          <Comp label="Desconto total" tag="editável" edit desc="Aplicado sobre todos os itens, composto com a campanha e o desconto de cada item.">{editPerc("descontoTotalPerc", config.descontoTotalPerc, 50)}</Comp>
        </CardContent>
      </Card>
    </Shell>
  );
}

function ProdutosPorPacote() {
  const { can } = useAuth();
  const { cad, tax, st, params } = useSreResultado();
  const pode = can("page.sre.admin");
  const orig = Object.fromEntries(cad.pacotes.map((p) => [p.id, p.codigo_produto]));
  const key = JSON.stringify(orig);
  const [v, setV] = useState<Record<string, string | null>>(orig);
  useEffect(() => setV(JSON.parse(key)), [key]);
  const codigos = tax.codes.filter((c) => c.ativo !== false && c.ofertas?.includes("consultivo-sre"));
  const temNoMunicipio = (cod: string) => {
    const id = tax.codes.find((c) => c.codigo === cod)?.id;
    return tax.rates.some((r) => r.tax_product_code_id === id && r.municipio === st.config.municipio);
  };
  const alterados = cad.pacotes.filter((p) => (v[p.id] ?? null) !== (p.codigo_produto ?? null));
  const salvar = async () => {
    try {
      for (const p of alterados) {
        const { error } = await supabase.from("sre_pacotes").update({ codigo_produto: v[p.id] ?? null }).eq("id", p.id);
        if (error) throw error;
      }
      toast.success("Produtos fiscais salvos"); cad.refresh();
    } catch (e) { toast.error((e as Error).message); }
  };
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2"><TableIcon className="h-4 w-4 text-primary" /> Produto fiscal por pacote</CardTitle>
          <p className="text-xs text-muted-foreground">Sem exceção, o pacote usa o padrão <strong>{params.produtoPadrao}</strong>. A lista mostra os produtos marcados para Pacotes Consultivos SRE no Cadastro tributário.</p>
        </div>
        {pode && <Button size="sm" onClick={salvar} disabled={alterados.length === 0}>Salvar{alterados.length ? ` (${alterados.length})` : ""}</Button>}
      </CardHeader>
      <CardContent className="space-y-2">
        {cad.pacotes.map((p) => {
          const atual = v[p.id];
          const efetivo = atual ?? params.produtoPadrao;
          return (
            <div key={p.id} className="grid grid-cols-1 md:grid-cols-[1fr_280px] items-center gap-2">
              <p className="text-sm"><span className="font-medium">{p.part_number}</span> <span className="text-xs text-muted-foreground">· {Number(p.horas_execucao).toLocaleString("pt-BR")} h</span></p>
              <div>
                {atual == null ? (
                  <div className="flex items-center gap-2 h-9">
                    <span className="text-sm text-muted-foreground">{params.produtoPadrao}</span>
                    <Badge variant="outline" className="text-[9px] text-muted-foreground">herdado do padrão</Badge>
                    {pode && <Button size="sm" variant="outline" className="h-7 ml-auto text-xs" onClick={() => setV({ ...v, [p.id]: params.produtoPadrao })}>Criar exceção</Button>}
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <Select value={atual} disabled={!pode} onValueChange={(x) => setV({ ...v, [p.id]: x })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>{(codigos.some((c) => c.codigo === atual) ? codigos : [{ codigo: atual, nome: "" }, ...codigos]).map((c) => <SelectItem key={c.codigo} value={c.codigo}>{c.codigo}{c.nome && c.nome !== c.codigo ? ` · ${c.nome}` : ""}</SelectItem>)}</SelectContent>
                    </Select>
                    {pode && <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" title="Voltar ao padrão" onClick={() => setV({ ...v, [p.id]: null })}><Undo2 className="h-3.5 w-3.5" /></Button>}
                  </div>
                )}
                {!temNoMunicipio(efetivo) && <p className="text-[11px] text-destructive">Sem alíquotas em {st.config.municipio}.</p>}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function ComissaoModoCard() {
  const { cad, entradasVivas, globaisVivos, tiersVivos } = useSreResultado();
  const { user, can } = useAuth();
  const podeEditar = can("page.sre.admin");
  const SUGERIDO = "7,32";
  const salvo = parseComissao(cad.params.find((p) => p.key === "comissao_regra")?.value);
  const [fixaAtiva, setFixaAtiva] = useState(salvo != null);
  const [valor, setValor] = useState(salvo != null ? String(salvo).replace(".", ",") : SUGERIDO);
  const [salvando, setSalvando] = useState(false);
  useEffect(() => { setFixaAtiva(salvo != null); setValor(salvo != null ? String(salvo).replace(".", ",") : SUGERIDO); }, [salvo]);
  const salvar = async () => {
    const v = fixaAtiva ? valor.trim() : "";
    if (fixaAtiva && parseComissao(v) == null) return toast.error("Informe um percentual válido para a comissão fixa.");
    setSalvando(true);
    try { await salvarParam("comissao_regra", v, user?.id); toast.success("Regra de comissão salva"); cad.refresh(); }
    catch (e) { toast.error((e as Error).message); } finally { setSalvando(false); }
  };
  const fixaNum = parseComissao(valor) ?? 7.32;
  const escala = useMemo(() => computeCarrinhoSre(entradasVivas, { ...globaisVivos, comissaoFixaPerc: null }, tiersVivos), [entradasVivas, globaisVivos, tiersVivos]);
  const fixa = useMemo(() => computeCarrinhoSre(entradasVivas, { ...globaisVivos, comissaoFixaPerc: fixaNum }, tiersVivos), [entradasVivas, globaisVivos, tiersVivos, fixaNum]);
  const comissaoMedia = (c: CarrinhoSre) => (c.precoFinalTotal > 0 ? c.linhas.filter((l) => !l.erros.length).reduce((s, l) => s + l.precoFinal * l.comissaoPerc, 0) / c.precoFinalTotal : 0);
  const linha = (l: string, a: string, b: string) => <TableRow><TableCell className="text-xs">{l}</TableCell><TableCell className="text-right tabular-nums text-xs">{a}</TableCell><TableCell className="text-right tabular-nums text-xs">{b}</TableCell></TableRow>;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Percent className="h-4 w-4 text-primary" /> Regra de comissão</CardTitle>
        <p className="text-xs text-muted-foreground">Escala Selbetti é a regra desta oferta. A comissão fixa fica como alternativa.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Switch id="sre-comissao-fixa" checked={fixaAtiva} disabled={!podeEditar} onCheckedChange={setFixaAtiva} />
          <Label htmlFor="sre-comissao-fixa" className="text-sm">{fixaAtiva ? "Comissão fixa" : "Escala Selbetti"}</Label>
        </div>
        {fixaAtiva && (
          <div className="flex items-center gap-2 max-w-sm">
            <Input value={valor} disabled={!podeEditar} onChange={(e) => setValor(e.target.value)} className="h-9 text-right" />
            <span className="text-xs text-muted-foreground">%</span>
            {valor.trim() === SUGERIDO && <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600">[A CONFIRMAR]</Badge>}
          </div>
        )}
        {fixaAtiva && <p className="text-[11px] text-muted-foreground">7,32% é a faixa da escala para o alvo de 20%, não uma decisão comercial.</p>}
        {!fixaAtiva && (
          <p className="text-xs rounded-md border border-amber-500/50 bg-amber-500/10 p-2">A Escala Selbetti é uma função em degraus, e a comissão desta oferta é resolvida pela faixa da rentabilidade. Em cotações com desconto isso faz a comissão mudar de faixa e, em alguns pontos, a rentabilidade sobe quando o desconto aumenta ou quando o pacote é maior. Os itens afetados ficam marcados em âmbar no Configurador.</p>
        )}
        {podeEditar && <div className="flex justify-end"><Button size="sm" onClick={salvar} disabled={salvando}>{salvando && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}Salvar</Button></div>}

        <div className="rounded-md border p-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Cotação aberta nos dois modos (só leitura)</p>
          {entradasVivas.length === 0 ? <p className="text-xs text-muted-foreground">Adicione pacotes no Configurador para comparar.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead></TableHead><TableHead className="text-right">Escala Selbetti</TableHead><TableHead className="text-right">Fixa {pct(fixaNum)}</TableHead></TableRow></TableHeader>
              <TableBody>
                {linha("Preço de tabela", brl(escala.precoTabelaTotal), brl(fixa.precoTabelaTotal))}
                {linha("Preço final", brl(escala.precoFinalTotal), brl(fixa.precoFinalTotal))}
                {linha("Comissão (média ponderada)", pct(comissaoMedia(escala)), pct(comissaoMedia(fixa)))}
                {linha("Rentabilidade", pct(escala.rentabilidadePerc), pct(fixa.rentabilidadePerc))}
                {linha("Lucro", brl(escala.lucroTotal), brl(fixa.lucroTotal))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function SreComissoes() {
  const { res, st, tiersVivos } = useSreResultado();
  const tiers = st.snapshot?.comissaoTiers ?? tiersVivos;
  const fixa = res.cascataBase.comissaoFixaPerc;
  return (
    <Shell>
      <ComissaoModoCard />
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><TableIcon className="h-4 w-4 text-primary" /> Escala Selbetti — Comissão por Faixa de Rentabilidade</CardTitle>
          <p className="text-xs text-muted-foreground">Rentabilidade atual da cotação: <span className="font-semibold text-foreground">{pct(res.rentabilidadePerc)}</span>.</p>
          {fixa != null && <p className="text-xs rounded border border-primary/40 bg-primary/10 px-2 py-1">Comissão fixa de <span className="font-semibold">{pct(fixa)}</span> ativa — a escala abaixo não está sendo aplicada.</p>}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2">
            <span>Rent. mínima (%)</span><span>Rent. máxima (%)</span><span>Comissão (%)</span>
          </div>
          {tiers.map((t, i) => (
            <div key={i} className="grid grid-cols-3 gap-2 items-center">
              <Input disabled value={t.minRent} className="h-8 text-right" />
              <Input disabled value={t.maxRent == null ? "—" : t.maxRent} className="h-8 text-right" />
              <Input disabled value={t.comissao} className="h-8 text-right" />
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground">Tabela padrão da empresa, a mesma das demais ofertas.</p>
        </CardContent>
      </Card>
    </Shell>
  );
}

function ResumoCards({ custo, pv, rent }: { custo: number; pv: number; rent: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" /> Custo Total</CardTitle></CardHeader>
        <CardContent><p className="text-2xl font-bold">{brl(custo)}</p><p className="text-[11px] text-muted-foreground mt-1">Horas de execução + gestão</p></CardContent></Card>
      <Card className="border-primary/40 bg-primary/5"><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Valor de Venda</CardTitle></CardHeader>
        <CardContent><p className="text-2xl font-bold text-primary">{brl(pv)}</p><p className="text-[11px] text-muted-foreground mt-1">Custo pela cascata com o alvo de cada pacote, após descontos</p></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"><Percent className="h-3.5 w-3.5" /> Rentabilidade</CardTitle></CardHeader>
        <CardContent><p className={`text-2xl font-bold ${rent < 0 ? "text-destructive" : ""}`}>{pct(rent)}</p><p className="text-[11px] text-muted-foreground mt-1">Lucro ÷ valor de venda</p></CardContent></Card>
    </div>
  );
}
