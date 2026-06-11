import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, FileDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useITSMContext } from "@/contexts/ITSMContext";
import { formatBRL, formatNumber } from "@/hooks/useITSMCalculator";
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

  const [commercial, setCommercial] = useState<CommercialRow | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!activePreset.activeId) { setCommercial(null); return; }
      const { data } = await supabase
        .from("pricing_presets")
        .select("client_name, account_manager, bu_specialist, bu_architect, contract_term, salesforce_code, quote_code, created_at")
        .eq("id", activePreset.activeId)
        .maybeSingle();
      if (!cancel) setCommercial((data as unknown as CommercialRow) ?? null);
    })();
    return () => { cancel = true; };
  }, [activePreset.activeId]);

  const [rotinas] = usePersistentState<Rotina[]>("gestao-ti:rotinas", ROTINAS_DEFAULT);
  const [gmuds] = usePersistentState<Gmud[]>("gestao-ti:gmuds", GMUDS_DEFAULT);
  const [n3Cortes] = usePersistentState<[number, number]>("gestao-ti:smartPerf:n3Cortes", [33, 66]);

  // ===== Composição financeira (mesma base do Painel financeiro) =====
  const comp = results.composicaoPreco;
  const meses = parseMonths(commercial?.contract_term);
  const receitaMes = comp.precoVenda || 0;
  const investimentoTotal = receitaMes * meses;
  const impostos = (comp.pis || 0) + (comp.cofins || 0) + (comp.iss || 0) + (comp.irpjCsll || 0);
  const comercial = comp.comissao || 0;
  const financeiro = comp.encFinanc || 0;
  // "Suporte / Atendimento" = custo direto de operação humana (N1+N2+N3 + Field)
  const suporteAtendimento =
    (results.custoN1 || 0) + (results.custoN2 || 0) + (results.custoN3 || 0) +
    (results.fieldService?.total || 0);
  // "Administrativo" = restante do custo operacional (ferramentas, monitoramento etc.)
  const administrativo = Math.max(0, (results.custoTotalOperacao || 0) - suporteAtendimento);
  const liquido = comp.lucro || 0;
  const liquidoPerc = receitaMes > 0 ? (liquido / receitaMes) * 100 : 0;

  // ===== Tabela: camadas contratadas × componentes principais =====
  const hasInfraInventory =
    (state.qtdServidores || 0) + (state.qtdAtivosRede || 0) +
    (state.qtdBancosDados || 0) + (state.qtdSistemas || 0) > 0;

  // Rotinas preventivas — total de CACs (chamados/mês) com base no inventário.
  const rotinasTotal = useMemo(() => {
    const inv = {
      qtdUsuarios: state.qtdUsuarios, qtdEquipamentos: state.qtdEquipamentos,
      qtdServidores: state.qtdServidores, qtdAtivosRede: state.qtdAtivosRede,
      qtdBancosDados: state.qtdBancosDados, qtdSistemas: state.qtdSistemas,
    };
    const flags: ComplexFlags = {
      complexVirtualizacaoCluster: state.complexVirtualizacaoCluster,
      complexBancoDadosHA: state.complexBancoDadosHA,
      complexFirewallHA: state.complexFirewallHA,
      complexMultiSites: state.complexMultiSites,
      complexSiteBackup: state.complexSiteBackup,
      complexHibridoCloudOnPrem: state.complexHibridoCloudOnPrem,
      complexOperacao24x7: state.complexOperacao24x7,
      complexErpMercado: state.complexErpMercado,
    };
    let total = 0;
    rotinas.forEach((r) => {
      const mult = rotinaMultiplicador(r, inv, flags);
      total += r.chamadosMes * mult;
    });
    return total;
  }, [rotinas, state]);

  // GMUDs — totais Operation + Performance
  const gmudData = useMemo(() => {
    const input = {
      custoPorChamadoN2: results.custoPorChamadoN2,
      tempoMedioChamadoN3: state.tempoMedioChamadoN3,
      valorHoraN3: state.valorHoraN3,
      percN2: state.percGmudN2 ?? 70,
      percN3: state.percGmudN3 ?? 30,
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
  }, [gmuds, results.custoPorChamadoN2, state.tempoMedioChamadoN3, state.valorHoraN3, state.percGmudN2, state.percGmudN3]);

  // Horas N3 — Tamanho, Owner e Livre (cortes Smart Performance)
  const [corteTam, corteOwner] = n3Cortes;
  const pctTam = corteTam;
  const pctOwner = Math.max(0, corteOwner - corteTam);
  const pctLivre = Math.max(0, 100 - corteOwner);
  const horasN3 = state.horasN3Mensais || 0;

  type Row = { camada: string; reativos: number; rotinas: number; gmuds: number; horasN3: number; valor: number };
  const layerRows: Row[] = [];
  if (state.tierMonitor && hasInfraInventory) {
    const sm = results.smartMonitor;
    layerRows.push({
      camada: "Smart Monitor",
      reativos: sm.chamadosAtivos || 0,
      rotinas: 0,
      gmuds: 0,
      horasN3: sm.horasN3 || 0,
      valor: (sm.custoMonitoramento || 0) + (sm.custoN1Alocado || 0) + (sm.custoN3 || 0),
    });
  }
  if (state.tierFlow) {
    const sf = results.smartFlow;
    layerRows.push({
      camada: "Smart Flow",
      reativos: sf.chamadosAtivos || 0,
      rotinas: 0,
      gmuds: 0,
      horasN3: sf.horasN3Manut ? (sf.horasN3Manut as number) : 0,
      valor: (sf.custoMonitoramento || 0) + (sf.custoN1Alocado || 0) + (sf.custoAtendentes || 0) + (sf.custoProxys || 0) + (sf.custoN3 || 0) + (sf.custoN3Manut || 0),
    });
  }
  const showOperation = state.tierOperation || gmudData.operation.chamados > 0;
  if (showOperation) {
    layerRows.push({
      camada: "Smart Operation",
      reativos: (results.volumeN1 || 0) + (results.volumeN2 || 0),
      rotinas: 0,
      gmuds: gmudData.operation.chamados,
      horasN3: 0,
      valor: (results.custoN1 || 0) + (results.custoN2 || 0) + gmudData.operation.custo,
    });
  }
  const showPerformance =
    state.tierPerformance ||
    rotinasTotal > 0 ||
    horasN3 > 0 ||
    gmudData.performance.chamados > 0;
  if (showPerformance) {
    layerRows.push({
      camada: "Smart Performance",
      reativos: results.volumeN3 || 0,
      rotinas: rotinasTotal,
      gmuds: gmudData.performance.chamados,
      horasN3: horasN3,
      valor: (results.custoN3 || 0) + gmudData.performance.custo,
    });
  }
  if (state.tierEnterprise) {
    layerRows.push({
      camada: "Smart Enterprise",
      reativos: 0, rotinas: 0, gmuds: 0, horasN3: 0,
      valor: 0,
    });
  }

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
                <tr key={r.camada}>
                  <td className="border border-slate-300 px-2 py-1.5">{i + 1}</td>
                  <td className="border border-slate-300 px-2 py-1.5">{r.camada}</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-right">{formatNumber(r.reativos)}</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-right">{formatNumber(r.rotinas)}</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-right">{formatNumber(r.gmuds)}</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-right">{formatNumber(r.horasN3)}</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-right">{formatBRL(r.valor)}</td>
                </tr>
              ))}
              {horasN3 > 0 && (
                <tr>
                  <td colSpan={7} className="border border-slate-300 px-2 py-1.5 text-[11px]" style={{ color: "#000" }}>
                    <span className="font-semibold">Distribuição das Horas N3:</span>{" "}
                    Tamanho/TMA {formatNumber(horasN3 * pctTam / 100)}h ({pctTam}%) ·{" "}
                    Owner {formatNumber(horasN3 * pctOwner / 100)}h ({pctOwner}%) ·{" "}
                    Livre {formatNumber(horasN3 * pctLivre / 100)}h ({pctLivre}%)
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: "#f8fafc" }}>
                <td colSpan={6} className="border border-slate-300 px-2 py-2 text-right font-bold">TOTAL:</td>
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