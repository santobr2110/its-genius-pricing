import { useITSMContext } from "@/contexts/ITSMContext";
import SaveDefaultsButton from "@/components/SaveDefaultsButton";
import { formatNumber, formatBRL } from "@/hooks/useITSMCalculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList, AlertTriangle, Layers, Users, Server, Network, Database, Shield,
  Laptop, Activity, Gauge, Workflow, Eye, Headphones, Wrench, Truck, Crown,
  Sparkles, Clock, Calculator, Receipt, TrendingUp, CheckCircle2, Circle,
  ArrowRight, Boxes, Target, Coins, Flame,
} from "lucide-react";
import { buildAreas } from "@/lib/buildAreas";
import SortableNav from "@/components/SortableNav";
import BackHomeButton from "@/components/BackHomeButton";
import { Link } from "react-router-dom";

const NIVEIS = ["Muito Baixo", "Baixo", "Ideal", "Alto", "Muito Alto"];

export default function Detalhamento() {
  const { state, results } = useITSMContext();
  const areas = buildAreas(state, results);
  const hasDeficit = results.horasPrevencao <= 0 && results.horasN3 > 0;

  const ajustePerc = (state.criticidadeEscala?.[state.criticidadeNivel] ?? 0) * 100;

  const tiers = [
    { key: "tierMonitor", label: "Smart Monitor", icon: Eye, active: state.tierMonitor,
      desc: "Monitoramento proativo de servidores, rede e firewalls. Inclui ferramentas e triagem N1." },
    { key: "tierOperation", label: "Smart Operation", icon: Headphones, active: state.tierOperation,
      desc: "Atendimento humano completo via funil N1/N2 com Service Desk como ponto único de contato." },
    { key: "tierOperationN3", label: "N3 em Operation", icon: Wrench, active: state.tierOperationN3,
      desc: "Especialistas N3 incluídos dentro do Smart Operation para resolução técnica avançada." },
    { key: "tierFieldOperation", label: "Field Service", icon: Truck, active: state.tierFieldOperation,
      desc: "Atendimento presencial para usuários finais, distribuído entre N1F/N2F/N3F." },
    { key: "tierPerformance", label: "Smart Performance", icon: Activity, active: state.tierPerformance,
      desc: "Rotinas preventivas e otimização contínua usando o saldo de horas N3 disponível." },
    { key: "tierEnterprise", label: "Smart Enterprise", icon: Crown, active: state.tierEnterprise,
      desc: "Camada estratégica com governança, GMUDs e gestão executiva do ambiente." },
  ];

  const tiersAtivos = tiers.filter(t => t.active);

  const complexFlags = [
    { key: "complexVirtualizacaoCluster", label: "Virtualização / Cluster" },
    { key: "complexBancoDadosHA", label: "Banco em Alta Disponibilidade" },
    { key: "complexFirewallHA", label: "Firewall em HA" },
    { key: "complexMultiSites", label: "Multi-Sites" },
    { key: "complexSiteBackup", label: "Site de Backup" },
    { key: "complexHibridoCloudOnPrem", label: "Híbrido Cloud + On-Prem" },
    { key: "complexOperacao24x7", label: "Operação 24x7" },
    { key: "complexErpMercado", label: "ERP de Mercado" },
  ] as const;
  const complexAtivas = complexFlags.filter(f => (state as any)[f.key]);

  const inventario = [
    { icon: Users, label: "Usuários", qtd: state.qtdUsuarios, taxa: state.taxaUsuario, gerados: results.chamadosUsuarios },
    { icon: Laptop, label: "Equipamentos", qtd: state.qtdEquipamentos, taxa: 0, gerados: 0, hint: "Endpoints monitorados" },
    { icon: Server, label: "Servidores", qtd: state.qtdServidores, taxa: state.taxaServidor, gerados: results.chamadosServidores },
    { icon: Network, label: "Ativos de Rede", qtd: state.qtdAtivosRede, taxa: state.taxaRede, gerados: results.chamadosRede },
    { icon: Database, label: "Bancos de Dados", qtd: state.qtdBancosDados, taxa: state.taxaBancoDados, gerados: results.chamadosBancoDados },
    { icon: Shield, label: "Firewall / Sistemas", qtd: state.qtdSistemas, taxa: state.taxaSistemas, gerados: results.chamadosSistemas },
  ].filter(i => i.qtd > 0);

  const custoTotalAreas = areas.reduce(
    (s, a) => s + a.custoN1 + a.custoN2 + a.custoN3 + a.custoFerramentas + a.custoExtra, 0,
  );

  // Narrativa executiva
  const narrativa = `Esta proposta foi dimensionada para um ambiente com ${formatNumber(state.qtdUsuarios)} usuários e ${formatNumber(
    state.qtdServidores + state.qtdAtivosRede + state.qtdBancosDados + state.qtdSistemas
  )} ativos de infraestrutura, com perfil de risco "${NIVEIS[state.criticidadeNivel]}" (${ajustePerc >= 0 ? "+" : ""}${ajustePerc.toFixed(0)}% sobre as taxas base). O modelo projeta ${formatNumber(results.volumeTotalBruto)} chamados/mês, dos quais ${formatNumber(results.chamadosResolvidosN0, 0)} são absorvidos automaticamente pelo N0 (${state.reducaoN0}%) e ${formatNumber(results.volumeAtendimentoHumano, 0)} seguem para atendimento humano distribuídos no funil ${state.percN1}/${state.percN2}/${state.percN3}.`;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-3 px-4">
          <BackHomeButton />
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0">
            <ClipboardList className="h-5 w-5 text-primary shrink-0" />
            <h1 className="text-sm font-bold text-foreground truncate">Detalhamento da Proposta</h1>
          </Link>
          <div className="ml-auto shrink-0 pl-2 flex items-center gap-2">
            <SaveDefaultsButton />
            <SortableNav current="detalhamento" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-6 space-y-8">

        {/* HERO — Sumário executivo */}
        <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-accent/10 p-8">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Sumário da Proposta</span>
            </div>
            <p className="text-base leading-relaxed text-foreground/90 max-w-4xl">{narrativa}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              <HeroStat icon={Boxes} label="Chamados Brutos / mês" value={formatNumber(results.volumeTotalBruto)} />
              <HeroStat icon={Workflow} label="Atendimento Humano" value={formatNumber(results.volumeAtendimentoHumano, 0)} sub={`${100 - state.reducaoN0}% do bruto`} />
              <HeroStat icon={Layers} label="Camadas Ativas" value={`${tiersAtivos.length}`} sub={tiersAtivos.map(t => t.label.replace("Smart ", "")).join(" · ")} />
              <HeroStat icon={Coins} label="Preço Mensal" value={formatBRL(results.precoVendaMensal)} highlight />
            </div>
          </div>
        </section>

        {/* CAMADAS SELECIONADAS */}
        <Section icon={Layers} title="Camadas de Oferta Selecionadas" subtitle="Cada camada habilita componentes específicos no cálculo abaixo">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tiers.map((t) => (
              <div key={t.key} className={`rounded-xl border p-4 transition ${t.active ? "border-primary/40 bg-primary/5 shadow-sm" : "border-dashed border-muted-foreground/20 bg-muted/20 opacity-60"}`}>
                <div className="flex items-start gap-3">
                  <div className={`rounded-lg p-2 ${t.active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                    <t.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{t.label}</span>
                      {t.active ? (
                        <Badge variant="default" className="text-[9px] h-4 gap-1"><CheckCircle2 className="h-2.5 w-2.5" />Ativa</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] h-4 gap-1 text-muted-foreground"><Circle className="h-2.5 w-2.5" />Inativa</Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{t.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* INVENTÁRIO */}
        <Section icon={Boxes} title="Inventário Considerado" subtitle="Base de cálculo para a geração de demanda mensal">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {inventario.map((item) => (
              <div key={item.label} className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <item.icon className="h-4 w-4" />
                  <span className="text-[11px] font-medium uppercase tracking-wider">{item.label}</span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{formatNumber(item.qtd)}</span>
                  {item.taxa > 0 && (
                    <span className="text-[10px] text-muted-foreground">× {item.taxa}/mês</span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {item.hint ? item.hint : `~${formatNumber(item.gerados, 1)} chamados gerados/mês`}
                </p>
              </div>
            ))}
          </div>
        </Section>

        {/* PERFIL DE RISCO E COMPLEXIDADE */}
        <Section icon={Gauge} title="Perfil de Risco e Complexidade" subtitle="Ajustes aplicados sobre as taxas-base de demanda">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1 rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Flame className="h-4 w-4" />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Nível de Risco</span>
              </div>
              <p className="mt-2 text-2xl font-bold">{NIVEIS[state.criticidadeNivel]}</p>
              <p className="text-xs text-muted-foreground">
                Ajuste de <span className={ajustePerc > 0 ? "text-destructive font-semibold" : ajustePerc < 0 ? "text-emerald-600 font-semibold" : "font-semibold"}>
                  {ajustePerc >= 0 ? "+" : ""}{ajustePerc.toFixed(0)}%
                </span> sobre as taxas
              </p>
            </div>
            <div className="md:col-span-2 rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Target className="h-4 w-4" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Fatores de Complexidade</span>
                </div>
                <Badge variant="secondary" className="text-[10px]">{complexAtivas.length} de {complexFlags.length}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {complexFlags.map((f) => {
                  const ativo = (state as any)[f.key];
                  return (
                    <span key={f.key} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] ${ativo ? "border-primary/40 bg-primary/10 text-primary font-medium" : "border-dashed text-muted-foreground/60"}`}>
                      {ativo ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                      {f.label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </Section>

        {/* FUNIL DE ATENDIMENTO */}
        <Section icon={Workflow} title="Funil de Atendimento" subtitle="Como os chamados são distribuídos do volume bruto até a resolução">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-stretch">
            <FunnelStep label="Bruto" value={formatNumber(results.volumeTotalBruto)} sub="100%" tone="muted" />
            <FunnelArrow />
            <FunnelStep label="N0 (auto)" value={formatNumber(results.chamadosResolvidosN0, 0)} sub={`${state.reducaoN0}% evitados`} tone="success" />
            <FunnelArrow />
            <FunnelStep label="Humano" value={formatNumber(results.volumeAtendimentoHumano, 0)} sub={`${100 - state.reducaoN0}%`} tone="primary" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <FunnelLevel label="N1 — Service Desk" perc={state.percN1} value={results.volumeN1} color="bg-blue-500" />
            <FunnelLevel label="N2 — Especialistas" perc={state.percN2} value={results.volumeN2} color="bg-amber-500" />
            <FunnelLevel label="N3 — Sêniores" perc={state.percN3} value={results.volumeN3} color="bg-rose-500" />
          </div>
        </Section>

        {/* DISTRIBUIÇÃO POR ÁREA */}
        <Section icon={Layers} title="Distribuição por Área de Atendimento" subtitle="Como cada chamado encontra a equipe certa">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Área</TableHead>
                <TableHead className="text-xs text-right">Brutos</TableHead>
                <TableHead className="text-xs text-right">N0</TableHead>
                <TableHead className="text-xs text-right">N1</TableHead>
                <TableHead className="text-xs text-right">N2</TableHead>
                <TableHead className="text-xs text-right">N3</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areas.filter(a => a.chamadosBrutos > 0).map((area) => (
                <TableRow key={area.nome}>
                  <TableCell className="text-sm py-3">
                    <span className="flex items-center gap-2">
                      <area.icon className="h-4 w-4 text-primary" />
                      {area.nome}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-right font-medium">{formatNumber(area.chamadosBrutos)}</TableCell>
                  <TableCell className="text-sm text-right text-muted-foreground">{formatNumber(area.chamadosN0, 1)}</TableCell>
                  <TableCell className="text-sm text-right">{area.chamadosN1 > 0 ? formatNumber(area.chamadosN1, 1) : "—"}</TableCell>
                  <TableCell className="text-sm text-right">{area.chamadosN2 > 0 ? formatNumber(area.chamadosN2, 1) : "—"}</TableCell>
                  <TableCell className="text-sm text-right">{area.chamadosN3 > 0 ? formatNumber(area.chamadosN3, 1) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>

        {/* EQUIPES E CAPACIDADES */}
        <Section icon={Users} title="Equipes e Capacidades" subtitle="Custo unitário e capacidade dimensionada por nível">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <TeamCard
              title="N1 — Service Desk"
              cost={formatBRL(results.custoPorChamadoN1)}
              costLabel="custo por chamado"
              capacity={`${formatNumber(state.capacidadeChamadosN1)} chamados/mês`}
              load={results.volumeN1}
              capacityNum={state.capacidadeChamadosN1}
              monthlyCost={results.custoN1}
            />
            <TeamCard
              title="N2 — Especialistas"
              cost={formatBRL(results.custoPorChamadoN2)}
              costLabel="custo por chamado"
              capacity={`${formatNumber(state.capacidadeChamadosN2)} chamados/mês`}
              load={results.volumeN2}
              capacityNum={state.capacidadeChamadosN2}
              monthlyCost={results.custoN2}
            />
            <TeamCard
              title="N3 — Sêniores"
              cost={`${formatBRL(state.valorHoraN3)}/h`}
              costLabel={`× ${state.tempoMedioChamadoN3}h por chamado`}
              capacity={`${formatNumber(state.horasN3Mensais)}h contratadas/mês`}
              load={results.horasAtendimentoN3}
              capacityNum={state.horasN3Mensais}
              monthlyCost={results.custoN3}
              unit="h"
            />
          </div>
        </Section>

        {/* HORAS N3 NARRATIVO */}
        {state.horasN3Mensais > 0 && (
          <Section icon={Clock} title="Como as Horas N3 são consumidas" subtitle="Equilíbrio entre atendimento reativo e ações preventivas">
            <div className="rounded-xl border bg-card p-5 space-y-4">
              <p className="text-sm leading-relaxed">
                Foram contratadas <strong>{formatNumber(results.horasN3)}h</strong> mensais de N3.
                Os <strong>{formatNumber(results.volumeN3, 1)} chamados</strong> projetados para esse nível consomem
                <strong> {formatNumber(results.horasAtendimentoN3, 1)}h</strong> ({state.tempoMedioChamadoN3}h por chamado),
                deixando <strong className={hasDeficit ? "text-destructive" : "text-emerald-600"}>{formatNumber(results.horasPrevencao, 1)}h</strong> {hasDeficit ? "em deficit" : "disponíveis para rotinas preventivas"}.
              </p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Consumo</span>
                  <span>{formatNumber(Math.min(100, (results.horasAtendimentoN3 / Math.max(1, results.horasN3)) * 100), 0)}%</span>
                </div>
                <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                  <div className={`h-full transition-all ${hasDeficit ? "bg-destructive" : (results.horasAtendimentoN3 / results.horasN3 > 0.8 ? "bg-amber-500" : "bg-emerald-500")}`}
                    style={{ width: `${Math.min(100, (results.horasAtendimentoN3 / Math.max(1, results.horasN3)) * 100)}%` }} />
                </div>
              </div>
              {hasDeficit && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <span>Horas insuficientes para o volume projetado. Aumente a contratação de N3 ou reduza a % do funil que chega ao N3.</span>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* COMPOSIÇÃO DE CUSTOS */}
        <Section icon={Calculator} title="Composição de Custos por Área" subtitle="Onde cada real do custo é alocado">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Área</TableHead>
                <TableHead className="text-xs text-right">N1</TableHead>
                <TableHead className="text-xs text-right">N2</TableHead>
                <TableHead className="text-xs text-right">N3</TableHead>
                <TableHead className="text-xs text-right">Ferramentas</TableHead>
                <TableHead className="text-xs text-right">Outros</TableHead>
                <TableHead className="text-xs text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areas.map((area) => {
                const total = area.custoN1 + area.custoN2 + area.custoN3 + area.custoFerramentas + area.custoExtra;
                if (total <= 0) return null;
                return (
                  <TableRow key={area.nome}>
                    <TableCell className="text-sm py-3">
                      <span className="flex items-center gap-2">
                        <area.icon className="h-4 w-4 text-primary" />
                        <span>
                          {area.nome}
                          {area.custoFerramentasLabel && <span className="block text-[10px] text-muted-foreground">{area.custoFerramentasLabel}</span>}
                          {area.custoExtraLabel && <span className="block text-[10px] text-muted-foreground">{area.custoExtraLabel}</span>}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-right">{area.custoN1 > 0 ? formatBRL(area.custoN1) : "—"}</TableCell>
                    <TableCell className="text-sm text-right">{area.custoN2 > 0 ? formatBRL(area.custoN2) : "—"}</TableCell>
                    <TableCell className="text-sm text-right">{area.custoN3 > 0 ? formatBRL(area.custoN3) : "—"}</TableCell>
                    <TableCell className="text-sm text-right">{area.custoFerramentas > 0 ? formatBRL(area.custoFerramentas) : "—"}</TableCell>
                    <TableCell className="text-sm text-right">{area.custoExtra > 0 ? formatBRL(area.custoExtra) : "—"}</TableCell>
                    <TableCell className="text-sm text-right font-semibold">{formatBRL(total)}</TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="border-t-2">
                <TableCell className="text-sm py-3 font-bold">Custo Total da Operação</TableCell>
                <TableCell colSpan={5} />
                <TableCell className="text-sm text-right font-bold text-primary">{formatBRL(custoTotalAreas)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Section>

        {/* FORMAÇÃO DO PREÇO */}
        <Section icon={Receipt} title="Formação do Preço de Venda" subtitle="Do custo operacional ao preço final praticado">
          <div className="rounded-xl border bg-gradient-to-br from-card to-primary/5 p-6 space-y-3">
            <PriceLine label="Custo Total da Operação" value={results.custoTotalOperacao} />
            <PriceOp icon={TrendingUp} label={`+ Margem de Lucro (${state.margemLucro}% — divisor markup)`} value={results.valorMargem} accent="emerald" />
            <PriceLine label="Preço pré-imposto" value={results.precoPreImposto} muted />
            <PriceOp icon={Receipt} label={`+ Impostos e Taxas (${state.impostosTaxas}% por fora)`} value={results.valorImpostos} accent="amber" />
            <div className="border-t pt-3">
              <PriceLine label="Preço de Venda Mensal" value={results.precoVendaMensal} highlight />
            </div>
            <p className="text-[11px] text-muted-foreground italic pt-1">
              Método "divisor de markup": a margem é aplicada sobre o preço final, não sobre o custo. Impostos calculados por fora para preservar o líquido.
            </p>
          </div>
        </Section>

      </main>
    </div>
  );
}

/* ===== Subcomponents ===== */

function Section({ icon: Icon, title, subtitle, children }: { icon: React.ElementType; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary" />
            <h2 className="text-base font-bold tracking-tight">{title}</h2>
          </div>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <Card><CardContent className="p-5">{children}</CardContent></Card>
    </section>
  );
}

function HeroStat({ icon: Icon, label, value, sub, highlight }: { icon: React.ElementType; label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${highlight ? "border-primary/40 bg-primary/10" : "bg-card/50 backdrop-blur"}`}>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-lg font-bold mt-1 ${highlight ? "text-primary" : ""}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground truncate">{sub}</p>}
    </div>
  );
}

function FunnelStep({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: "muted" | "success" | "primary" }) {
  const cls = tone === "success" ? "border-emerald-500/30 bg-emerald-500/5"
    : tone === "primary" ? "border-primary/30 bg-primary/5"
    : "border-border bg-muted/30";
  return (
    <div className={`rounded-xl border p-4 text-center ${cls}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function FunnelArrow() {
  return (
    <div className="hidden md:flex items-center justify-center text-muted-foreground/40">
      <ArrowRight className="h-5 w-5" />
    </div>
  );
}

function FunnelLevel({ label, perc, value, color }: { label: string; perc: number; value: number; color: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold">{label}</span>
        <span className="text-xs text-muted-foreground">{perc}%</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${perc}%` }} />
      </div>
      <p className="text-[11px] text-muted-foreground mt-1">{formatNumber(value, 1)} chamados/mês</p>
    </div>
  );
}

function TeamCard({ title, cost, costLabel, capacity, load, capacityNum, monthlyCost, unit = "" }: { title: string; cost: string; costLabel: string; capacity: string; load: number; capacityNum: number; monthlyCost: number; unit?: string }) {
  const usagePerc = capacityNum > 0 ? Math.min(100, (load / capacityNum) * 100) : 0;
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <p className="text-sm font-semibold">{title}</p>
      <div>
        <p className="text-2xl font-bold text-primary">{cost}</p>
        <p className="text-[11px] text-muted-foreground">{costLabel}</p>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>Uso da capacidade</span>
          <span>{usagePerc.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className={`h-full ${usagePerc > 90 ? "bg-destructive" : usagePerc > 70 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${usagePerc}%` }} />
        </div>
        <p className="text-[10px] text-muted-foreground">{capacity}</p>
      </div>
      <div className="border-t pt-2 flex items-baseline justify-between">
        <span className="text-[11px] text-muted-foreground">Custo mensal</span>
        <span className="text-sm font-semibold">{formatBRL(monthlyCost)}</span>
      </div>
    </div>
  );
}

function PriceLine({ label, value, highlight, muted }: { label: string; value: number; highlight?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`${highlight ? "text-base font-bold" : muted ? "text-xs text-muted-foreground" : "text-sm font-medium"}`}>{label}</span>
      <span className={`${highlight ? "text-2xl font-bold text-primary" : muted ? "text-sm text-muted-foreground" : "text-base font-semibold"}`}>{formatBRL(value)}</span>
    </div>
  );
}

function PriceOp({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: number; accent: "emerald" | "amber" }) {
  const color = accent === "emerald" ? "text-emerald-600" : "text-amber-600";
  return (
    <div className="flex items-center justify-between pl-4">
      <span className={`flex items-center gap-1.5 text-xs ${color}`}>
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className={`text-sm font-medium ${color}`}>{formatBRL(value)}</span>
    </div>
  );
}