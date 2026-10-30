import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Calculator, DollarSign, Loader2, Percent, Receipt, ShieldAlert, Table as TableIcon, TrendingUp, Wallet, Plus, Undo2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SubNav from '@/pages/treinamento/financeiro/SubNav';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useParametrosFinanceiros } from '@/hooks/useParametrosFinanceiros';
import { resolveTaxRates } from '@/lib/pricing/taxRates';
import { DEFAULT_COMISSAO_TIERS } from '@/lib/comissaoRentabilidade';
import { parseComissao } from '@/lib/treinamento/calc';
import { brl } from '@/lib/bodyshop/calc';
import { resultadoOperacaoBS } from '@/lib/bodyshop/financeiro';
import { useBodyshopResultado } from './useBodyshopResultado';
import { BS_BASE } from './useBsState';
const pct = (n: number) => `${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const BASE = `${BS_BASE}/financeiro`;
const ITEMS = [{ to: BASE, label: 'Resultado da Operação', icon: Receipt, end: true }, { to: `${BASE}/impostos`, label: 'Impostos & Markup', icon: Calculator }, { to: `${BASE}/comissoes`, label: 'Comissões', icon: TableIcon }];
function Shell({ children }: { children: React.ReactNode }) {
  const { loading, error, st, congeladoIntacto } = useBodyshopResultado();
  return <div className="mx-auto max-w-5xl space-y-6"><SubNav items={ITEMS} />{loading ? <p className="flex gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando…</p> : error ? <p className="text-destructive">{error instanceof Error ? error.message : error}</p> : <>{st.snapshot && <p className="text-xs text-muted-foreground">{congeladoIntacto ? 'Valores congelados da cotação. Alterações dos cadastros só serão aplicadas após reavaliação.' : 'Cotação editada: valores atuais, ainda não congelados.'}</p>}{children}</>}</div>;
}
async function salvarParam(key: string, value: unknown, userId?: string) {
  const { data, error } = await supabase.from('bodyshop_params').update({ value: value as never, updated_by: userId ?? null }).eq('key', key).select('key');
  if (error) throw error;
  if (!data?.length) throw new Error('Parâmetro não salvo. Confira sua permissão.');
  window.dispatchEvent(new Event('bodyshop:cadastro'));
}
export function BsResultado() {
  const { res, st } = useBodyshopResultado();
  const mensal = resultadoOperacaoBS(res), contrato = resultadoOperacaoBS(res, res.cascataBase.duracaoMeses);
  function bloco(r: typeof mensal, titulo: string) {
    const linha = (label: string, valor: number, destaque = false) => <div className={`grid grid-cols-[minmax(0,1fr)_60px_130px] gap-2 text-xs sm:text-sm ${destaque ? 'font-semibold' : ''}`}><span>{label}</span><span className="text-right text-muted-foreground tabular-nums">{pct(r.venda > 0 ? Math.abs(valor) / r.venda * 100 : 0)}</span><span className={`text-right tabular-nums ${destaque && valor < 0 ? 'text-destructive' : ''}`}>{brl(valor)}</span></div>;
    return <Card><CardHeader><CardTitle className="flex gap-2 items-center text-base"><Receipt className="h-4 w-4 text-primary" />{titulo}</CardTitle><p className="text-xs text-muted-foreground">Cotação {st.atual.nome || 'atual'}</p></CardHeader><CardContent className="space-y-2">{!res.linhas.some(l => !l.erros.length) ? <p className="text-sm text-muted-foreground">Adicione cargos no <Link to={BS_BASE} className="text-primary underline">Configurador</Link>.</p> : <>{linha('Valor de VENDA', r.venda, true)}<Separator />{linha('(−) Impostos (PIS + COFINS + ISS)', -r.impostos)}{linha('(−) Comissão', -r.comissao)}{linha('(−) Retenção', -r.retencao)}{linha('(−) IR / CSLL', -r.ir)}{linha('(−) Encargos financeiros', -r.financeiro)}{linha('(−) Custo', -r.custo)}{r.ajuste !== 0 && linha('Ajuste de arredondamento', r.ajuste)}<Separator />{linha('Lucro', r.lucro, true)}</>}</CardContent></Card>;
  }
  return <Shell><div className="grid gap-4 md:grid-cols-3">{[[Wallet, 'Custo Mensal', brl(mensal.custo)], [TrendingUp, 'Valor de Venda Mensal', brl(mensal.venda)], [Percent, 'Rentabilidade', pct(res.rentabilidadePerc)]].map(([Icon, label, value]) => { const I = Icon as typeof Wallet; return <Card key={String(label)}><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex gap-2"><I className="h-4 w-4" />{String(label)}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold tabular-nums">{String(value)}</p></CardContent></Card>; })}</div>{bloco(mensal, 'Composição do Resultado — Mensal')}{bloco(contrato, `Composição do Resultado — Contrato de ${res.cascataBase.duracaoMeses} meses`)}</Shell>;
}
function ParamPercent({ paramKey, titulo, desc, valor, nullable = false, max = 100 }: { paramKey: string; titulo: string; desc?: string; valor: number | null; nullable?: boolean; max?: number }) {
  const { can, user } = useAuth(); const { cad } = useBodyshopResultado();
  const pode = can('page.prof.admin'); const [v, setV] = useState(valor == null ? '' : String(valor)); const [saving, setSaving] = useState(false);
  useEffect(() => setV(valor == null ? '' : String(valor)), [valor]);
  const salvar = async () => { const n = v.trim() === '' && nullable ? null : Number(v.replace(',', '.')); if (n !== null && (!v.trim() || !Number.isFinite(n) || n < 0 || n > max)) return toast.error(`Informe um percentual entre 0 e ${max}.`); setSaving(true); try { await salvarParam(paramKey, n, user?.id); cad.refresh(); toast.success('Parâmetro salvo'); } catch(e) { toast.error((e as Error).message); } finally { setSaving(false); } };
  return <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldAlert className="h-4 w-4 text-primary" />{titulo}</CardTitle>{desc && <p className="text-xs text-muted-foreground">{desc}</p>}</CardHeader><CardContent className="space-y-3"><div className="flex items-center gap-2"><Input aria-label={titulo} value={v} disabled={!pode} onChange={e => setV(e.target.value)} placeholder={nullable ? 'Sem piso' : ''} className="w-28 text-right" /><span>%</span>{pode && <Button size="sm" disabled={saving || v === (valor == null ? '' : String(valor))} onClick={salvar}>Salvar</Button>}</div>{!nullable && <Slider aria-label={`${titulo} percentual`} disabled={!pode} value={[Number(v.replace(',', '.')) || 0]} onValueChange={([n]) => setV(String(n))} min={0} max={max} step={0.01} />}</CardContent></Card>;
}
function ProdutosPorFormato() {
  const { can, user } = useAuth(); const { cad, params, tax, st } = useBodyshopResultado(); const pode = can('page.prof.admin');
  const orig = { produto_presencial: params.produtoPresencial, produto_remoto: params.produtoRemoto }; const key = JSON.stringify(orig);
  const [v, setV] = useState(orig), [saving, setSaving] = useState(false);
  useEffect(() => setV(JSON.parse(key)), [key]);
  const codes = tax.codes.filter(c => c.ativo && c.ofertas?.includes('bodyshop'));
  const alterados = (Object.keys(v) as (keyof typeof v)[]).filter(k => v[k] !== orig[k]);
  const salvar = async () => { setSaving(true); try { for (const k of alterados) await salvarParam(k, v[k], user?.id); cad.refresh(); toast.success('Produtos fiscais salvos'); } catch(e) { toast.error((e as Error).message); } finally { setSaving(false); } };
  const linhas: [keyof typeof v, string][] = [['produto_presencial', 'Alocação presencial'], ['produto_remoto', 'Alocação remota']];
  return <Card><CardHeader className="flex flex-row flex-wrap gap-3 justify-between"><div><CardTitle className="text-base flex items-center gap-2"><TableIcon className="h-4 w-4 text-primary" />Produto fiscal por formato de alocação</CardTitle><p className="text-xs text-muted-foreground">Cada vaga usa o SKU do seu formato (presencial ou remoto). Vagas sem formato seguem o padrão da oferta.</p></div>{pode && <Button size="sm" onClick={salvar} disabled={!alterados.length || saving}>Salvar</Button>}</CardHeader><CardContent className="space-y-3">{linhas.map(([k, label]) => { const cod = v[k]; const nome = codes.find(x => x.codigo === cod)?.nome; const vigente = resolveTaxRates(cod, st.config.municipio, new Date().toISOString().slice(0, 10), tax.codes, tax.rates); return <div key={k} className="grid gap-2 border-b pb-3 sm:grid-cols-[minmax(0,1fr)_minmax(260px,1.4fr)]"><p className="text-sm font-medium">{label}</p><div className="space-y-1"><Select value={cod} disabled={!pode} onValueChange={x => setV({ ...v, [k]: x })}><SelectTrigger aria-label={`Produto fiscal — ${label}`}><SelectValue>{nome ?? cod}</SelectValue></SelectTrigger><SelectContent>{!codes.some(x => x.codigo === cod) && <SelectItem value={cod} disabled>{cod} · indisponível</SelectItem>}{codes.map(x => <SelectItem key={x.id} value={x.codigo}><span className="flex flex-col"><span>{x.nome}</span><span className="text-[11px] text-muted-foreground font-mono">{x.codigo}</span></span></SelectItem>)}</SelectContent></Select>{!vigente && <p className="text-[11px] text-destructive">Sem alíquotas em {st.config.municipio}.</p>}</div></div>; })}</CardContent></Card>;
}
export function BsImpostos() {
  const { can, user } = useAuth(); const { st, params, res } = useBodyshopResultado(); const { config, setConfig } = st;
  const edit = (k: 'encFinancPerc' | 'descontoTotalPerc', label: string, value: number, max: number) => <div className="space-y-2"><div className="flex flex-wrap justify-between items-center gap-2"><Label htmlFor={`bs-fin-${k}`}>{label}</Label><div className="flex items-center gap-2"><Input id={`bs-fin-${k}`} className="w-24 text-right" type="number" min={0} max={max} step={0.01} disabled={!can('page.prof.quote')} value={value} onChange={e => { const n = Number(e.target.value); if (Number.isFinite(n) && n >= 0 && n <= max) setConfig({ ...config, [k]: n }); }} /><span>%</span></div></div><Slider aria-label={label} disabled={!can('page.prof.quote')} value={[value]} min={0} max={max} step={0.01} onValueChange={([n]) => setConfig({ ...config, [k]: n })} /></div>;
  return <Shell><ProdutosPorFormato /><Card><CardHeader><CardTitle className="text-base flex gap-2"><DollarSign className="h-4 w-4 text-primary" />Componentes sobre a venda</CardTitle></CardHeader><CardContent className="space-y-5"><div className="space-y-2"><Label>IRPJ / CSLL</Label><p className="font-semibold tabular-nums">{pct(res.cascataBase.irpjCsllPerc)}</p><p className="text-xs text-muted-foreground">Percentual sobre a venda, definido na Administração. Cotações congeladas preservam o imposto original.</p></div>{edit('encFinancPerc', 'Encargos financeiros', config.encFinancPerc ?? params.encFinancPerc, 100)}<div className="flex justify-between text-sm"><span>Retenção aplicada na cotação</span><strong>{pct(res.cascataBase.retencaoPerc)}</strong></div>{edit('descontoTotalPerc', 'Desconto total', config.descontoTotalPerc, 100)}</CardContent></Card><ParamPercent paramKey="retencao_perc" titulo="Retenção da oferta" valor={params.retencaoPerc} /><ParamPercent paramKey="rentabilidade_alvo_perc" titulo="Rentabilidade alvo da oferta" desc="Padrão herdado pela cotação; um alvo informado no Configurador tem prioridade." valor={params.rentabilidadeAlvoPerc} max={99} /><ParamPercent paramKey="piso_rentabilidade_perc" titulo="Piso de rentabilidade" desc="Um piso próprio no cadastro do cargo tem prioridade. Vazio = sem alerta." valor={params.pisoRentabilidadePerc} nullable /></Shell>;
}
export function BsComissoes() {
  const { can, user } = useAuth(); const { cad, params, res, tiers } = useBodyshopResultado(); const pode = can('page.prof.admin');
  const salvo = params.comissaoFixaPerc; const [fixa, setFixa] = useState(salvo != null), [valor, setValor] = useState(String(salvo ?? 7.32).replace('.', ',')), [saving, setSaving] = useState(false);
  useEffect(() => { setFixa(salvo != null); setValor(String(salvo ?? 7.32).replace('.', ',')); }, [salvo]);
  const salvar = async () => { if (fixa && parseComissao(valor) == null) return toast.error('Informe um percentual válido.'); setSaving(true); try { await salvarParam('comissao_regra', fixa ? valor : '', user?.id); cad.refresh(); toast.success('Regra de comissão salva'); } catch(e) { toast.error((e as Error).message); } finally { setSaving(false); } };
  const pendente = cad.params.find(p => p.key === 'comissao_regra')?.status === 'a_confirmar';
  return <Shell><Card><CardHeader><CardTitle className="text-base flex gap-2"><Percent className="h-4 w-4 text-primary" />Regra de comissão</CardTitle>{pendente && <Badge variant="outline" className="w-fit">[A CONFIRMAR]</Badge>}</CardHeader><CardContent className="space-y-3"><div className="flex gap-3 items-center"><Switch id="bs-fixa" checked={fixa} disabled={!pode} onCheckedChange={setFixa} /><Label htmlFor="bs-fixa">{fixa ? 'Comissão fixa' : 'Escala Selbetti'}</Label></div>{fixa && <div className="flex gap-2 items-center"><Input aria-label="Comissão fixa percentual" className="w-28 text-right" disabled={!pode} value={valor} onChange={e => setValor(e.target.value)} /><span>%</span></div>}{pode && <Button size="sm" disabled={saving} onClick={salvar}>Salvar</Button>}</CardContent></Card><Card><CardHeader><CardTitle className="text-base flex gap-2"><TableIcon className="h-4 w-4 text-primary" />Escala Selbetti — Comissão por Faixa de Rentabilidade</CardTitle><p className="text-xs text-muted-foreground">Rentabilidade atual: {pct(res.rentabilidadePerc)}</p>{res.cascataBase.comissaoFixaPerc != null && <p className="text-xs border rounded-md border-primary/40 bg-primary/10 px-2 py-1">Comissão fixa de {pct(res.cascataBase.comissaoFixaPerc)} ativa — a escala abaixo não está sendo aplicada.</p>}</CardHeader><CardContent className="space-y-2"><div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground"><span>Rent. mínima (%)</span><span>Rent. máxima (%)</span><span>Comissão (%)</span></div>{tiers.map((t,i) => <div key={i} className="grid grid-cols-3 gap-2"><Input disabled value={t.minRent} className="h-8 text-right" /><Input disabled value={t.maxRent ?? '—'} className="h-8 text-right" /><Input disabled value={t.comissao} className="h-8 text-right" /></div>)}</CardContent></Card></Shell>;
}
