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
  ArrowRight, Boxes, Target, Coins, Flame, ShieldCheck, Zap, HeartHandshake,
  TrendingDown, Award,
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
      tagline: "Olhos abertos 24/7 sobre sua infraestrutura",
      benefits: [
        "Monitoramento proativo de servidores, rede e firewalls",
        "Detecção de incidentes antes que afetem o usuário final",
        "Triagem técnica feita pelo time N1",
      ] },
    { key: "tierOperation", label: "Smart Operation", icon: Headphones, active: state.tierOperation,
      tagline: "Service Desk como ponto único de contato",
      benefits: [
        "Atendimento humano completo via funil N1 e N2",
        "Resolução estruturada com SLA controlado",
        "Indicadores e relatórios mensais de operação",
      ] },
    { key: "tierOperationN3", label: "N3 em Operation", icon: Wrench, active: state.tierOperationN3,
      tagline: "Especialistas sêniores na sua linha de frente",
      benefits: [
        "Engenheiros N3 dedicados à resolução de casos complexos",
        "Reduz dependência de fornecedores pontuais",
        "Acelera o tempo de resolução em incidentes críticos",
      ] },
    { key: "tierFieldOperation", label: "Field Service", icon: Truck, active: state.tierFieldOperation,
      tagline: "Suporte presencial onde o usuário precisa",
      benefits: [
        "Atendimento in loco para incidentes de hardware e desktop",
        "Equipe local distribuída entre N1F, N2F e N3F",
        "Cobertura adicional com transbordo remoto se necessário",
      ] },
    { key: "tierPerformance", label: "Smart Performance", icon: Activity, active: state.tierPerformance,
      tagline: "Do reativo para o preventivo",
      benefits: [
        "Rotinas preventivas executadas por engenheiros N3",
        "Otimização contínua de performance e disponibilidade",
        "Aproveitamento inteligente das horas técnicas contratadas",
      ] },
    { key: "tierEnterprise", label: "Smart Enterprise", icon: Crown, active: state.tierEnterprise,
      tagline: "Governança e visão executiva da TI",
      benefits: [
        "Gestão estratégica do ambiente e roadmap tecnológico",
        "Comitê executivo, GMUDs e governança de mudanças",
        "Alinhamento contínuo entre TI e negócio",
      ] },
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

  const totalAtivos = state.qtdServidores + state.qtdAtivosRede + state.qtdBancosDados + state.qtdSistemas;
  const custoPorChamadoMedio = results.volumeAtendimentoHumano > 0
    ? results.precoVendaMensal / results.volumeAtendimentoHumano
    : 0;

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

        {/* CAPA COMERCIAL */}
        <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/15 via-background to-accent/10 p-8 md:p-12">
          <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
          <div className="relative grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
            <div className="lg:col-span-3 space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border bg-card/60 backdrop-blur px-3 py-1">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Proposta Comercial</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
                Operação de TI sob medida para um ambiente de <span className="text-primary">{formatNumber(state.qtdUsuarios)} usuários</span> e <span className="text-primary">{formatNumber(totalAtivos)} ativos</span>.
              </h1>
              <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
                Um modelo de serviço completo, dimensionado para absorver {formatNumber(results.volumeTotalBruto)} chamados/mês, evitar {state.reducaoN0}% deles automaticamente e entregar previsibilidade de custo, qualidade e governança.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {tiersAtivos.map(t => (
                  <span key={t.key} className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    <t.icon className="h-3 w-3" />
                    {t.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="lg:col-span-2">
              <div className="rounded-2xl border-2 border-primary/40 bg-card/80 backdrop-blur p-6 shadow-xl">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Investimento Mensal</p>
                <p className="mt-2 text-4xl md:text-5xl font-bold text-primary tracking-tight">{formatBRL(results.precoVendaMensal)}</p>
                <p className="text-xs text-muted-foreground mt-1">Tudo incluso · sem custos surpresa</p>
                <div className="mt-5 grid grid-cols-2 gap-3 text-center border-t pt-4">
                  <div>
                    <p className="text-lg font-bold">{custoPorChamadoMedio > 0 ? formatBRL(custoPorChamadoMedio) : "—"}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">por chamado atendido</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{tiersAtivos.length}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">camadas ativas</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PILARES DE VALOR */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <ValuePillar icon={ShieldCheck} title="Previsibilidade" desc="Custo fixo mensal com escopo claro do que está incluído." />
          <ValuePillar icon={Zap} title="Automação que poupa" desc={`${state.reducaoN0}% dos chamados resolvidos antes de chegarem a uma pessoa.`} />
          <ValuePillar icon={HeartHandshake} title="Equipe dedicada" desc="N1, N2 e N3 dimensionados para o seu volume real de demanda." />
          <ValuePillar icon={Award} title="Governança" desc="Indicadores, SLA e visão executiva de toda a operação." />
        </section>

        {/* O QUE ESTÁ INCLUÍDO */}
        <Section icon={Layers} title="O que está incluído nesta proposta" subtitle="Cada camada selecionada agrega capacidades específicas à sua operação">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tiers.map((t) => (
              <div key={t.key} className={`relative rounded-xl border p-5 transition ${t.active ? "border-primary/40 bg-gradient-to-br from-primary/5 to-transparent shadow-sm" : "border-dashed border-muted-foreground/20 bg-muted/20 opacity-50"}`}>
                {t.active && (
                  <span className="absolute -top-2 right-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 shadow">Incluído</span>
                )}
                <div className="flex items-start gap-3">
                  <div className={`rounded-xl p-2.5 ${t.active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                    <t.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold">{t.label}</p>
                    <p className="text-[11px] text-muted-foreground italic leading-snug">{t.tagline}</p>
                  </div>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {t.benefits.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12px] leading-snug">
                      {t.active ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 text-muted-foreground/40 mt-0.5 shrink-0" />
                      )}
                      <span className={t.active ? "" : "text-muted-foreground/70"}>{b}</span>
                    </li>
                  ))}
                </ul>
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

        {/* INVESTIMENTO */}
        <Section icon={Receipt} title="Seu Investimento" subtitle="Transparência total sobre como o valor é composto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2 rounded-xl border bg-gradient-to-br from-card to-primary/5 p-6 space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Composição</p>
              <PriceLine label="Operação completa" value={results.custoTotalOperacao} />
              <PriceOp icon={TrendingUp} label={`Margem operacional (${state.margemLucro}%)`} value={results.valorMargem} accent="emerald" />
              <PriceLine label="Subtotal" value={results.precoPreImposto} muted />
              <PriceOp icon={Receipt} label={`Tributos e taxas (${state.impostosTaxas}%)`} value={results.valorImpostos} accent="amber" />
            </div>
            <div className="rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 to-accent/10 p-6 flex flex-col justify-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Investimento Mensal</p>
              <p className="mt-2 text-3xl md:text-4xl font-bold text-primary tracking-tight">{formatBRL(results.precoVendaMensal)}</p>
              <div className="mt-4 pt-4 border-t border-primary/20 space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Anual</span><span className="font-semibold">{formatBRL(results.precoVendaMensal * 12)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Por usuário/mês</span><span className="font-semibold">{state.qtdUsuarios > 0 ? formatBRL(results.precoVendaMensal / state.qtdUsuarios) : "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Por chamado</span><span className="font-semibold">{custoPorChamadoMedio > 0 ? formatBRL(custoPorChamadoMedio) : "—"}</span></div>
              </div>
            </div>
          </div>
        </Section>

        {/* CALL TO ACTION */}
        <section className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-background to-accent/10 p-8 text-center space-y-3">
          <Award className="h-8 w-8 text-primary mx-auto" />
          <h2 className="text-xl font-bold tracking-tight">Pronto para uma operação de TI sem surpresas?</h2>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            Esta proposta foi dimensionada com base no seu inventário real e nos níveis de serviço necessários para sustentar seu negócio. Vamos conversar sobre os próximos passos.
          </p>
        </section>

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

function ValuePillar({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 hover:shadow-md transition">
      <div className="rounded-lg bg-primary/10 text-primary w-9 h-9 flex items-center justify-center">
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-3 text-sm font-bold">{title}</p>
      <p className="text-[11px] text-muted-foreground leading-snug mt-1">{desc}</p>
    </div>
  );
}