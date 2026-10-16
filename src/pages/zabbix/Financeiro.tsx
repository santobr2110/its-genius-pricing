import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Calculator, DollarSign, Loader2, Percent, Receipt, ShieldAlert, Table as TableIcon, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import ProdutoFiscalCard from "@/components/financeiro/ProdutoFiscalCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { resolveIrpjCsllPerc } from "@/lib/pricing/cascata";
import { DEFAULT_COMISSAO_TIERS } from "@/lib/comissaoRentabilidade";
import { parseComissao } from "@/lib/treinamento/calc";
import SubNav from "@/pages/treinamento/financeiro/SubNav";
import { useZabbixResultado } from "./useZabbixResultado";
import { ZBX_BASE } from "./useZbxState";

const BASE = `${ZBX_BASE}/financeiro`;
const ITEMS = [
  { to: BASE, label: "Resultado da Operação", icon: Receipt, end: true },
  { to: `${BASE}/impostos`, label: "Impostos & Markup", icon: Calculator },
  { to: `${BASE}/comissoes`, label: "Comissões", icon: TableIcon },
];
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (n: number) => `${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

function Shell({ children }: { children: React.ReactNode }) {
  const { loading } = useZabbixResultado();
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <SubNav items={ITEMS} />
      {loading ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</p> : children}
    </div>
  );
}

/** Grava um parâmetro em zabbix_params (só quem administra a oferta). */
async function salvarParam(key: string, value: unknown, userId: string | undefined) {
  const { error } = await supabase.from("zabbix_params").update({ value: value as never, updated_by: userId ?? null }).eq("key", key);
  if (error) throw error;
}

export function ZbxResultado() {
  const { res, st } = useZabbixResultado();
  const ok = res.linhas.filter((l) => l.erros.length === 0 && l.fixos);
  const pv = res.precoFinalTotal;
  const soma = (f: (l: typeof ok[number]) => number) => ok.reduce((s, l) => s + f(l), 0);
  const impostos = soma((l) => l.precoFinal * (l.fixos!.pisPerc + l.fixos!.cofinsPerc + l.fixos!.issPerc) / 100);
  const comissao = soma((l) => l.precoFinal * l.comissaoPerc / 100);
  const retencao = soma((l) => l.precoFinal * l.fixos!.retencaoPerc / 100);
  const ir = soma((l) => l.precoFinal * l.fixos!.irpjCsllPerc / 100);
  const enc = soma((l) => l.precoFinal * l.fixos!.encFinancPerc / 100);
  const custo = res.custoTotal;
  const p = (v: number) => (pv > 0 ? (v / pv) * 100 : 0);
  const L = (label: string, v: number, perc: number, o: { bold?: boolean; tone?: "neg" | "pos" } = {}) => (
    <div className={`flex items-center justify-between text-sm ${o.bold ? "font-semibold" : ""}`}>
      <span className="truncate">{label}</span>
      <span className="flex items-baseline gap-3 tabular-nums">
        <span className="w-16 text-right text-xs text-muted-foreground">{pct(perc)}</span>
        <span className={`w-32 text-right ${o.bold && o.tone === "neg" ? "text-destructive" : o.bold && o.tone === "pos" ? "text-primary" : ""}`}>{brl(v)}</span>
      </span>
    </div>
  );
  return (
    <Shell>
      <ResumoCards custo={custo} pv={pv} rent={res.rentabilidadePerc} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" /> Composição do Resultado da Operação</CardTitle>
          <p className="text-xs text-muted-foreground">Cotação {st.atual.nome || "atual"}. Aqui a venda é a base e o lucro é o que sobra.</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {ok.length === 0 ? <p className="text-sm text-muted-foreground">Adicione itens no <Link to={ZBX_BASE} className="text-primary hover:underline">Configurador</Link>.</p> : <>
            {L("Valor de VENDA", pv, 100, { bold: true })}
            <Separator className="my-2" />
            {L("(−) Impostos (PIS + COFINS + ISS)", -impostos, p(impostos))}
            {L("(−) Comissão", -comissao, p(comissao))}
            {L("(−) Retenção", -retencao, p(retencao))}
            {L("(−) IR / CSLL", -ir, p(ir))}
            {enc > 0 && L("(−) Encargos financeiros", -enc, p(enc))}
            {L("(−) Custo (lista Zabbix com descontos)", -custo, p(custo))}
            <Separator className="my-2" />
            {L("Lucro", res.lucroTotal, res.rentabilidadePerc, { bold: true, tone: res.lucroTotal < 0 ? "neg" : "pos" })}
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

export function ZbxImpostos() {
  const { can } = useAuth();
  const { st, res, globais, params } = useZabbixResultado();
  const { config, setConfig } = st;
  const podeParams = can("page.zbx.params") || can("page.zbx.admin");
  const editPerc = (k: "encFinancPerc" | "descontoTotalPerc", atual: number, max: number) => (
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
      <ProdutosPorCategoria />
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /> Componentes sobre a venda</CardTitle>
          <p className="text-xs text-muted-foreground">A rentabilidade não é definida aqui: ela é o resultado do preço de venda menos custo, impostos, comissão e retenção.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Comp label="PIS · COFINS · ISS" tag="automático" desc="Vêm do produto fiscal de cada subscrição no município escolhido." valor={t0 ? t0.pisPerc + t0.cofinsPerc + t0.issPerc : 0} />
          <Comp label="IRPJ / CSLL" tag={podeParams ? "editável" : "convenção"} edit={podeParams} desc="Convenção de IR/CSLL. Só quem tem a permissão de parâmetros altera.">
            <Select value={config.convencao} disabled={!podeParams} onValueChange={(v) => setConfig({ ...config, convencao: v as typeof config.convencao })}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="padrao_site">Padrão do site ({pct(resolveIrpjCsllPerc("padrao_site"))})</SelectItem><SelectItem value="roi_ito">ROI ITO ({pct(resolveIrpjCsllPerc("roi_ito"))}) · a confirmar</SelectItem></SelectContent>
            </Select>
          </Comp>
          <Comp label="Encargos financeiros" tag="editável" edit desc="Custos financeiros do contrato.">{editPerc("encFinancPerc", config.encFinancPerc ?? params.encFinancPerc, 15)}</Comp>
          <Comp label="Retenção" tag="parâmetro" desc={<>Definida em Configurações › Parâmetros.</>} valor={globais.retencaoPerc} />
          <Comp label="Desconto total" tag="editável" edit desc="Aplicado sobre todos os itens da cotação.">{editPerc("descontoTotalPerc", config.descontoTotalPerc, 50)}</Comp>
        </CardContent>
      </Card>
      <PisosCard />
    </Shell>
  );
}

function ProdutosPorCategoria() {
  const { can } = useAuth();
  const { cad, tax, st } = useZabbixResultado();
  const pode = can("page.zbx.admin");
  const orig = Object.fromEntries(cad.subs.map((s) => [s.id, s.codigo_produto]));
  const key = JSON.stringify(orig);
  const [v, setV] = useState<Record<string, string>>(orig);
  useEffect(() => setV(JSON.parse(key)), [key]);
  const codigos = tax.codes.filter((c) => c.ativo !== false && c.ofertas?.includes("zabbix"));
  const temNoMunicipio = (cod: string) => {
    const id = tax.codes.find((c) => c.codigo === cod)?.id;
    return tax.rates.some((r) => r.tax_product_code_id === id && r.municipio === st.config.municipio);
  };
  const alterados = cad.subs.filter((s) => v[s.id] && v[s.id] !== s.codigo_produto);
  const salvar = async () => {
    try {
      for (const s of alterados) {
        const { error } = await supabase.from("zabbix_subscriptions").update({ codigo_produto: v[s.id] }).eq("id", s.id);
        if (error) throw error;
      }
      toast.success("Produtos fiscais salvos"); cad.refresh();
    } catch (e) { toast.error((e as Error).message); }
  };
  const grupos = [["suporte", "Suporte"], ["academy", "Academy"]] as const;
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2"><TableIcon className="h-4 w-4 text-primary" /> Produto fiscal por subscrição</CardTitle>
          <p className="text-xs text-muted-foreground">Cada subscrição usa o seu próprio SKU fiscal. A lista mostra os produtos marcados para Subscrições Zabbix no Cadastro tributário.</p>
        </div>
        {pode && <Button size="sm" onClick={salvar} disabled={alterados.length === 0}>Salvar</Button>}
      </CardHeader>
      <CardContent className="space-y-4">
        {grupos.map(([cat, nome]) => {
          const itens = cad.subs.filter((s) => s.categoria === cat);
          if (!itens.length) return null;
          return (
            <div key={cat} className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">{nome}</p>
              {itens.map((s) => (
                <div key={s.id} className="grid gap-2 sm:grid-cols-[1fr_220px] sm:items-center">
                  <div className="min-w-0"><p className="text-sm font-medium">{s.part_number}</p><p className="text-xs text-muted-foreground truncate">{s.nome}</p></div>
                  <div>
                    <Select value={v[s.id]} disabled={!pode} onValueChange={(x) => setV({ ...v, [s.id]: x })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{(codigos.some((c) => c.codigo === v[s.id]) ? codigos : [{ codigo: v[s.id], nome: "" }, ...codigos]).map((c) => <SelectItem key={c.codigo} value={c.codigo}>{c.codigo}{c.nome && c.nome !== c.codigo ? ` · ${c.nome}` : ""}</SelectItem>)}</SelectContent>
                    </Select>
                    {!temNoMunicipio(v[s.id]) && <p className="text-[11px] text-destructive">Sem alíquotas em {st.config.municipio}.</p>}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function PisosCard() {
  const { can, user } = useAuth();
  const { cad, params } = useZabbixResultado();
  const pode = can("page.zbx.admin");
  const fmt = (n: number | null) => (n == null ? "" : String(n));
  const [v, setV] = useState({ suporte: fmt(params.piso.suporte), academy: fmt(params.piso.academy) });
  const key = JSON.stringify(params.piso);
  useEffect(() => { const p = JSON.parse(key); setV({ suporte: fmt(p.suporte), academy: fmt(p.academy) }); }, [key]);
  const salvar = async () => {
    try {
      for (const k of ["suporte", "academy"] as const) {
        const n = v[k].trim() === "" ? null : Number(v[k].replace(",", "."));
        if (n !== params.piso[k]) await salvarParam(`piso_rentabilidade_${k}`, n, user?.id);
      }
      toast.success("Pisos salvos"); cad.refresh();
    } catch (e) { toast.error((e as Error).message); }
  };
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-primary" /> Pisos de rentabilidade</CardTitle>
          <p className="text-xs text-muted-foreground">Itens abaixo do piso ficam marcados em vermelho. Vazio = sem alerta. Um piso próprio no cadastro do SKU tem prioridade.</p>
        </div>
        {pode && <Button size="sm" onClick={salvar}>Salvar</Button>}
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {(["suporte", "academy"] as const).map((k) => (
          <div key={k} className="space-y-1">
            <Label className="text-xs">{k === "suporte" ? "Suporte" : "Academy"}</Label>
            <div className="flex items-center gap-1"><Input value={v[k]} disabled={!pode} placeholder="Sem piso" onChange={(e) => setV({ ...v, [k]: e.target.value })} className="text-right" /><span className="text-xs text-muted-foreground">%</span></div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ComissaoModoCard() {
  const { cad } = useZabbixResultado();
  const { user, can } = useAuth();
  const podeEditar = can("page.zbx.admin");
  const salvo = parseComissao(cad.params.find((p) => p.key === "comissao_regra")?.value);
  const [fixaAtiva, setFixaAtiva] = useState(salvo != null);
  const [valor, setValor] = useState(salvo != null ? String(salvo).replace(".", ",") : "8,39");
  const [salvando, setSalvando] = useState(false);
  useEffect(() => { setFixaAtiva(salvo != null); setValor(salvo != null ? String(salvo).replace(".", ",") : "8,39"); }, [salvo]);
  const salvar = async () => {
    const v = fixaAtiva ? valor.trim() : "";
    if (fixaAtiva && parseComissao(v) == null) return toast.error("Informe um percentual válido para a comissão fixa.");
    setSalvando(true);
    try { await salvarParam("comissao_regra", v, user?.id); toast.success("Regra de comissão salva"); cad.refresh(); }
    catch (e) { toast.error((e as Error).message); } finally { setSalvando(false); }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Percent className="h-4 w-4 text-primary" /> Regra de comissão</CardTitle>
        <p className="text-xs text-muted-foreground">Comissão fixa aplicada em todas as cotações de Subscrições Zabbix, ou a Escala Selbetti (tabela por rentabilidade abaixo).</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Switch id="zbx-comissao-fixa" checked={fixaAtiva} disabled={!podeEditar} onCheckedChange={setFixaAtiva} />
          <Label htmlFor="zbx-comissao-fixa" className="text-sm">{fixaAtiva ? "Comissão fixa" : "Escala Selbetti"}</Label>
        </div>
        {fixaAtiva && (
          <div className="flex items-center gap-2 max-w-xs">
            <Input value={valor} disabled={!podeEditar} onChange={(e) => setValor(e.target.value)} className="h-9 text-right" />
            <span className="text-xs text-muted-foreground">%</span>
          </div>
        )}
        {podeEditar && <div className="flex justify-end"><Button size="sm" onClick={salvar} disabled={salvando}>{salvando && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}Salvar</Button></div>}
      </CardContent>
    </Card>
  );
}

export function ZbxComissoes() {
  const { res } = useZabbixResultado();
  const fixa = res.cascataBase.comissaoFixaPerc;
  const rent = res.rentabilidadePerc;
  return (
    <Shell>
      <ComissaoModoCard />
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><TableIcon className="h-4 w-4 text-primary" /> Escala Selbetti — Comissão por Faixa de Rentabilidade</CardTitle>
          <p className="text-xs text-muted-foreground">Alternativa à comissão fixa. Rentabilidade atual da cotação: <span className="font-semibold text-foreground">{pct(rent)}</span>.</p>
          {fixa != null && <p className="text-xs rounded border border-primary/40 bg-primary/10 px-2 py-1">Comissão fixa de <span className="font-semibold">{pct(fixa)}</span> ativa — a escala abaixo não está sendo aplicada.</p>}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2">
            <span>Rent. mínima (%)</span><span>Rent. máxima (%)</span><span>Comissão (%)</span>
          </div>
          {DEFAULT_COMISSAO_TIERS.map((t, i) => (
            <div key={i} className="grid grid-cols-3 gap-2 items-center">
              <Input disabled value={t.minRent} className="h-8 text-right" />
              <Input disabled value={t.maxRent == null ? "—" : t.maxRent} className="h-8 text-right" />
              <Input disabled value={t.comissao} className="h-8 text-right" />
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground">Tabela padrão da empresa, a mesma do Treinamento.</p>
        </CardContent>
      </Card>
    </Shell>
  );
}

function ResumoCards({ custo, pv, rent }: { custo: number; pv: number; rent: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" /> Custo Total</CardTitle></CardHeader>
        <CardContent><p className="text-2xl font-bold">{brl(custo)}</p><p className="text-[11px] text-muted-foreground mt-1">Lista Zabbix com descontos</p></CardContent></Card>
      <Card className="border-primary/40 bg-primary/5"><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Valor de Venda</CardTitle></CardHeader>
        <CardContent><p className="text-2xl font-bold text-primary">{brl(pv)}</p><p className="text-[11px] text-muted-foreground mt-1">Preço fixo por SKU, após descontos</p></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"><Percent className="h-3.5 w-3.5" /> Rentabilidade</CardTitle></CardHeader>
        <CardContent><p className={`text-2xl font-bold ${rent < 0 ? "text-destructive" : ""}`}>{pct(rent)}</p><p className="text-[11px] text-muted-foreground mt-1">Lucro ÷ valor de venda</p></CardContent></Card>
    </div>
  );
}
