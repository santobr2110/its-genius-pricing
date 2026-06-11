import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, FileDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useITSMContext } from "@/contexts/ITSMContext";
import { formatBRL, formatNumber, computeITSMResults, type ITSMState, type ITSMResults } from "@/hooks/useITSMCalculator";
import { computeExtrasOperacionais, recomputeComposicaoComExtras } from "@/lib/extrasOperacionais";
import { SMART_ITO_NS } from "@/lib/offerings";
import { supabase } from "@/integrations/supabase/client";
import { usePersistentState } from "@/hooks/usePersistentState";
import { ROTINAS_DEFAULT, rotinaMultiplicador, type ComplexFlags, type Rotina } from "@/data/rotinas";
import { GMUDS_DEFAULT, bucketGmuds, computeGmud, type Gmud } from "@/data/gmuds";
import { useAuth } from "@/contexts/AuthContext";
import SortableNav from "@/components/SortableNav";
import BackHomeButton from "@/components/BackHomeButton";
import selbettiLogo from "@/assets/selbetti-logo.png.asset.json";

interface CommercialRow {
  client_name: string | null;
  account_manager: string | null;
  bu_specialist: string | null;
  bu_architect: string | null;
  contract_term: string | null;
  salesforce_code: string | null;
  quote_code: string | null;
  created_at: string;
}

interface PresetSnapshot {
  commercial: CommercialRow;
  calculator: ITSMState;
  allParams: Record<string, unknown> | null;
}

function parseMonths(term: string | null | undefined): number {
  if (!term) return 12;
  const m = String(term).match(/(\d+)/);
  return m ? Number(m[1]) : 12;
}

export default function ResumoCotacao() {
  const { state, results, activePreset } = useITSMContext();
  const { can } = useAuth();
  const isSaved = !!activePreset.activeId;
  const canExport = can("pricing.export_pdf");

  const [snapshot, setSnapshot] = useState<PresetSnapshot | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!activePreset.activeId) { setSnapshot(null); return; }
      const { data } = await supabase
        .from("pricing_presets")
        .select("client_name, account_manager, bu_specialist, bu_architect, contract_term, salesforce_code, quote_code, created_at, payload")
        .eq("id", activePreset.activeId)
        .maybeSingle();
      if (!cancel && data) {
        const row = data as unknown as CommercialRow & { payload?: { calculator: ITSMState; allParams?: Record<string, unknown> } };
        setSnapshot({
          commercial: {
            client_name: row.client_name, account_manager: row.account_manager,
            bu_specialist: row.bu_specialist, bu_architect: row.bu_architect,
            contract_term: row.contract_term, salesforce_code: row.salesforce_code,
            quote_code: row.quote_code, created_at: row.created_at,
          },
          calculator: row.payload?.calculator ?? (state as ITSMState),
          allParams: row.payload?.allParams ?? null,
        });
      } else if (!cancel) {
        setSnapshot(null);
      }
    })();
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePreset.activeId]);

  const [rotinasLive] = usePersistentState<Rotina[]>("gestao-ti:rotinas", ROTINAS_DEFAULT);
  const [gmudsLive] = usePersistentState<Gmud[]>("gestao-ti:gmuds", GMUDS_DEFAULT);
  const [n3CortesLive] = usePersistentState<[number, number]>("gestao-ti:smartPerf:n3Cortes", [33, 66]);

  const commercial = snapshot?.commercial ?? null;

  // ===== Fonte canônica = snapshot salvo (quando há), senão estado ao vivo =====
  // Garante que o relatório reflita EXATAMENTE a configuração salva da
  // precificação, mesmo que o estado ao vivo divirja por algum motivo.
  const calcState: ITSMState = snapshot?.calculator ?? (state as ITSMState);
  const rotinas: Rotina[] = (snapshot?.allParams?.[`${SMART_ITO_NS}gestao-ti:rotinas`] as Rotina[] | undefined) ?? rotinasLive;
  const gmuds: Gmud[] = (snapshot?.allParams?.[`${SMART_ITO_NS}gestao-ti:gmuds`] as Gmud[] | undefined) ?? gmudsLive;
  const n3Cortes: [number, number] = (snapshot?.allParams?.[`${SMART_ITO_NS}gestao-ti:smartPerf:n3Cortes`] as [number, number] | undefined) ?? n3CortesLive;

  // Resultados unificados (base + extras de rotinas/gmuds) — mesma fórmula do contexto.
  // Quando há um preset ativo, o contexto já hidratou o estado e aplicou os
  // auto-syncs (comissão por rentabilidade, custos N1/N2 vindos das equipes).
  // Usar `results` do contexto garante que Resumo == Camadas de oferta.
  const computed: ITSMResults = useMemo(() => {
    if (isSaved) return results as ITSMResults;
    const base = computeITSMResults(calcState);
    const extras = computeExtrasOperacionais(calcState, base, rotinas, gmuds);
    return recomputeComposicaoComExtras(calcState, base, extras.custoTotal);
  }, [isSaved, results, calcState, rotinas, gmuds]);

  // ===== Composição financeira (mesma fórmula das Camadas de Oferta) =====
  const meses = parseMonths(commercial?.contract_term);
  const sm = computed.smartMonitor;
  const sf = computed.smartFlow;
  const totalEncargosPerc =
    (calcState.pisPerc || 0) + (calcState.cofinsPerc || 0) + (calcState.issPerc || 0) +
    (calcState.comissaoPerc || 0) + (calcState.irpjCsllPerc || 0) + (calcState.encFinancPerc || 0) +
    (calcState.lucroPerc || 0);
  const fatorDivisor = totalEncargosPerc < 100 ? (100 - totalEncargosPerc) / 100 : 0;
  const fatorVenda = fatorDivisor > 0 ? 1 / fatorDivisor : 1;
  const toSell = (custo: number) => custo * fatorVenda;

  // ===== Tabela: camadas contratadas × componentes principais =====
  const hasInfraInventory =
    (calcState.qtdServidores || 0) + (calcState.qtdAtivosRede || 0) +
    (calcState.qtdBancosDados || 0) + (calcState.qtdSistemas || 0) > 0;

  // Rotinas preventivas — total de CACs (chamados/mês) com base no inventário.
  // Separa rotinas de Microinformática (Field) das demais (Performance).
  const { rotinasPerformance, rotinasField } = useMemo(() => {
    const inv = {
      qtdUsuarios: calcState.qtdUsuarios, qtdEquipamentos: calcState.qtdEquipamentos,
      qtdServidores: calcState.qtdServidores, qtdAtivosRede: calcState.qtdAtivosRede,
      qtdBancosDados: calcState.qtdBancosDados, qtdSistemas: calcState.qtdSistemas,
    };
    const flags: ComplexFlags = {
      complexVirtualizacaoCluster: calcState.complexVirtualizacaoCluster,
      complexBancoDadosHA: calcState.complexBancoDadosHA,
      complexFirewallHA: calcState.complexFirewallHA,
      complexMultiSites: calcState.complexMultiSites,
      complexSiteBackup: calcState.complexSiteBackup,
      complexHibridoCloudOnPrem: calcState.complexHibridoCloudOnPrem,
      complexOperacao24x7: calcState.complexOperacao24x7,
      complexErpMercado: calcState.complexErpMercado,
    };
    let perf = 0;
    let field = 0;
    rotinas.forEach((r) => {
      const mult = rotinaMultiplicador(r, inv, flags);
      const ch = r.chamadosMes * mult;
      if (r.grupo === "Microinformática") field += ch;
      else perf += ch;
    });
    return { rotinasPerformance: perf, rotinasField: field };
  }, [rotinas, calcState]);

  // GMUDs — totais Operation + Performance
  const gmudData = useMemo(() => {
    const input = {
      custoPorChamadoN2: computed.custoPorChamadoN2,
      tempoMedioChamadoN3: calcState.tempoMedioChamadoN3,
      valorHoraN3: calcState.valorHoraN3,
      percN2: calcState.percGmudN2 ?? 70,
      percN3: calcState.percGmudN3 ?? 30,
    };
    const buckets = bucketGmuds(gmuds);
    const reduce = (list: Gmud[]) => list.reduce(
      (acc, g) => {
        const c = computeGmud(g, input);
        acc.chamados += c.chamadosMes;
        acc.custo += c.custo;
        return acc;
      },
      { chamados: 0, custo: 0 },
    );
    return {
      operation: reduce(buckets.operation),
      performance: reduce(buckets.performance),
    };
  }, [gmuds, computed.custoPorChamadoN2, calcState.tempoMedioChamadoN3, calcState.valorHoraN3, calcState.percGmudN2, calcState.percGmudN3]);

  const extrasResumo = useMemo(
    () => computeExtrasOperacionais(calcState, computed, rotinas, gmuds),
    [calcState, computed, rotinas, gmuds],
  );
  const dominantTierKey: "Monitor" | "Flow" | "Operation" | "Performance" | null =
    calcState.tierPerformance ? "Performance"
    : calcState.tierOperation ? "Operation"
    : calcState.tierFlow ? "Flow"
    : calcState.tierMonitor ? "Monitor"
    : null;
  const addDominantGerenciais = (tier: typeof dominantTierKey, custo: number) =>
    custo + (dominantTierKey === tier ? extrasResumo.custoRotinasGerenciais : 0);

  // Horas N3 — Tamanho, Owner e Livre (cortes Smart Performance)
  const [corteTam, corteOwner] = n3Cortes;
  const pctTam = corteTam;
  const pctOwner = Math.max(0, corteOwner - corteTam);
  const pctLivre = Math.max(0, 100 - corteOwner);
  const horasN3 = calcState.horasN3Mensais || 0;

  // Custo extra: Endpoint Tooling (entra no custoTotalOperacao do calculador).
  const custoEndpointTooling = (calcState.custoFerramentaEndpoint || 0) * (calcState.qtdEquipamentos || 0);

  type Row = {
    camada: string;
    reativos: number;
    rotinas: number;
    gmuds: number;
    horasN3: number;
    valor: number; // preço de venda mensal da linha
    custo: number;
    tipo?: "custo" | "encargo";
    nota?: string;
    valorLabel?: string;
  };
  const layerRows: Row[] = [];
  const buildNota = (parts: Array<[string, string | number | null | undefined]>) =>
    parts
      .filter(([, v]) => v !== null && v !== undefined && v !== "" && v !== 0)
      .map(([k, v]) => `${k}: ${v}`)
      .join(" · ");
  const monitorCusto = sm?.total || 0;
  const flowCusto = (sf?.total || 0) + (calcState.tierMonitor && hasInfraInventory ? monitorCusto : 0);

  // Quando Smart Flow está ativo, ele consolida o Smart Monitor (não exibir separado).
  if (calcState.tierMonitor && !calcState.tierFlow && hasInfraInventory) {
    const custo = addDominantGerenciais("Monitor", monitorCusto);
    layerRows.push({
      camada: "Smart Monitor",
      reativos: sm.chamadosAtivos || 0,
      rotinas: 0,
      gmuds: 0,
      horasN3: (sm.horasN3 || 0) + (sm.horasN3Manut || 0),
      valor: toSell(custo),
      custo,
      nota: buildNota([
        ["Ativos monitorados", formatNumber(sm.ativos || 0)],
        ["Proxys", sm.qtdProxys || 0],
        ["Atendentes ITSM", sm.qtdAtendentes || 0],
        ["Horas N3 atendimento", (sm.horasN3 || 0) ? `${formatNumber(sm.horasN3)}h` : 0],
        ["Horas Automação/Manutenção", (sm.horasN3Manut || 0) ? `${formatNumber(sm.horasN3Manut)}h` : 0],
      ]),
    });
  }
  if (calcState.tierFlow) {
    const custo = addDominantGerenciais("Flow", flowCusto);
    layerRows.push({
      camada: "Smart Flow",
      reativos: sf.chamadosAtivos || 0,
      rotinas: 0,
      gmuds: 0,
      horasN3: ((sf.horasN3 as number) || 0) + ((sf.horasN3Manut as number) || 0),
      valor: toSell(custo),
      custo,
      nota: buildNota([
        ["Monitor consolidado", calcState.tierMonitor && hasInfraInventory ? formatBRL(toSell(monitorCusto)) : ""],
        ["Ativos monitorados", formatNumber(sf.ativos || 0)],
        ["Proxys", sf.qtdProxys || 0],
        ["Atendentes ITSM", sf.qtdAtendentes || 0],
        ["Horas N3 atendimento", ((sf.horasN3 as number) || 0) ? `${formatNumber(sf.horasN3 as number)}h` : 0],
        ["Horas Automação/Manutenção", ((sf.horasN3Manut as number) || 0) ? `${formatNumber(sf.horasN3Manut as number)}h` : 0],
      ]),
    });
  }
  if (calcState.tierOperation) {
    const custoOperacaoBase =
      (computed.custoN1 || 0) + (computed.custoN2 || 0) +
      (calcState.tierPerformance ? 0 : (computed.custoN3 || 0));
    const custo = addDominantGerenciais("Operation", custoOperacaoBase + gmudData.operation.custo);
    layerRows.push({
      camada: "Smart Operation",
      reativos: (computed.volumeN1 || 0) + (computed.volumeN2 || 0),
      rotinas: 0,
      gmuds: gmudData.operation.chamados,
      // Quando Performance está ativo, as horas N3 contratadas migram para a linha
      // Smart Performance; caso contrário, ficam na linha do Smart Operation.
      horasN3: calcState.tierPerformance ? 0 : (computed.horasN3 || 0),
      valor: toSell(custo),
      custo,
    });
  }
  if (calcState.tierPerformance) {
    const custo = addDominantGerenciais("Performance", (computed.custoN3 || 0) + gmudData.performance.custo);
    layerRows.push({
      camada: "Smart Performance",
      reativos: computed.volumeN3 || 0,
      rotinas: rotinasPerformance,
      gmuds: gmudData.performance.chamados,
      horasN3: horasN3,
      valor: toSell(custo),
      custo,
    });
  }
  if (custoEndpointTooling > 0) {
    layerRows.push({
      camada: "Ferramenta de Endpoint",
      reativos: 0, rotinas: 0, gmuds: 0, horasN3: 0,
      valor: 0,
      custo: 0,
      valorLabel: "Informativo",
      nota: buildNota([
        ["Equipamentos", formatNumber(calcState.qtdEquipamentos || 0)],
        ["Custo unitário/mês", formatBRL(calcState.custoFerramentaEndpoint || 0)],
      ]),
    });
  }
  if ((computed.fieldService?.total || 0) > 0) {
    const fs = computed.fieldService;
    const custo = (fs.total || 0) + extrasResumo.custoRotinasField;
    const analistas: string[] = [];
    if ((calcState.fieldDirectQtdN1 || 0) > 0) analistas.push(`N1: ${calcState.fieldDirectQtdN1}`);
    if ((calcState.fieldDirectQtdN2 || 0) > 0) analistas.push(`N2: ${calcState.fieldDirectQtdN2}`);
    if ((calcState.fieldDirectQtdN3 || 0) > 0) analistas.push(`N3: ${calcState.fieldDirectQtdN3}`);
    const totalAnalistas = (calcState.fieldDirectQtdN1 || 0) + (calcState.fieldDirectQtdN2 || 0) + (calcState.fieldDirectQtdN3 || 0);
    layerRows.push({
      camada: "Field Service",
      reativos: (fs.volumeN1F || 0) + (fs.volumeN2F || 0) + (fs.volumeN3F || 0),
      rotinas: rotinasField, gmuds: 0, horasN3: 0,
      valor: toSell(custo),
      custo,
      nota: buildNota([
        ["Analistas (total)", totalAnalistas || 0],
        ["Distribuição", analistas.length ? analistas.join(", ") : ""],
      ]),
    });
  }
  if (calcState.tierEnterprise) {
    layerRows.push({
      camada: "Smart Enterprise",
      reativos: 0, rotinas: 0, gmuds: 0, horasN3: 0,
      valor: 0,
      custo: 0,
    });
  }

  const receitaMes = layerRows.reduce((a, r) => a + r.valor, 0);
  const investimentoTotal = receitaMes * meses;
  const impostos = receitaMes * (((calcState.pisPerc || 0) + (calcState.cofinsPerc || 0) + (calcState.issPerc || 0) + (calcState.irpjCsllPerc || 0)) / 100);
  const comercial = receitaMes * ((calcState.comissaoPerc || 0) / 100);
  const financeiro = receitaMes * ((calcState.encFinancPerc || 0) / 100);
  const suporteAtendimento = layerRows.reduce((a, r) => a + r.custo, 0);
  const administrativo = 0;
  const liquido = receitaMes * ((calcState.lucroPerc || 0) / 100);
  const liquidoPerc = receitaMes > 0 ? (liquido / receitaMes) * 100 : 0;

  // ===== Exportar PDF =====
  const handleExportPDF = async () => {
    if (!isSaved) {
      toast.error("Salve a precificação para exportar o relatório.");
      return;
    }
    const el = document.getElementById("resumo-cotacao-printable");
    if (!el) return;
    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    const pdfWidth = 210, pdfHeight = 297;
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
    heightLeft -= pdfHeight;
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pdfHeight;
    }
    const code = commercial?.quote_code || "resumo-cotacao";
    pdf.save(`${code}-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const dataEmissao = commercial?.created_at
    ? new Date(commercial.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

  const Field = ({ label, value }: { label: string; value?: string | null }) => (
    <div className="flex gap-2 text-sm">
      <span className="font-bold whitespace-nowrap" style={{ color: "#000" }}>{label}</span>
      <span style={{ color: "#000" }}>{value || "—"}</span>
    </div>
  );

  const exportDisabledReason = !isSaved
    ? "Salve a precificação para habilitar a exportação"
    : !canExport
    ? "Você não tem permissão para exportar"
    : undefined;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-3 px-4">
          <BackHomeButton />
          <Link to="/ito" className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0">
            <FileText className="h-5 w-5 text-primary shrink-0" />
            <h1 className="text-sm font-bold text-foreground truncate">Resumo de Cotação</h1>
          </Link>
          <div className="ml-auto shrink-0 pl-2 flex items-center gap-2">
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      variant="default"
                      className="gap-1.5 text-xs"
                      onClick={handleExportPDF}
                      disabled={!!exportDisabledReason}
                    >
                      <FileDown className="h-3.5 w-3.5" /> Exportar PDF
                    </Button>
                  </span>
                </TooltipTrigger>
                {exportDisabledReason && <TooltipContent>{exportDisabledReason}</TooltipContent>}
              </Tooltip>
            </TooltipProvider>
            <SortableNav current="resumo-cotacao" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-6">
        {!isSaved && (
          <Card className="mb-4 border-amber-500/50">
            <CardContent className="py-3 text-sm text-amber-700 dark:text-amber-300">
              Este relatório fica disponível para uma precificação salva. Abra uma precificação salva para visualizar os dados completos.
            </CardContent>
          </Card>
        )}

        <div
          id="resumo-cotacao-printable"
          className="bg-white rounded-md shadow-sm p-10 mx-auto"
          style={{ width: "210mm", minHeight: "297mm", color: "#000" }}
        >
          {/* Cabeçalho */}
          <div className="flex items-start justify-between mb-8">
            <img src={selbettiLogo.url} alt="Selbetti" style={{ height: 48, width: "auto" }} crossOrigin="anonymous" />
            <div className="text-3xl font-bold" style={{ color: "#000" }}>Resumo de Cotação</div>
          </div>

          {/* Metadados */}
          <div className="grid grid-cols-2 gap-x-12 gap-y-2 mb-8">
            <Field label="Cliente:" value={commercial?.client_name} />
            <Field label="Gerente de Contas:" value={commercial?.account_manager} />
            <Field label="Data:" value={dataEmissao} />
            <Field label="Especialista:" value={commercial?.bu_specialist} />
            <Field label="Contrato:" value={commercial?.contract_term} />
            <Field label="Arquiteto:" value={commercial?.bu_architect} />
            <Field label="Nº da Oportunidade:" value={commercial?.salesforce_code} />
            <Field label="Nº da Cotação:" value={commercial?.quote_code} />
          </div>

          {/* Taxas e Impostos */}
          <h2 className="text-center text-xl font-bold mb-4" style={{ color: "#000" }}>Taxas e Impostos</h2>
          <div className="grid grid-cols-2 gap-x-12 gap-y-2 mb-8">
            <Field label="Investimento Total:" value={formatBRL(investimentoTotal)} />
            <Field label="Impostos:" value={formatBRL(impostos)} />
            <Field label="Receita por Mês:" value={formatBRL(receitaMes)} />
            <Field label="Comercial:" value={formatBRL(comercial)} />
            <Field label="Financeiro:" value={formatBRL(financeiro)} />
            <Field label="Suporte / Atendimento:" value={formatBRL(suporteAtendimento)} />
            <Field label="Administrativo:" value={formatBRL(administrativo)} />
          </div>

          {/* Rentabilidade */}
          <h2 className="text-center text-xl font-bold mb-4" style={{ color: "#000" }}>Rentabilidade</h2>
          <div className="grid grid-cols-2 mb-10">
            <div className="text-center">
              <div className="text-3xl font-bold" style={{ color: "#000" }}>{formatBRL(liquido)}</div>
              <div className="text-base" style={{ color: "#000" }}>Líquido</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold" style={{ color: "#000" }}>{liquidoPerc.toFixed(2).replace(".", ",")}%</div>
              <div className="text-base" style={{ color: "#000" }}>Percentual</div>
            </div>
          </div>

          {/* Resumo da oferta */}
          <table className="w-full text-xs border-collapse" style={{ color: "#000" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc" }}>
                <th className="border border-slate-300 px-2 py-2 text-left font-bold">Item</th>
                <th className="border border-slate-300 px-2 py-2 text-left font-bold">Camada da Oferta</th>
                <th className="border border-slate-300 px-2 py-2 text-right font-bold">Reativos (ch/mês)</th>
                <th className="border border-slate-300 px-2 py-2 text-right font-bold">Rotinas Preventivas (ch/mês)</th>
                <th className="border border-slate-300 px-2 py-2 text-right font-bold">GMUDs (ch/mês)</th>
                <th className="border border-slate-300 px-2 py-2 text-right font-bold">Horas N3 / TMA / Owner</th>
                <th className="border border-slate-300 px-2 py-2 text-right font-bold">Investimento Mensal</th>
              </tr>
            </thead>
            <tbody>
              {layerRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="border border-slate-300 px-2 py-3 text-center" style={{ color: "#000" }}>
                    Nenhuma camada selecionada.
                  </td>
                </tr>
              )}
              {layerRows.map((r, i) => (
                <Fragment key={r.camada}>
                  <tr>
                    <td className="border border-slate-300 px-2 py-1.5">{i + 1}</td>
                    <td className="border border-slate-300 px-2 py-1.5">{r.camada}</td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right">{formatNumber(r.reativos)}</td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right">{formatNumber(r.rotinas)}</td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right">{formatNumber(r.gmuds)}</td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right">{formatNumber(r.horasN3)}</td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right">{formatBRL(r.valor)}</td>
                  </tr>
                  {r.nota && (
                    <tr>
                      <td colSpan={7} className="border border-slate-300 px-2 py-1.5 text-[11px]" style={{ color: "#000" }}>
                        <span className="font-semibold">Composição {r.camada}:</span> {r.nota}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {horasN3 > 0 && (() => {
                const horasAtend = computed.horasAtendimentoN3 || 0;
                const horasTam = (horasN3 * pctTam) / 100;
                const horasOwner = (horasN3 * pctOwner) / 100;
                const horasLivre = Math.max(0, horasN3 - horasAtend - horasTam - horasOwner);
                const pct = (h: number) => (horasN3 > 0 ? (h / horasN3) * 100 : 0);
                return (
                  <tr>
                    <td colSpan={7} className="border border-slate-300 px-2 py-1.5 text-[11px]" style={{ color: "#000" }}>
                      <span className="font-semibold">Distribuição das Horas N3 ({formatNumber(horasN3)}h/mês):</span>{" "}
                      Chamados N3 {formatNumber(horasAtend)}h ({pct(horasAtend).toFixed(0)}%) ·{" "}
                      TAM {formatNumber(horasTam)}h ({pctTam}%) ·{" "}
                      Owner {formatNumber(horasOwner)}h ({pctOwner}%) ·{" "}
                      Horas técnicas {formatNumber(horasLivre)}h ({pct(horasLivre).toFixed(0)}%)
                    </td>
                  </tr>
                );
              })()}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: "#f8fafc" }}>
                <td colSpan={6} className="border border-slate-300 px-2 py-2 text-right font-bold">TOTAL (Receita Mensal):</td>
                <td className="border border-slate-300 px-2 py-2 text-right font-bold">
                  {formatBRL(layerRows.reduce((a, r) => a + r.valor, 0))}
                </td>
              </tr>
            </tfoot>
          </table>

          <div className="mt-8 text-center text-[10px]" style={{ color: "#000" }}>
            Documento gerado por IT Pricing Hub — {new Date().toLocaleString("pt-BR")}
          </div>
        </div>
      </main>
    </div>
  );
}