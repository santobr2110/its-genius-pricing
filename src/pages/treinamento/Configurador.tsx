import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertTriangle, Award, Boxes, Building2, ChevronDown, FilePlus2, FileSignature, GraduationCap, ListChecks, Loader2, Plus, Save, Sparkles, Trash2, TrendingUp, Users, Wallet, Percent, Tag } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTreinamentoCadastro } from "@/hooks/useTreinamentoCadastro";
import { useTaxCodes } from "@/hooks/useTaxCodes";
import { useTreinamentoCotacoes } from "@/hooks/useTreinamentoCotacoes";
import { usePricingApproval } from "@/hooks/usePricingApproval";
import ApprovalBadge from "@/components/approval/ApprovalBadge";
import { resolveTaxRates } from "@/lib/pricing/taxRates";
import { resolveIrpjCsllPerc } from "@/lib/pricing/cascata";
import { DEFAULT_COMISSAO_TIERS } from "@/lib/comissaoRentabilidade";
import { paramsFromRows } from "@/lib/treinamento/calc";
import { computeCarrinho, CONFIG_PADRAO, type LinhaCarrinho, type LinhaResultado } from "@/lib/treinamento/carrinho";
import { COTACAO_VAZIA, useCarrinhoState } from "./useCarrinhoState";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (n: number) => `${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const hoje = () => new Date().toISOString().slice(0, 10);
const novoId = () => Math.random().toString(36).slice(2, 10);
const CODIGO_TRN = "TRN";

export default function Configurador() {
  const { can } = useAuth();
  const cad = useTreinamentoCadastro();
  const tax = useTaxCodes();
  const cot = useTreinamentoCotacoes();
  const { linhas, setLinhas, config, setConfig, atual, setAtual } = useCarrinhoState();
  const [salvando, setSalvando] = useState(false);
  const podeParams = can("page.trn.params") || can("page.trn.admin");

  const params = useMemo(() => paramsFromRows(cad.params), [cad.params]);
  const vendaveis = cad.courses.filter((c) => c.ativo && !c.custo_pendente);
  const municipios = useMemo(() => {
    const code = tax.codes.find((c) => c.codigo === (config.codigoProduto || CODIGO_TRN));
    return Array.from(new Set(tax.rates.filter((r) => r.tax_product_code_id === code?.id).map((r) => r.municipio))).sort();
  }, [tax.codes, tax.rates]);
  const rates = resolveTaxRates(config.codigoProduto || CODIGO_TRN, config.municipio, hoje(), tax.codes, tax.rates);
  const irpj = resolveIrpjCsllPerc(config.convencao);

  const res = useMemo(() => computeCarrinho(
    linhas, cad.courses, cad.comboItems, params, config,
    { pisPerc: rates?.pisPerc ?? 0, cofinsPerc: rates?.cofinsPerc ?? 0, issPerc: rates?.issPerc ?? 0 }, irpj, DEFAULT_COMISSAO_TIERS,
  ), [linhas, cad.courses, cad.comboItems, params, config, rates?.pisPerc, rates?.cofinsPerc, rates?.issPerc, irpj]);

  const approval = usePricingApproval({
    offering: "treinamento", targetType: "pricing_preset", targetId: atual.id, rentPct: res.rentabilidadePerc,
    summary: { cliente: atual.cliente, valor: res.precoFinalTotal, codigo: atual.codigo },
  });

  const upd = (id: string, patch: Partial<LinhaCarrinho>) => setLinhas(linhas.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const adicionar = () => {
    const c = vendaveis[0];
    if (!c) return;
    setLinhas([...linhas, { id: novoId(), courseId: c.id, modalidade: "turma_aberta", alunos: 1, somenteExame: false, locacao: false, diarias: null, descontoPerc: 0 }]);
  };

  const salvar = async () => {
    const nome = atual.nome.trim() || prompt("Nome da cotação:")?.trim();
    if (!nome) return;
    setSalvando(true);
    try {
      const id = await cot.salvar(atual.id, nome, atual.cliente, {
        linhas, config, resumo: { custoTotal: res.custoTotal, precoFinalTotal: res.precoFinalTotal, rentabilidadePerc: res.rentabilidadePerc },
      });
      const salvo = cot.lista.find((x) => x.id === id);
      setAtual({ ...atual, id, nome, codigo: salvo?.quote_code ?? atual.codigo });
      toast.success("Cotação salva");
      cot.refresh();
    } catch (e) { toast.error((e as Error).message); } finally { setSalvando(false); }
  };

  const nova = () => {
    if (linhas.length && !confirm("Começar uma nova cotação? Os itens atuais serão limpos da tela (o que já foi salvo continua em Cotações).")) return;
    setLinhas([]); setConfig(CONFIG_PADRAO); setAtual(COTACAO_VAZIA);
  };

  // Atualiza o código exibido depois que a lista recarrega.
  const codigoAtual = atual.codigo ?? cot.lista.find((x) => x.id === atual.id)?.quote_code ?? null;
  const paramsPendentes = cad.params.filter((p) => p.status === "simulado" || p.status === "a_confirmar");

  if (cad.loading || tax.loading) return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</p>;
  if (cad.error) return <p className="text-sm text-destructive">Você não tem acesso ao cadastro de cursos do Treinamento. Peça a permissão "Acessar Treinamento" a um administrador.</p>;

  return (
    <div className="space-y-4">
      {/* Cabeçalho da cotação */}
      <Card>
        <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div className="space-y-1"><Label className="text-xs flex items-center gap-1.5 text-muted-foreground"><FileSignature className="h-3.5 w-3.5 text-primary" /> Nome da cotação</Label><Input value={atual.nome} onChange={(e) => setAtual({ ...atual, nome: e.target.value })} placeholder="Ex.: Turma ZCS março" /></div>
          <div className="space-y-1"><Label className="text-xs flex items-center gap-1.5 text-muted-foreground"><Building2 className="h-3.5 w-3.5 text-primary" /> Cliente</Label><Input value={atual.cliente} onChange={(e) => setAtual({ ...atual, cliente: e.target.value })} /></div>
          <div className="flex flex-wrap items-center gap-2">
            {codigoAtual && <Badge variant="outline" className="font-mono">{codigoAtual}</Badge>}
            <Button variant="outline" onClick={nova}><FilePlus2 className="h-4 w-4 mr-1" /> Nova</Button>
            <Button onClick={salvar} disabled={salvando || linhas.length === 0 || !can("page.trn.quote")}><Save className="h-4 w-4 mr-1" /> Salvar</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4 items-start">
        <div className="space-y-4">
          {/* Itens */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2"><ListChecks className="h-4 w-4 text-primary" /> Itens da proposta</CardTitle>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">{linhas.length} item(ns) · cursos, combos, extras e exames</p>
              </div>
              <Button size="sm" onClick={adicionar} disabled={vendaveis.length === 0}><Plus className="h-4 w-4 mr-1" /> Adicionar item</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {paramsPendentes.length > 0 && (
                <p className="text-xs rounded border border-amber-500/50 bg-amber-500/10 p-2">
                  <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600 mr-1">a confirmar</Badge>
                  Valores simulados em uso: {paramsPendentes.map((p) => p.label).join(" · ")}
                </p>
              )}
              {linhas.length === 0 && (
                <div className="rounded-lg border border-dashed p-10 flex flex-col items-center gap-2 text-center">
                  <GraduationCap className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Adicione cursos, combos, extras ou exames para montar a proposta.</p>
                  <Button size="sm" variant="outline" onClick={adicionar} disabled={vendaveis.length === 0}><Plus className="h-4 w-4 mr-1" /> Adicionar item</Button>
                </div>
              )}
              {res.linhas.map((r) => (
                <LinhaEditor key={r.linha.id} r={r} vendaveis={vendaveis} onChange={(p) => upd(r.linha.id, p)} onRemove={() => setLinhas(linhas.filter((l) => l.id !== r.linha.id))} />
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Painel lateral */}
        <div className="space-y-4 xl:sticky xl:top-28">
          <Card className="border-2">
            <CardContent className="pt-5 space-y-3 text-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Composição do valor total</p>
              <div className="grid grid-cols-2 gap-2">
                <Mini icon={Wallet} l="Custo total" v={brl(res.custoTotal)} />
                <Mini icon={Tag} l="Preço de tabela" v={brl(res.precoTabelaTotal)} />
                <Mini icon={Percent} l="Rentabilidade" v={pct(res.rentabilidadePerc)} alerta={res.rentabilidadePerc < config.lucroPerc - 0.005} />
                <Mini icon={TrendingUp} l="Lucro" v={brl(res.lucroTotal)} />
              </div>
              {res.precoTabelaTotal !== res.precoFinalTotal && <Linha l="Desconto" v={`− ${brl(res.precoTabelaTotal - res.precoFinalTotal)}`} />}
              <div className="flex justify-between items-baseline border-t pt-3"><span className="font-semibold">Valor Total de Venda</span><span className="text-2xl font-bold tabular-nums">{brl(res.precoFinalTotal)}</span></div>
              <div className="rounded-md bg-muted/50 p-2 text-[11px] text-muted-foreground space-y-0.5">
                <p>Município {config.municipio} · rentabilidade alvo {pct(config.lucroPerc)}{config.descontoTotalPerc ? ` · desconto ${pct(config.descontoTotalPerc)}` : ""}</p>
                <p>Comissão {pct(res.cascataBase.comissaoPerc)} · IR/CSLL {pct(res.cascataBase.irpjCsllPerc)} · <Link to="/observabilidade/treinamento/financeiro/impostos" className="text-primary hover:underline">Alterar condições</Link></p>
              </div>
              {res.temErros && <p className="text-xs text-destructive flex gap-1"><AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Há itens com erro; eles não entram no total.</p>}
              <ApprovalBadge approval={approval} canRequest={!!atual.id} disabledReason={!atual.id ? "Salve a cotação primeiro" : undefined} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Linha({ l, v, strong }: { l: string; v: string; strong?: boolean }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{l}</span><span className={`tabular-nums ${strong ? "font-semibold text-destructive" : "font-medium text-foreground"}`}>{v}</span></div>;
}

function Mini({ icon: Icon, l, v, alerta }: { icon: LucideIcon; l: string; v: string; alerta?: boolean }) {
  return (
    <div className="rounded-md border p-2">
      <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Icon className="h-3 w-3" /> {l}</p>
      <p className={`font-semibold tabular-nums ${alerta ? "text-destructive" : ""}`}>{v}</p>
    </div>
  );
}

const TIPO_ICON: Record<string, LucideIcon> = { curso: GraduationCap, exame: Award, combo: Boxes, extra: Sparkles };
const TIPO_LABEL: Record<string, string> = { curso: "Curso", exame: "Exame", combo: "Combo", extra: "Extra" };

function LinhaEditor({ r, vendaveis, onChange, onRemove }: {
  r: LinhaResultado; vendaveis: ReturnType<typeof useTreinamentoCadastro>["courses"]; onChange: (p: Partial<LinhaCarrinho>) => void; onRemove: () => void;
}) {
  const { linha, cursoOriginal: orig, curso, custo, preco } = r;
  const ehExame = orig?.tipo === "exame";
  const cascata = preco?.cascata;
  const ref = curso?.preco_referencia_mercado ?? null;
  const difRef = ref && r.precoFinalPorAluno ? ((r.precoFinalPorAluno - ref) / ref) * 100 : null;

  return (
    <div className="rounded-lg border bg-background p-3 space-y-3 transition-colors hover:border-primary/40">
      {orig && (() => { const Icon = TIPO_ICON[orig.tipo] ?? GraduationCap; return (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0"><Icon className="h-4 w-4" /></div>
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{orig.nome}</p>
            <p className="text-[11px] text-muted-foreground">{orig.horas_execucao}h{orig.dias ? ` · ${orig.dias} dia(s)` : ""}{orig.part_number_interno ? ` · ${orig.part_number_interno}` : ""}</p>
          </div>
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{orig.fabricante}</Badge>
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">{TIPO_LABEL[orig.tipo] ?? orig.tipo}</Badge>
        </div>
      ); })()}
      <div className="grid grid-cols-2 md:grid-cols-[2fr_1fr_90px_90px_auto] gap-2 items-end">
        <div className="space-y-1 col-span-2 md:col-span-1">
          <Label className="text-xs flex items-center gap-1">Item
            {orig && (orig.campos_a_confirmar.length > 0 || orig.custo_pendente) && (
              <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600" title={orig.campos_a_confirmar.join(", ")}>a confirmar</Badge>
            )}
          </Label>
          <Select value={linha.courseId} onValueChange={(v) => {
            const c = vendaveis.find((x) => x.id === v);
            onChange({ courseId: v, somenteExame: false, alunosBase: null });
          }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-[60vh]">{vendaveis.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}{c.tipo !== "curso" ? ` · ${c.tipo}` : ""}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Modalidade</Label>
          <Select value={ehExame ? "turma_aberta" : linha.modalidade} disabled={ehExame || linha.somenteExame} onValueChange={(v) => onChange({ modalidade: v as LinhaCarrinho["modalidade"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="turma_aberta">{ehExame || linha.somenteExame ? "Exame avulso" : "Turma Aberta (online)"}</SelectItem><SelectItem value="in_company">In Company</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label className="text-xs">Alunos</Label><Input type="number" min={1} value={linha.alunos} onChange={(e) => onChange({ alunos: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} /></div>
        <div className="space-y-1"><Label className="text-xs">Desconto %</Label><Input type="number" step="0.5" value={linha.descontoPerc} onChange={(e) => onChange({ descontoPerc: Number(e.target.value) || 0 })} /></div>
        <Button size="icon" variant="ghost" onClick={onRemove} aria-label="Remover item"><Trash2 className="h-4 w-4" /></Button>
      </div>

      <div className="flex flex-wrap gap-4 text-xs">
        {orig?.permite_somente_exame && (
          <label className="flex items-center gap-2"><Switch checked={linha.somenteExame} onCheckedChange={(v) => onChange({ somenteExame: v })} /> Somente exame (sem treinamento)</label>
        )}
        {!ehExame && !linha.somenteExame && linha.modalidade === "in_company" && (
          <>
            <label className="flex items-center gap-2"><Switch checked={linha.locacao} onCheckedChange={(v) => onChange({ locacao: v })} /> Cliente exige locação de sala</label>
            {linha.locacao && (
              <label className="flex items-center gap-2">Diárias <Input className="h-7 w-16" type="number" value={linha.diarias ?? orig?.dias ?? ""} onChange={(e) => onChange({ diarias: e.target.value === "" ? null : Number(e.target.value) })} /></label>
            )}
            <span className="text-muted-foreground">Hospedagem e deslocamento por conta da contratante.</span>
          </>
        )}
        {orig?.min_alunos && linha.modalidade === "turma_aberta" && !ehExame && !linha.somenteExame && (
          <>
            <span className="text-muted-foreground">Preço por aluno com base na turma mínima de {orig.min_alunos}{orig.max_alunos ? ` · máx. ${orig.max_alunos}` : ""}{orig.campos_a_confirmar.includes("max_alunos") ? " (máximo a confirmar)" : ""}</span>
          </>
        )}
      </div>

      {custo.erros.map((e, i) => <p key={i} className="text-xs text-destructive flex gap-1"><AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {e}</p>)}
      {r.avisos.map((a, i) => <p key={i} className="text-xs text-muted-foreground flex gap-1"><AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {a}</p>)}

      {preco && cascata && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 rounded-md bg-muted/40 p-2 text-xs">
          <Kpi icon={Wallet} l="Custo da turma" v={brl(custo.custoTurma)} />
          <Kpi icon={TrendingUp} l="Preço de venda" v={brl(r.precoFinal)} destaque />
          <Kpi icon={Users} l="Por aluno" v={brl(r.precoFinalPorAluno)} />
          <Kpi icon={Percent} l="Rentabilidade" v={pct(r.rentabilidadePerc)} />
          <Kpi icon={Tag} l="Desconto" v={pct(r.descontoEfetivoPerc)} />
        </div>
      )}
      {ref != null && difRef != null && (
        <p className={`text-xs ${Math.abs(difRef) > 20 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
          Mercado praticado: {brl(ref)} por aluno · calculado {brl(r.precoFinalPorAluno)} ({difRef > 0 ? "+" : ""}{difRef.toFixed(1)}%)
        </p>
      )}

      {preco && cascata && (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-1 text-xs text-primary hover:underline"><ChevronDown className="h-3 w-3" /> Detalhes do cálculo</CollapsibleTrigger>
          <CollapsibleContent className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <p className="font-semibold">Custo</p>
              <Linha l="Instrutor" v={brl(custo.detalhe.instrutor)} />
              <Linha l="Gestão" v={brl(custo.detalhe.gestao)} />
              {custo.detalhe.locacao > 0 && <Linha l="Locação" v={brl(custo.detalhe.locacao)} />}
              <Linha l="Material / cloud / exame" v={brl(custo.detalhe.materialCloud)} />
              <Linha l="Custo por aluno" v={brl(custo.custoPorAluno)} />
            </div>
            <div className="space-y-1">
              <p className="font-semibold">Cascata (preço de tabela {brl(preco.precoTurma)})</p>
              <Linha l="PIS" v={brl(cascata.pis)} />
              <Linha l="COFINS" v={brl(cascata.cofins)} />
              <Linha l="ISS" v={brl(cascata.iss)} />
              <Linha l="Comissão" v={brl(cascata.comissao)} />
              <Linha l="IR/CSLL" v={brl(cascata.irpjCsll)} />
              <Linha l="Enc. financeiros" v={brl(cascata.encFinanc)} />
              <Linha l="Lucro" v={brl(cascata.lucro)} />
              <Linha l="Σ sobre a venda" v={pct(cascata.totalEncargosPerc)} />
            </div>
            {r.curva.length > 1 && (
              <div className="md:col-span-2 space-y-1">
                <p className="font-semibold">Preço por aluno conforme o tamanho da turma (sem desconto)</p>
                <div className="flex flex-wrap gap-1">
                  {r.curva.map((p) => (
                    <span key={p.alunos} className={`rounded border px-1.5 py-0.5 tabular-nums ${p.alunos === linha.alunos ? "border-primary bg-primary/10 font-semibold" : ""}`}>{p.alunos}: {brl(p.precoPorAluno)}</span>
                  ))}
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

function Kpi({ icon: Icon, l, v, destaque }: { icon: LucideIcon; l: string; v: string; destaque?: boolean }) {
  return <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Icon className="h-3 w-3" />{l}</p><p className={`tabular-nums ${destaque ? "font-bold text-primary" : "font-semibold text-foreground"}`}>{v}</p></div>;
}
