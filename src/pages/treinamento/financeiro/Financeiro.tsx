import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Loader2, Percent, Receipt, Table as TableIcon, TrendingUp, Wallet } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { resolveIrpjCsllPerc } from "@/lib/pricing/cascata";
import { DEFAULT_COMISSAO_TIERS, comissaoFromRent, formatRentLabel } from "@/lib/comissaoRentabilidade";
import { useTreinamentoResultado } from "../useTreinamentoResultado";
import SubNav from "./SubNav";

const BASE = "/observabilidade/treinamento/financeiro";
const ITEMS = [
  { to: BASE, label: "Resultado da Operação", icon: Receipt, end: true },
  { to: `${BASE}/impostos`, label: "Impostos & Markup", icon: Calculator },
  { to: `${BASE}/comissoes`, label: "Comissões", icon: TableIcon },
];
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (n: number) => `${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

function Shell({ children }: { children: React.ReactNode }) {
  const { loading } = useTreinamentoResultado();
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <SubNav items={ITEMS} />
      {loading ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</p> : children}
    </div>
  );
}

export function TrnResultado() {
  const { res, st } = useTreinamentoResultado();
  const b = res.cascataBase;
  const pv = res.precoFinalTotal;
  const custo = res.custoTotal;
  const ok = res.linhas.filter((l) => l.preco);
  const impostos = pv * (b.pisPerc + b.cofinsPerc + b.issPerc) / 100;
  const comissao = ok.reduce((s, l) => s + l.precoFinal * l.comissaoPerc / 100, 0);
  const enc = pv * b.encFinancPerc / 100;
  const lucroAntesIR = pv - impostos - comissao - custo - enc;
  const ir = lucroAntesIR - res.lucroTotal;
  const p = (v: number) => (pv > 0 ? (v / pv) * 100 : 0);
  const sigma = b.pisPerc + b.cofinsPerc + b.issPerc + b.comissaoPerc + b.irpjCsllPerc + b.encFinancPerc + b.lucroPerc;

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" /> Custo total dos treinamentos</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{brl(custo)}</p><p className="text-[11px] text-muted-foreground mt-1">Base de entrada do markup divisor</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"><Percent className="h-3.5 w-3.5" /> Σ Encargos sobre venda</CardTitle></CardHeader>
          <CardContent><p className={`text-2xl font-bold ${sigma >= 100 ? "text-destructive" : ""}`}>{pct(sigma)}</p><p className="text-[11px] text-muted-foreground mt-1">Sem desconto</p></CardContent></Card>
        <Card className="border-primary/40 bg-primary/5"><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Preço de venda</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-primary">{brl(pv)}</p><p className="text-[11px] text-muted-foreground mt-1">PV = Custo / (1 − Σ%/100), com descontos</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" /> Resultado da Operação</CardTitle>
          <p className="text-xs text-muted-foreground">Cotação {st.atual.nome || "atual"}. Edite os componentes em <Link to={`${BASE}/impostos`} className="text-primary hover:underline">Impostos &amp; Markup</Link>.</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {ok.length === 0 ? <p className="text-sm text-muted-foreground">Adicione itens no <Link to="/observabilidade/treinamento" className="text-primary hover:underline">Configurador</Link>.</p> : <>
            {L("Valor de VENDA", pv, 100, { bold: true })}
            <Separator className="my-2" />
            {L("(−) Impostos (PIS + COFINS + ISS)", -impostos, p(impostos))}
            {L("(−) Comissão", -comissao, p(comissao))}
            {L("(−) Custo total", -custo, p(custo))}
            {enc > 0 && L("(−) Encargos financeiros", -enc, p(enc))}
            <Separator className="my-2" />
            {L("Lucro antes do IR", lucroAntesIR, p(lucroAntesIR), { bold: true })}
            {L("(−) IR / CSLL", -ir, p(ir))}
            <Separator className="my-2" />
            {L("Rentabilidade", res.lucroTotal, res.rentabilidadePerc, { bold: true, tone: res.lucroTotal < 0 ? "neg" : "pos" })}
          </>}
        </CardContent>
      </Card>
    </Shell>
  );
}

export function TrnImpostos() {
  const { can } = useAuth();
  const { st, rates, municipios } = useTreinamentoResultado();
  const { config, setConfig } = st;
  const podeParams = can("page.trn.params") || can("page.trn.admin");
  const num = (k: "lucroPerc" | "encFinancPerc" | "descontoTotalPerc", label: string, step: string, hint: string) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type="number" step={step} value={config[k]} onChange={(e) => setConfig({ ...config, [k]: Number(e.target.value) || 0 })} />
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
  return (
    <Shell>
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Calculator className="h-4 w-4 text-primary" /> Produto fiscal e impostos</CardTitle>
          <p className="text-xs text-muted-foreground">Código TRN. PIS, COFINS e ISS vêm do Cadastro tributário pelo município.</p></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Município (define o ISS)</Label>
            <Select value={config.municipio} onValueChange={(v) => setConfig({ ...config, municipio: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{municipios.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
            {rates ? <p className="text-[11px] text-muted-foreground">PIS {pct(rates.pisPerc)} · COFINS {pct(rates.cofinsPerc)} · ISS {pct(rates.issPerc)} {rates.aConfirmar && <Badge variant="outline" className="ml-1 text-[10px]">a confirmar</Badge>}</p>
              : <p className="text-[11px] text-destructive">Sem alíquota do código TRN para este município.</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Convenção de IR/CSLL</Label>
            <Select value={config.convencao} disabled={!podeParams} onValueChange={(v) => setConfig({ ...config, convencao: v as typeof config.convencao })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="padrao_site">Padrão do site ({pct(resolveIrpjCsllPerc("padrao_site"))})</SelectItem><SelectItem value="roi_ito">ROI ITO ({pct(resolveIrpjCsllPerc("roi_ito"))}) · a confirmar</SelectItem></SelectContent>
            </Select>
            {!podeParams && <p className="text-[11px] text-muted-foreground">Somente quem tem a permissão de parâmetros altera.</p>}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Percent className="h-4 w-4 text-primary" /> Markup</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          {num("lucroPerc", "Rentabilidade %", "0.5", "Lucro pretendido sobre o preço de venda.")}
          {num("encFinancPerc", "Encargos financeiros %", "0.1", "Sobre o preço de venda.")}
          {num("descontoTotalPerc", "Desconto total %", "0.5", "Aplicado sobre todos os itens.")}
        </CardContent>
      </Card>
    </Shell>
  );
}

export function TrnComissoes() {
  const { st } = useTreinamentoResultado();
  const atual = comissaoFromRent(st.config.lucroPerc, DEFAULT_COMISSAO_TIERS);
  return (
    <Shell>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><TableIcon className="h-4 w-4 text-primary" /> Tabela de comissão por faixa de rentabilidade</CardTitle>
          <p className="text-xs text-muted-foreground">Rentabilidade atual <b className="text-foreground">{pct(st.config.lucroPerc)}</b> → comissão de <b className="text-primary">{pct(atual)}</b>.</p>
        </CardHeader>
        <CardContent className="divide-y text-sm">
          {DEFAULT_COMISSAO_TIERS.map((t, i) => (
            <div key={i} className={`flex justify-between py-2 ${comissaoFromRent(st.config.lucroPerc, [t]) === atual && atual === t.comissao ? "font-semibold text-primary" : ""}`}>
              <span>{formatRentLabel(t)}</span><span className="tabular-nums">{pct(t.comissao)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </Shell>
  );
}
