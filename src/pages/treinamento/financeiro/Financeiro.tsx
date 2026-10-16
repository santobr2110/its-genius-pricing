import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useTreinamentoCadastro } from "@/hooks/useTreinamentoCadastro";
import { parseComissao } from "@/lib/treinamento/calc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import ProdutoFiscalCard from "@/components/financeiro/ProdutoFiscalCard";
import { Calculator, DollarSign, Loader2, Percent, Receipt, Table as TableIcon, TrendingUp, Wallet } from "lucide-react";
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
  const retencao = ok.reduce((s, l) => s + l.precoFinal * (l.retencaoPerc ?? 0) / 100, 0);
  const enc = pv * b.encFinancPerc / 100;
  const lucroAntesIR = pv - impostos - comissao - retencao - custo - enc;
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
      <ResumoCards custo={custo} sigma={sigma} pv={pv} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" /> Composição do Resultado da Operação</CardTitle>
          <p className="text-xs text-muted-foreground">Cotação {st.atual.nome || "atual"}. Edite os componentes em <Link to={`${BASE}/impostos`} className="text-primary hover:underline">Impostos &amp; Markup</Link>.</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {ok.length === 0 ? <p className="text-sm text-muted-foreground">Adicione itens no <Link to="/observabilidade/treinamento" className="text-primary hover:underline">Configurador</Link>.</p> : <>
            {L("Valor de VENDA", pv, 100, { bold: true })}
            <Separator className="my-2" />
            {L("(−) Impostos (PIS + COFINS + ISS)", -impostos, p(impostos))}
            {L("(−) Comissão", -comissao, p(comissao))}
            {retencao > 0 && L("(−) Retenção", -retencao, p(retencao))}
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

function Comp({ label, tag, desc, valor, rs, tone = "auto", children }: { label: string; tag: string; desc: React.ReactNode; valor: number; rs: number; tone?: "auto" | "edit" | "primary"; children?: React.ReactNode }) {
  const box = tone === "edit" ? "border-primary/30 bg-background" : tone === "primary" ? "border-dashed border-primary/40 bg-primary/5" : "border-dashed border-muted-foreground/30 bg-muted/30";
  return (
    <div className={`space-y-2 rounded-lg border p-3 ${box}`}>
      <div className="flex justify-between items-center gap-3">
        <div className="min-w-0">
          <Label className="text-sm font-medium">{label} <span className={`text-[10px] uppercase tracking-wider ml-1 ${tone === "edit" ? "text-primary" : "text-muted-foreground"}`}>({tag})</span></Label>
          <p className="text-[11px] text-muted-foreground leading-snug">{desc}</p>
        </div>
        {!children && <span className={`text-base font-bold tabular-nums shrink-0 ${tone === "primary" ? "text-primary" : ""}`}>{pct(valor)}</span>}
      </div>
      {children}
      <div className="flex justify-between text-[11px] text-muted-foreground"><span>Valor estimado sobre PV</span><span className="font-semibold text-foreground tabular-nums">{brl(rs)}</span></div>
    </div>
  );
}

export function TrnImpostos() {
  const { can } = useAuth();
  const { st, res } = useTreinamentoResultado();
  const { config, setConfig } = st;
  const podeParams = can("page.trn.params") || can("page.trn.admin");
  const b = res.cascataBase;
  const pv = res.precoFinalTotal;
  const sigma = b.pisPerc + b.cofinsPerc + b.issPerc + b.comissaoPerc + b.irpjCsllPerc + b.encFinancPerc + b.lucroPerc;
  const edit = (k: "lucroPerc" | "encFinancPerc" | "descontoTotalPerc", max: number) => (
    <>
      <div className="flex justify-end items-center gap-2 -mt-9">
        <Input type="number" step={0.01} value={config[k]} onChange={(e) => setConfig({ ...config, [k]: Number(e.target.value) || 0 })} className="h-8 w-20 text-right" />
        <span className="text-sm font-semibold w-4">%</span>
      </div>
      <Slider value={[config[k]]} onValueChange={([v]) => setConfig({ ...config, [k]: v })} min={0} max={max} step={0.01} />
    </>
  );
  return (
    <Shell>
      <ProdutosPorCondicao />
      <ResumoCards custo={res.custoTotal} sigma={sigma} pv={pv} />
      {sigma >= 100 && <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">A soma dos percentuais é {pct(sigma)} (≥ 100%). Reduza algum componente para tornar o preço calculável.</div>}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /> Componentes do Markup Divisor</CardTitle>
          <p className="text-xs text-muted-foreground">Defina encargos, rentabilidade e desconto. A comissão segue a tabela de <Link to={`${BASE}/comissoes`} className="text-primary hover:underline">Comissões</Link>.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Comp label="PIS" tag="automático" desc="Imposto federal sobre receita bruta. Definido pelo código de produto." valor={b.pisPerc} rs={pv * b.pisPerc / 100} />
          <Comp label="COFINS" tag="automático" desc="Contribuição federal sobre receita bruta. Definido pelo código de produto." valor={b.cofinsPerc} rs={pv * b.cofinsPerc / 100} />
          <Comp label="ISS" tag="automático" desc="Imposto municipal sobre serviços. Definido pelo município selecionado." valor={b.issPerc} rs={pv * b.issPerc / 100} />
          <Comp label="IRPJ / CSLL" tag={podeParams ? "editável" : "convenção"} tone={podeParams ? "edit" : "auto"} desc="Convenção de IR/CSLL sobre o lucro. Somente quem tem a permissão de parâmetros altera." valor={b.irpjCsllPerc} rs={pv * b.irpjCsllPerc / 100}>
            <Select value={config.convencao} disabled={!podeParams} onValueChange={(v) => setConfig({ ...config, convencao: v as typeof config.convencao })}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="padrao_site">Padrão do site ({pct(resolveIrpjCsllPerc("padrao_site"))})</SelectItem><SelectItem value="roi_ito">ROI ITO ({pct(resolveIrpjCsllPerc("roi_ito"))}) · a confirmar</SelectItem></SelectContent>
            </Select>
          </Comp>
          <Comp label="Encargos Financeiros" tag="editável" tone="edit" desc="Custos financeiros do contrato (prazos, antecipações, garantias)." valor={config.encFinancPerc} rs={pv * config.encFinancPerc / 100}>{edit("encFinancPerc", 15)}</Comp>
          <Comp label="Rentabilidade" tag="editável" tone="edit" desc="Lucro pretendido sobre o preço de venda. Determina a comissão pela tabela de faixas." valor={config.lucroPerc} rs={pv * config.lucroPerc / 100}>{edit("lucroPerc", 60)}</Comp>
          <Comp label="Desconto total" tag="editável" tone="edit" desc="Aplicado sobre todos os itens da cotação." valor={config.descontoTotalPerc} rs={-pv * config.descontoTotalPerc / 100}>{edit("descontoTotalPerc", 50)}</Comp>
          <Comp label="Comissão" tag="automática" tone="primary" desc={<>Definida pela faixa de rentabilidade em <Link to={`${BASE}/comissoes`} className="text-primary hover:underline">Comissões</Link>.</>} valor={b.comissaoPerc} rs={pv * b.comissaoPerc / 100} />
        </CardContent>
      </Card>
    </Shell>
  );
}

function ComissaoModoCard() {
  const { params, refresh } = useTreinamentoCadastro();
  const { user, can } = useAuth();
  const podeEditar = can("page.trn.admin");
  const salvo = parseComissao(params.find((p) => p.key === "comissao_regra")?.value);
  const [fixaAtiva, setFixaAtiva] = useState(salvo != null);
  const [valor, setValor] = useState(salvo != null ? String(salvo).replace(".", ",") : "");
  const [salvando, setSalvando] = useState(false);
  useEffect(() => { setFixaAtiva(salvo != null); setValor(salvo != null ? String(salvo).replace(".", ",") : ""); }, [salvo]);

  const salvar = async () => {
    const v = fixaAtiva ? valor.trim() : "";
    if (fixaAtiva && parseComissao(v) == null) return toast.error("Informe um percentual válido para a comissão fixa.");
    setSalvando(true);
    const { error } = await supabase.from("training_params").update({ value: v as never, updated_by: user?.id ?? null }).eq("key", "comissao_regra");
    setSalvando(false);
    if (error) return toast.error(error.message);
    toast.success("Regra de comissão salva");
    refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Percent className="h-4 w-4 text-primary" /> Regra de comissão</CardTitle>
        <p className="text-xs text-muted-foreground">Escolha entre a Escala Selbetti (tabela por rentabilidade abaixo) ou uma comissão fixa aplicada em todas as cotações de Treinamento.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Switch id="comissao-fixa" checked={fixaAtiva} disabled={!podeEditar} onCheckedChange={setFixaAtiva} />
          <Label htmlFor="comissao-fixa" className="text-sm">{fixaAtiva ? "Comissão fixa" : "Escala Selbetti (padrão)"}</Label>
        </div>
        {fixaAtiva && (
          <div className="flex items-center gap-2 max-w-xs">
            <Input value={valor} disabled={!podeEditar} placeholder="Ex.: 5" onChange={(e) => setValor(e.target.value)} className="h-9 text-right" />
            <span className="text-xs text-muted-foreground">%</span>
          </div>
        )}
        {podeEditar && (
          <div className="flex justify-end">
            <Button size="sm" onClick={salvar} disabled={salvando}>{salvando && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}Salvar</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function TrnComissoes() {
  const { st, res } = useTreinamentoResultado();
  const atual = comissaoFromRent(st.config.lucroPerc, DEFAULT_COMISSAO_TIERS);
  const fixa = res.cascataBase.comissaoPerc !== atual ? res.cascataBase.comissaoPerc : null;
  return (
    <Shell>
      <ComissaoModoCard />
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><TableIcon className="h-4 w-4 text-primary" /> Escala Selbetti — Comissão por Faixa de Rentabilidade</CardTitle>
          <p className="text-xs text-muted-foreground">Define o % de comissão aplicado conforme a rentabilidade pretendida. A rentabilidade atual é <span className="font-semibold text-foreground">{pct(st.config.lucroPerc)}</span> → comissão de <span className="font-semibold text-primary">{pct(atual)}</span>.</p>
          {fixa != null && <p className="text-xs rounded border border-primary/40 bg-primary/10 px-2 py-1">Comissão fixa de <span className="font-semibold">{pct(fixa)}</span> ativa — a escala abaixo não está sendo aplicada.</p>}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2">
            <span>Rent. mínima (%)</span><span>Rent. máxima (%)</span><span>Comissão (%)</span>
          </div>
          {DEFAULT_COMISSAO_TIERS.map((t, i) => {
            const ativa = st.config.lucroPerc >= t.minRent && (t.maxRent == null || st.config.lucroPerc < t.maxRent);
            return (
              <div key={i} className={`grid grid-cols-3 gap-2 items-center rounded-md ${ativa ? "ring-1 ring-primary bg-primary/5" : ""}`}>
                <Input disabled value={t.minRent} className="h-8 text-right" />
                <Input disabled value={t.maxRent == null ? "—" : t.maxRent} className="h-8 text-right" />
                <Input disabled value={t.comissao} className={`h-8 text-right ${ativa ? "font-semibold text-primary" : ""}`} />
              </div>
            );
          })}
          <p className="text-[11px] text-muted-foreground">Tabela padrão da empresa, a mesma usada no cálculo do Treinamento.</p>
        </CardContent>
      </Card>
    </Shell>
  );
}

function ResumoCards({ custo, sigma, pv }: { custo: number; sigma: number; pv: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" /> Custo Total da Operação</CardTitle></CardHeader>
        <CardContent><p className="text-2xl font-bold">{brl(custo)}</p><p className="text-[11px] text-muted-foreground mt-1">Base do markup divisor</p></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"><Percent className="h-3.5 w-3.5" /> Σ Encargos sobre Venda</CardTitle></CardHeader>
        <CardContent><p className={`text-2xl font-bold ${sigma >= 100 ? "text-destructive" : ""}`}>{pct(sigma)}</p><p className="text-[11px] text-muted-foreground mt-1">Custo = {pct(100 - sigma)} do PV</p></CardContent></Card>
      <Card className="border-primary/40 bg-primary/5"><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Preço de Venda</CardTitle></CardHeader>
        <CardContent><p className="text-2xl font-bold text-primary">{brl(pv)}</p><p className="text-[11px] text-muted-foreground mt-1">PV = Custo / (1 − Σ%/100)</p></CardContent></Card>
    </div>
  );
}

const CONDICOES = [
  { key: "produto_turma_aberta", label: "Turma Aberta (Online)", padrao: "900-0315P" },
  { key: "produto_in_company", label: "In Company", padrao: "900-0315P NEW" },
  { key: "produto_exame", label: "Somente exame", padrao: "900-0313P" },
];

/** Produto fiscal (SKU) usado por condição de venda; gravado em training_params. */
function ProdutosPorCondicao() {
  const { can, user } = useAuth();
  const { cad, tax, st } = useTreinamentoResultado();
  const pode = can("page.trn.admin");
  const atual = Object.fromEntries(CONDICOES.map((c) => [c.key, String(cad.params.find((p) => p.key === c.key)?.value ?? c.padrao)]));
  const [v, setV] = useState<Record<string, string>>(atual);
  const atualStr = JSON.stringify(atual);
  useEffect(() => setV(JSON.parse(atualStr)), [atualStr]);
  const codigos = tax.codes.filter((c) => c.ativo !== false && c.ofertas?.includes("treinamento"));
  const sujo = CONDICOES.some((c) => v[c.key] !== atual[c.key]);
  const temNoMunicipio = (cod: string) => {
    const id = tax.codes.find((c) => c.codigo === cod)?.id;
    return tax.rates.some((r) => r.tax_product_code_id === id && r.municipio === st.config.municipio);
  };
  const salvar = async () => {
    for (const c of CONDICOES) {
      if (v[c.key] === atual[c.key]) continue;
      const r = await supabase.from("training_params").upsert({ key: c.key, label: `Produto fiscal — ${c.label}`, value: v[c.key] as never, tipo: "text", status: "confirmado", ordem: 900, updated_by: user?.id ?? null });
      if (r.error) return toast.error(r.error.message);
    }
    toast.success("Produtos por condição salvos");
    cad.refresh();
  };
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2"><TableIcon className="h-4 w-4 text-primary" /> Produto fiscal por condição de venda</CardTitle>
          <p className="text-xs text-muted-foreground">Cada item da cotação usa o produto da condição escolhida na venda; as alíquotas vêm do município selecionado acima. Lista apenas produtos marcados com a oferta Treinamento no Cadastro tributário.</p>
        </div>
        {pode && <Button size="sm" onClick={salvar} disabled={!sujo}>Salvar</Button>}
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        {CONDICOES.map((c) => (
          <div key={c.key} className="space-y-1.5">
            <Label className="text-xs">SKU · {c.label}</Label>
            <Select value={v[c.key]} disabled={!pode} onValueChange={(x) => setV({ ...v, [c.key]: x })}>
              <SelectTrigger className="h-9 font-mono text-xs [&>span]:truncate [&_.block]:hidden"><SelectValue placeholder="Escolha o SKU" /></SelectTrigger>
              <SelectContent className="w-[min(34rem,90vw)]">
                {!codigos.some((x) => x.codigo === v[c.key]) && <SelectItem value={v[c.key]}>{v[c.key]} (fora da oferta)</SelectItem>}
                {codigos.map((x) => <SelectItem key={x.id} value={x.codigo}><span className="font-mono text-xs font-semibold">{x.codigo}</span>{x.nome && x.nome !== x.codigo && <span className="block text-[11px] leading-snug text-muted-foreground whitespace-normal break-words">{x.nome}</span>}</SelectItem>)}
              </SelectContent>
            </Select>
            {st.config.municipio && !temNoMunicipio(v[c.key]) && <p className="text-[11px] text-destructive">Sem alíquotas em {st.config.municipio}.</p>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
