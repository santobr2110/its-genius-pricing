import { useEffect, useMemo, useState } from "react";
import { useITSMContext } from "@/contexts/ITSMContext";
import { computeTierPricing, gerencialBucket as gerencialBucketFor } from "@/lib/tierPricing";
import { computeN3Distribution, resolveN3Alloc } from "@/lib/n3Distribution";
import { usePricingApproval } from "@/hooks/usePricingApproval";
import { supabase } from "@/integrations/supabase/client";
import { formatNumber, formatBRL } from "@/hooks/useITSMCalculator";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ClipboardList, Crown,
  Clock, ListChecks, CheckCircle2, Circle, Sparkles, Server, Network,
  Database, Shield, Rocket, TrendingUp, Wrench, Star, Activity, FileDown,
  Medal, Award, Trophy, Gem, Workflow, Presentation, ChevronDown,
} from "lucide-react";
import {
  MonitorIcon as TierMonitorIcon,
  FlowIcon as TierFlowIcon,
  OperationIcon as TierOperationIcon,
  PerformanceIcon as TierPerformanceIcon,
  EnterpriseIcon as TierEnterpriseIcon,
  FieldServiceIcon as TierFieldIcon,
} from "@/components/itsm/TierIcons";
import SortableNav from "@/components/SortableNav";
import BackHomeButton from "@/components/BackHomeButton";
import { Link } from "react-router-dom";
import { usePersistentState } from "@/hooks/usePersistentState";
import {
  ROTINAS_DEFAULT, rotinaMultiplicador, COMPLEX_FLAG_KEYS,
  normalizeLegacyRotina,
  type ComplexFlags, type Rotina,
} from "@/data/rotinas";
import {
  ESCOPO_DEFAULT, ESCOPO_STORAGE_KEY, CAMADA_LABEL,
  RESTRICOES_GERAIS_DEFAULT, RESTRICOES_GERAIS_STORAGE_KEY,
  ITENS_ADICIONAIS_DEFAULT, ITENS_ADICIONAIS_STORAGE_KEY,
  type EscopoProposicao, type EscopoCamada, type CamadaKey, type ItemAdicional,
} from "@/data/escopoProposicao";
import {
  exportarApresentacao,
  type ApresentacaoPayload,
  type CamadaSlideData,
  type ItemAdicionalSlide,
  type RotinaGrupoSlide,
  type RotinaSlideItem,
  type RecursoSlideItem,
  type HorasN3Slide,
  type FieldSlideData,
} from "@/lib/exportarApresentacao";
import { exportarApresentacaoTemplate } from "@/lib/exportarApresentacaoTemplate";
import { toast } from "sonner";
import {
  GMUDS_DEFAULT, bucketGmuds, computeGmud,
  type Gmud, type GmudComputed,
} from "@/data/gmuds";
import { GitBranch, PackagePlus } from "lucide-react";
import WriteFence from "@/components/auth/WriteFence";

function normalizeOsRotina(r: Rotina): Rotina {
  const normalized = normalizeLegacyRotina(r);
  const isOs = normalized.grupo.toLowerCase().includes("sistema operacional");
  if (!isOs) return normalized;
  return { ...normalized, ativo: "Servidor", unidade: "Servidor (Ambiente)", abrangencia: "Ambiente" };
}

const TIER_THEMES: Record<string, { ring: string; bg: string; chip: string; icon: string; bar: string; badge: string; check: string; glow: string; valueGrad: string; blob1: string; blob2: string }> = {
  // Bronze — Smart Monitor
  bronze:  { ring: "border-amber-500/70 dark:border-amber-700/70",   bg: "from-amber-100/80 via-card to-orange-100/40 dark:from-amber-950/60 dark:via-card dark:to-orange-950/30", chip: "bg-gradient-to-r from-amber-600/25 to-orange-700/25 text-amber-800 dark:text-amber-200",  icon: "bg-gradient-to-br from-amber-500 via-orange-600 to-amber-800 text-white",   bar: "from-amber-400 via-orange-500 to-amber-700",  badge: "bg-gradient-to-r from-amber-600 to-orange-700",  check: "text-amber-700 dark:text-amber-300", glow: "shadow-amber-700/30", valueGrad: "from-amber-700 to-orange-700 dark:from-amber-300 dark:to-orange-300", blob1: "bg-amber-500/30", blob2: "bg-orange-600/20" },
  // Steel — Smart Flow
  steel:   { ring: "border-sky-500/70 dark:border-sky-600/70",       bg: "from-sky-100/80 via-card to-cyan-100/40 dark:from-sky-950/60 dark:via-card dark:to-cyan-950/30",          chip: "bg-gradient-to-r from-sky-600/25 to-cyan-700/25 text-sky-800 dark:text-sky-200",          icon: "bg-gradient-to-br from-sky-500 via-cyan-600 to-sky-800 text-white",         bar: "from-sky-400 via-cyan-500 to-sky-700",        badge: "bg-gradient-to-r from-sky-600 to-cyan-700",       check: "text-sky-700 dark:text-sky-300",     glow: "shadow-sky-700/30",   valueGrad: "from-sky-700 to-cyan-700 dark:from-sky-300 dark:to-cyan-300",         blob1: "bg-sky-500/30",   blob2: "bg-cyan-600/20" },
  // Silver — Smart Operation
  silver:  { ring: "border-slate-400/70 dark:border-slate-500/70",   bg: "from-slate-100/90 via-card to-zinc-100/50 dark:from-slate-800/60 dark:via-card dark:to-zinc-900/40",     chip: "bg-gradient-to-r from-slate-400/25 to-zinc-500/25 text-slate-700 dark:text-slate-200",    icon: "bg-gradient-to-br from-slate-300 via-slate-400 to-slate-600 text-slate-900",  bar: "from-slate-300 via-zinc-300 to-slate-500",   badge: "bg-gradient-to-r from-slate-500 to-zinc-600",     check: "text-slate-600 dark:text-slate-300", glow: "shadow-slate-500/30", valueGrad: "from-slate-600 to-zinc-700 dark:from-slate-200 dark:to-zinc-200",     blob1: "bg-slate-400/30", blob2: "bg-zinc-400/20" },
  // Gold — Smart Performance
  gold:    { ring: "border-yellow-500/80 dark:border-yellow-500/70", bg: "from-yellow-100/80 via-card to-amber-100/50 dark:from-yellow-950/60 dark:via-card dark:to-amber-950/40", chip: "bg-gradient-to-r from-yellow-500/25 to-amber-500/25 text-yellow-800 dark:text-yellow-200", icon: "bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 text-yellow-950", bar: "from-yellow-300 via-amber-400 to-yellow-600", badge: "bg-gradient-to-r from-yellow-500 to-amber-600",   check: "text-yellow-700 dark:text-yellow-300", glow: "shadow-yellow-500/40", valueGrad: "from-yellow-600 to-amber-700 dark:from-yellow-300 dark:to-amber-300", blob1: "bg-yellow-400/35", blob2: "bg-amber-500/25" },
  // Diamond — Smart Enterprise
  diamond: { ring: "border-cyan-400/80 dark:border-cyan-400/70",    bg: "from-cyan-100/80 via-card to-sky-100/40 dark:from-cyan-950/60 dark:via-card dark:to-sky-950/30",          chip: "bg-gradient-to-r from-cyan-400/25 to-sky-500/25 text-cyan-800 dark:text-cyan-200",         icon: "bg-gradient-to-br from-cyan-200 via-sky-300 to-blue-500 text-cyan-950",   bar: "from-cyan-300 via-sky-400 to-blue-500",   badge: "bg-gradient-to-r from-cyan-500 to-sky-600",       check: "text-cyan-700 dark:text-cyan-300", glow: "shadow-cyan-500/40", valueGrad: "from-cyan-600 to-blue-600 dark:from-cyan-300 dark:to-sky-300",       blob1: "bg-cyan-400/35", blob2: "bg-sky-400/25" },
  // Field Service de Microinformática — sub-oferta (mantém âmbar/laranja distinto)
  amber:   { ring: "border-amber-300/70 dark:border-amber-600/60",  bg: "from-amber-100/80 via-card to-orange-50/40 dark:from-amber-950/50 dark:via-card dark:to-orange-950/20",  chip: "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-700 dark:text-amber-300",   icon: "bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-white",  bar: "from-amber-400 via-orange-400 to-rose-500",   badge: "bg-gradient-to-r from-amber-500 to-orange-500",   check: "text-amber-600 dark:text-amber-400", glow: "shadow-amber-500/30", valueGrad: "from-amber-600 to-orange-600 dark:from-amber-300 dark:to-orange-300", blob1: "bg-amber-400/30", blob2: "bg-orange-400/20" },
};

const TIER_ALIAS: Record<string, { name: string; icon: React.ElementType }> = {
  bronze:  { name: "Bronze",  icon: Medal  },
  steel:   { name: "Steel",   icon: Workflow },
  silver:  { name: "Silver",  icon: Award  },
  gold:    { name: "Gold",    icon: Trophy },
  diamond: { name: "Diamond", icon: Gem    },
};

export default function Detalhamento() {
  const { state, results, activePreset, extrasOperacionais } = useITSMContext();
  const isSavedPricing = !!activePreset.activeId;
  const approval = usePricingApproval({
    offering: "smart-ito",
    targetType: "pricing_preset",
    targetId: activePreset.activeId ?? null,
    rentPct: Number(state.lucroPerc ?? 0),
  });
  // Bloqueio de exportação: precificação não salva OU rentabilidade em faixa
  // que exige aprovação e que ainda não foi aprovada (ex.: margem < 15%).
  const approvalBlocked =
    approval.loading || (approval.requiresApproval && approval.effectiveStatus !== "approved");
  const exportDisabledReason = !isSavedPricing
    ? "Salve a precificação para habilitar a exportação"
    : approval.loading
    ? "Verificando status de aprovação..."
    : approvalBlocked
    ? `Exportação bloqueada: rentabilidade de ${Number(state.lucroPerc ?? 0).toFixed(1)}% requer aprovação (${approval.statusLabel})`
    : undefined;
  const exportBlocked = !isSavedPricing || approvalBlocked;
  const sm = results.smartMonitor;
  const sf = results.smartFlow;
  const fs = results.fieldService;

  // Dados de cadastro da precificação (via preset ativo)
  type PresetCadastro = {
    name: string | null;
    contract_term: string | null;
    salesforce_code: string | null;
    quote_code: string | null;
    client_name: string | null;
    account_manager: string | null;
    bu_specialist: string | null;
    bu_architect: string | null;
    created_at: string | null;
    updated_at: string | null;
  };
  const [presetCadastro, setPresetCadastro] = useState<PresetCadastro | null>(null);
  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!activePreset.activeId) { setPresetCadastro(null); return; }
      const { data } = await supabase
        .from("pricing_presets")
        .select("name, contract_term, salesforce_code, quote_code, client_name, account_manager, bu_specialist, bu_architect, created_at, updated_at")
        .eq("id", activePreset.activeId)
        .maybeSingle();
      if (!cancel) setPresetCadastro((data as any) ?? null);
    })();
    return () => { cancel = true; };
  }, [activePreset.activeId]);
  const contractTerm = presetCadastro?.contract_term ?? null;
  const mesesContrato = (() => {
    const m = String(contractTerm ?? "").match(/(\d+)/);
    return m ? Number(m[1]) : 12;
  })();

  // Quando não há ativos de Cloud/Datacenter no inventário, o Smart Monitor
  // não faz parte da proposta (ainda que esteja marcado nas configurações).
  const hasInfraInventory =
    (state.qtdServidores || 0) + (state.qtdAtivosRede || 0) +
    (state.qtdBancosDados || 0) + (state.qtdSistemas || 0) > 0;
  const monitorVisible = state.tierMonitor && hasInfraInventory;
  const flowVisible = state.tierFlow;
  // Quando Monitor e Flow estão ativos simultaneamente, apresentamos as
  // duas camadas como um bloco único — somando descrições/itens (sem
  // duplicações) e preservando os recursos, inventário e valores do Flow
  // como mandatórios.
  const unifiedMonitorFlow = monitorVisible && flowVisible;
  // Hierarquia das camadas Smart. Rotinas preventivas (não gerenciais) também
  // são cumulativas entre as camadas: uma rotina de Monitor permanece quando
  // apenas Flow/Operation/Performance estiver ativo, e cada rotina é exibida
  // uma única vez — na camada displayable mais baixa cuja ordem seja ≥ à
  // oferta vinculada da rotina.
  const PREVENT_TIER_ORDER = { Monitor: 1, Flow: 2, Operation: 3, Performance: 4 } as const;
  type PreventTier = keyof typeof PREVENT_TIER_ORDER;
  const displayableForPrevent: PreventTier[] = [];
  // Bloco Monitor só é renderizado quando monitorVisible && !unifiedMonitorFlow.
  if (monitorVisible && !flowVisible) displayableForPrevent.push("Monitor");
  if (flowVisible) displayableForPrevent.push("Flow");
  if (state.tierOperation) displayableForPrevent.push("Operation");
  if (state.tierPerformance) displayableForPrevent.push("Performance");
  const preventBucket = (oferta: string | undefined): PreventTier | null => {
    if (!oferta || !(oferta in PREVENT_TIER_ORDER)) return null;
    const min = PREVENT_TIER_ORDER[oferta as PreventTier];
    for (const t of displayableForPrevent) {
      if (PREVENT_TIER_ORDER[t] >= min) return t;
    }
    return null;
  };
  const dedupLines = (lines: string[]): string[] => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const s of lines) {
      const k = (s || "").trim().toLowerCase().replace(/\s+/g, " ");
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(s.trim());
    }
    return out;
  };
  const mergeDescricoes = (...descs: string[]): string => {
    const sentences = descs
      .flatMap((d) => (d || "").split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean));
    return dedupLines(sentences).join(" ");
  };

  // Camada mais alta ativa = dominante visual
  const dominantColor =
    state.tierEnterprise ? "diamond"
    : state.tierPerformance ? "gold"
    : state.tierOperation ? "silver"
    : flowVisible ? "steel"
    : monitorVisible ? "bronze"
    : null;

  // Nome final da oferta = camada mais alta ativa.
  // As demais camadas são apresentadas como componentes desta oferta.
  const DOMINANT_OFFER: Record<string, { name: string; tagline: string }> = {
    bronze:  { name: "ITO Smart Monitor",     tagline: "Monitoramento da infraestrutura" },
    steel:   { name: "ITO Smart Flow",        tagline: "Monitoramento integrado ao ITSM com atendentes dedicados" },
    silver:  { name: "ITO Smart Operation",   tagline: "Service Desk gerenciado com monitoramento incluso" },
    gold:    { name: "ITO Smart Performance", tagline: "Operação completa com rotinas avançadas e horas N3" },
    diamond: { name: "ITO Smart Enterprise",  tagline: "Governança executiva sobre toda a operação de TI" },
  };
  const dominantOffer = dominantColor ? DOMINANT_OFFER[dominantColor] : null;
  const componentNames: string[] = [];
  if (unifiedMonitorFlow) {
    componentNames.push("Monitor + Flow");
  } else {
    if (monitorVisible) componentNames.push("Monitor");
    if (flowVisible) componentNames.push("Flow");
  }
  if (state.tierOperation) componentNames.push("Operation" + (state.tierFieldOperation ? " + Field Service de Microinformática" : ""));
  if (state.tierPerformance) componentNames.push("Performance");
  if (state.tierEnterprise) componentNames.push("Enterprise");

  const handleExportPDF = async () => {
    if (exportBlocked) {
      toast.error(exportDisabledReason ?? "Exportação bloqueada.");
      return;
    }
    const el = document.getElementById("proposicao-printable");
    if (!el) return;
    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    const PAGE_W = 210;
    const MARGIN = 10;
    const CONTENT_W = PAGE_W - MARGIN * 2;
    const SECTION_GAP = 4;
    const pageBg = "#ffffff";

    const applyExportCloneFixes = (doc: Document) => {
      const printable = doc.getElementById("proposicao-printable");
      if (printable) {
        printable.classList.add("pdf-export-background");
        printable.classList.add("report-anexo");
        printable.style.width = `${el.scrollWidth}px`;
        printable.style.maxWidth = `${el.scrollWidth}px`;
        printable.style.background = pageBg;
        printable.style.color = "#000000";
        printable.style.overflow = "visible";

        // Isola o relatório dentro do clone: html2canvas considera elementos
        // sticky/fixed sobrepostos ao alvo. Ocultar todos os irmãos da cadeia
        // do #proposicao-printable impede que o header/banners da aplicação
        // cubram o primeiro bloco (onde está "Proposta Comercial").
        let current: HTMLElement | null = printable;
        while (current && current.parentElement && current.parentElement !== doc.body) {
          const parent = current.parentElement;
          Array.from(parent.children).forEach((sibling) => {
            if (sibling !== current && sibling instanceof HTMLElement) {
              sibling.style.display = "none";
              sibling.style.visibility = "hidden";
              sibling.style.pointerEvents = "none";
            }
          });
          current = parent;
        }
      }
      doc.querySelectorAll<HTMLElement>(".transition-all, .transition-transform, [class*='scale-'], [class*='rotate-']").forEach((node) => {
        node.style.transition = "none";
        node.style.transform = "none";
      });
      doc.querySelectorAll<HTMLElement>("body header").forEach((header) => {
        if (!printable?.contains(header)) {
          header.style.display = "none";
          header.style.visibility = "hidden";
          header.style.pointerEvents = "none";
        }
      });
      doc.querySelectorAll<HTMLElement>(".text-transparent, .bg-clip-text").forEach((node) => {
        node.classList.remove("text-transparent");
        node.style.background = "none";
        node.style.backgroundImage = "none";
        node.style.webkitBackgroundClip = "border-box";
        node.style.backgroundClip = "border-box";
        node.style.webkitTextFillColor = "#000000";
        node.style.color = "#000000";
      });
      // html2canvas frequently mis-mensures inline SVGs when width/height come
      // only via CSS (e.g. Tailwind h-3 w-3). Copy the computed pixel size to
      // the SVG's width/height attributes so the icons render at the right
      // size in the PDF instead of collapsing or blowing up.
      if (printable) {
        const sourceSvgs = Array.from(el.querySelectorAll<SVGElement>("svg"));
        const clonedSvgs = Array.from(printable.querySelectorAll<SVGElement>("svg"));
        clonedSvgs.forEach((svg, i) => {
          const src = sourceSvgs[i];
          if (!src) return;
          const rect = src.getBoundingClientRect();
          const w = Math.max(1, Math.round(rect.width));
          const h = Math.max(1, Math.round(rect.height));
          svg.setAttribute("width", String(w));
          svg.setAttribute("height", String(h));
          (svg as unknown as HTMLElement).style.width = `${w}px`;
          (svg as unknown as HTMLElement).style.height = `${h}px`;
          (svg as unknown as HTMLElement).style.flexShrink = "0";
          (svg as unknown as HTMLElement).style.display = "inline-block";
          (svg as unknown as HTMLElement).style.verticalAlign = "middle";
        });

        printable.querySelectorAll<HTMLElement>(".report-section, [data-pdf-section], [data-tier]").forEach((section) => {
          section.style.breakInside = "avoid";
          section.style.pageBreakInside = "avoid";
          section.style.overflow = "visible";
          section.style.transform = "none";
          section.style.boxSizing = "border-box";
        });

        printable.querySelectorAll<HTMLElement>("[data-tier]").forEach((tier) => {
          tier.style.border = "2px solid #000000";
          tier.style.borderRadius = "12px";
          tier.style.background = "#ffffff";
          tier.style.backgroundImage = "none";
          tier.style.boxShadow = "none";
          tier.style.outline = "none";
          tier.querySelectorAll<HTMLElement>(".pointer-events-none").forEach((decorative) => {
            decorative.style.display = "none";
          });
        });

        // The "Proposta Comercial" kicker and the "Composta por" pills rely on
        // flex + gap, which html2canvas can collapse. Force explicit sizes and
        // no text wrapping inside each pill so the export keeps the same shape.
        printable.querySelectorAll<HTMLElement>(".report-kicker").forEach((node) => {
          node.style.display = "inline-block";
          node.style.justifyContent = "center";
          node.style.padding = "6px 16px";
          node.style.border = "1px solid #000";
          node.style.borderRadius = "999px";
          node.style.background = "#ffffff";
          node.style.lineHeight = "1.2";
          node.style.whiteSpace = "nowrap";
          node.style.minHeight = "0";
          node.querySelectorAll<HTMLElement>("span").forEach((s) => {
            s.style.display = "inline-block";
            s.style.color = "#000";
            (s.style as unknown as Record<string, string>)["webkitTextFillColor"] = "#000";
            s.style.fontSize = "10px";
            s.style.letterSpacing = "0.18em";
            s.style.fontWeight = "700";
            s.style.textTransform = "uppercase";
            s.style.verticalAlign = "middle";
            s.style.whiteSpace = "nowrap";
          });
        });

        // "Composta por" pills — same treatment.
        printable.querySelectorAll<HTMLElement>(".composta-list").forEach((list) => {
          list.style.display = "flex";
          list.style.flexWrap = "wrap";
          list.style.alignItems = "center";
          list.style.justifyContent = "center";
          list.style.gap = "8px";
          list.style.overflow = "visible";
        });
        printable.querySelectorAll<HTMLElement>(".composta-label, .composta-item").forEach((node) => {
          node.style.display = "inline-flex";
          node.style.alignItems = "center";
          node.style.flex = "0 0 auto";
          node.style.whiteSpace = "nowrap";
          node.style.breakInside = "avoid";
        });
        printable.querySelectorAll<HTMLElement>(".composta-pill").forEach((pill) => {
          pill.style.display = "inline-flex";
          pill.style.alignItems = "center";
          pill.style.gap = "0";
          pill.style.flex = "0 0 auto";
          pill.style.padding = "5px 10px";
          pill.style.border = "1px solid #000";
          pill.style.borderRadius = "999px";
          pill.style.background = "#ffffff";
          pill.style.marginRight = "0";
          pill.style.lineHeight = "1";
          pill.style.minHeight = "24px";
          pill.style.whiteSpace = "nowrap";
          pill.style.breakInside = "avoid";
          pill.querySelectorAll<HTMLElement>(".composta-dot").forEach((dot) => {
            dot.style.display = "inline-block";
            dot.style.width = "6px";
            dot.style.height = "6px";
            dot.style.minWidth = "6px";
            dot.style.marginRight = "6px";
            dot.style.border = "1px solid #000";
            dot.style.borderRadius = "999px";
            dot.style.background = "#000";
          });
          pill.querySelectorAll<HTMLElement>("svg").forEach((s) => {
            s.style.width = "12px";
            s.style.height = "12px";
            s.style.flex = "0 0 12px";
            s.style.marginRight = "0";
            s.style.verticalAlign = "middle";
          });
          pill.querySelectorAll<HTMLElement>("span").forEach((s) => {
            s.style.whiteSpace = "nowrap";
          });
        });

        printable.querySelectorAll<HTMLElement>(".tier-tagline, .report-description").forEach((node) => {
          node.style.lineHeight = "1.45";
          node.style.wordBreak = "normal";
          node.style.overflowWrap = "normal";
          node.style.hyphens = "none";
        });
      }
    };

    const originalScroll = { x: window.scrollX, y: window.scrollY };
    window.scrollTo(0, 0);

    try {
      // O anexo é para assinatura digital, não para impressão. Capturamos cada
      // bloco lógico separadamente (evita desformatar bordas/pílulas) e montamos
      // tudo em uma única página contínua (sem quebra entre camadas).
      const exportWidth = Math.max(el.scrollWidth, el.clientWidth);
      const exportHeight = Math.max(el.scrollHeight, el.clientHeight);
      const sections = Array.from(el.children).filter((node): node is HTMLElement => {
        return node instanceof HTMLElement && node.getBoundingClientRect().height > 0;
      });
      const exportSections = sections.length > 0 ? sections : [el];
      const renderedSections: { canvas: HTMLCanvasElement; heightMM: number }[] = [];

      for (const section of exportSections) {
        const sectionHeight = Math.max(section.scrollHeight, section.getBoundingClientRect().height, 1);
        const renderScale = Math.max(1, Math.min(2, 24000 / sectionHeight));
        const canvas = await html2canvas(section, {
          scale: renderScale,
          useCORS: true,
          backgroundColor: pageBg,
          windowWidth: exportWidth,
          windowHeight: exportHeight,
          scrollX: 0,
          scrollY: 0,
          onclone: applyExportCloneFixes,
        });

        if (canvas.width <= 0 || canvas.height <= 0) continue;
        renderedSections.push({
          canvas,
          heightMM: (canvas.height * CONTENT_W) / canvas.width,
        });
      }

      if (renderedSections.length === 0) return;

      const contentHeight = renderedSections.reduce((sum, item) => sum + item.heightMM, 0);
      const gapsHeight = SECTION_GAP * Math.max(0, renderedSections.length - 1);
      const pageH = contentHeight + gapsHeight + MARGIN * 2;
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: [PAGE_W, pageH], compress: true });

      pdf.setFillColor(pageBg);
      pdf.rect(0, 0, PAGE_W, pageH, "F");

      let currentY = MARGIN;
      renderedSections.forEach(({ canvas, heightMM }, index) => {
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", MARGIN, currentY, CONTENT_W, heightMM, undefined, "FAST");
        currentY += heightMM + (index < renderedSections.length - 1 ? SECTION_GAP : 0);
      });

      pdf.save(`proposicao-smart-ito-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      window.scrollTo(originalScroll.x, originalScroll.y);
    }
  };

  const [rotinas] = usePersistentState<Rotina[]>("gestao-ti:rotinas", ROTINAS_DEFAULT);
  const normalizedRotinas = useMemo(() => rotinas.map(normalizeLegacyRotina), [rotinas]);
  const [gmuds] = usePersistentState<Gmud[]>("gestao-ti:gmuds", GMUDS_DEFAULT);
  // Alocação absoluta de horas TAM/Owner (fonte canônica editada em Camadas).
  // `n3Cortes` permanece apenas como fallback legado.
  const [n3AllocHoras] = usePersistentState<[number, number]>("gestao-ti:smartPerf:n3AllocHoras", [0, 0]);
  const [n3Cortes] = usePersistentState<[number, number]>("gestao-ti:smartPerf:n3Cortes", [0, 0]);
  const [escopo] = usePersistentState<EscopoProposicao>(ESCOPO_STORAGE_KEY, ESCOPO_DEFAULT);
  const [restricoesGerais] = usePersistentState<string[]>(
    RESTRICOES_GERAIS_STORAGE_KEY,
    RESTRICOES_GERAIS_DEFAULT,
  );
  const [itensAdicionais] = usePersistentState<ItemAdicional[]>(
    ITENS_ADICIONAIS_STORAGE_KEY,
    ITENS_ADICIONAIS_DEFAULT,
  );

  const horasTotaisN3 = state.horasN3Mensais || 0;
  const n3Alloc = resolveN3Alloc(n3AllocHoras, n3Cortes, horasTotaisN3);
  const horasTamN3 = n3Alloc.tam;
  const horasOwnerN3 = n3Alloc.owner;
  const pctTam = horasTotaisN3 > 0 ? (horasTamN3 / horasTotaisN3) * 100 : 0;
  const pctOwner = horasTotaisN3 > 0 ? (horasOwnerN3 / horasTotaisN3) * 100 : 0;
  const pctLivre = Math.max(0, 100 - pctTam - pctOwner);

  // Fator de venda (markup divisor único) — converte custo em preço de venda
  const totalEncargosPerc =
    (state.pisPerc || 0) + (state.cofinsPerc || 0) + (state.issPerc || 0) +
    (state.comissaoPerc || 0) + (state.irpjCsllPerc || 0) + (state.encFinancPerc || 0) +
    (state.lucroPerc || 0);
  const fatorDivisor = totalEncargosPerc < 100 ? (100 - totalEncargosPerc) / 100 : 0;
  const fatorVenda = fatorDivisor > 0 ? 1 / fatorDivisor : 1;
  const valorHoraN3Venda = state.valorHoraN3 * fatorVenda;

  const inv = {
    qtdUsuarios: state.qtdUsuarios, qtdEquipamentos: state.qtdEquipamentos,
    qtdServidores: state.qtdServidores, qtdAtivosRede: state.qtdAtivosRede,
    qtdBancosDados: state.qtdBancosDados, qtdSistemas: state.qtdSistemas,
  };
  const complexFlags: ComplexFlags = {
    complexVirtualizacaoCluster: state.complexVirtualizacaoCluster,
    complexBancoDadosHA: state.complexBancoDadosHA,
    complexFirewallHA: state.complexFirewallHA,
    complexMultiSites: state.complexMultiSites,
    complexSiteBackup: state.complexSiteBackup,
    complexHibridoCloudOnPrem: state.complexHibridoCloudOnPrem,
    complexOperacao24x7: state.complexOperacao24x7,
    complexErpMercado: state.complexErpMercado,
  };
  const algumComplexAtivo = COMPLEX_FLAG_KEYS.some((k) => complexFlags[k]);

  const hasServiceDesk =
    (state.qtdUsuarios || 0) + (state.qtdEquipamentos || 0) > 0;
  const n3OptionalScenario = !hasInfraInventory && hasServiceDesk;

  // Custo médio por chamado de rotina ponderado (mesma fórmula do painel principal)
  const custoChN3Mix = state.tempoMedioChamadoN3 * state.valorHoraN3;
  const somaRotina = (state.percRotinaN1 + state.percRotinaN2 + state.percRotinaN3) || 100;
  const wRotN1 = state.percRotinaN1 / somaRotina;
  const wRotN2 = state.percRotinaN2 / somaRotina;
  const wRotN3 = state.percRotinaN3 / somaRotina;
  const custoPorChamadoMix =
    wRotN1 * results.custoPorChamadoN1 +
    wRotN2 * results.custoPorChamadoN2 +
    wRotN3 * custoChN3Mix;
  const fatorAutoPerc = Math.max(0, Math.min(100, state.percCustoRotinaAutomatizada ?? 100)) / 100;

  const rotinaCusto = (r: Rotina, demanda: number) => {
    const fa = r.automacao ? fatorAutoPerc : 1;
    if (r.horasExecucao && r.horasExecucao > 0) {
      return demanda * r.horasExecucao * state.valorHoraN3 * fa;
    }
    return demanda * custoPorChamadoMix * fa;
  };

  const filterRoutines = (oferta: "Operation" | "Performance", complexidade?: "Padrão" | "Complexo") =>
    normalizedRotinas
      .filter(r => {
        // Rotinas Gerenciais Selbetti são listadas em quadro próprio.
        if (r.gerencial) return false;
        const bucket = preventBucket(r.oferta);
        if (oferta === "Operation") return bucket === "Operation";
        if (bucket !== "Performance") return false;
        // Rotinas oferta=Performance respeitam complexidade própria.
        // Monitor/Flow que sobem para Performance entram no bloco Padrão.
        if (r.oferta === "Performance") {
          return (r.complexidade ?? "Padrão") === complexidade;
        }
        return complexidade === "Padrão";
      })
      // Sem infra (apenas service desk): apenas microinformática.
      // Com infra + service desk: todas as rotinas (incluindo microinformática).
      // Com infra sem service desk: exclui microinformática (vai para Field Service de Microinformática).
      .filter(r =>
        n3OptionalScenario
          ? r.grupo.toLowerCase().includes("microinform")
          : hasServiceDesk && !state.tierFieldOperation
            ? true
            : !r.grupo.toLowerCase().includes("microinform"),
      )
      .map(r => {
        const rotina = normalizeOsRotina(r);
        const mult = rotinaMultiplicador(rotina, inv, complexFlags);
        const demanda = r.chamadosMes * mult;
        const custo = rotinaCusto(r, demanda);
        return { id: r.id, grupo: r.grupo, rotina: r.rotina, freq: r.frequencia, demanda, mult, custo };
      })
      .filter(i => i.demanda > 0)
      .sort((a, b) => a.grupo.localeCompare(b.grupo, "pt-BR") || a.rotina.localeCompare(b.rotina, "pt-BR"));

  const rotinasOp = useMemo(() => filterRoutines("Operation"), [normalizedRotinas, state]);
  const rotinasPerfPadrao = useMemo(() => filterRoutines("Performance", "Padrão"), [normalizedRotinas, state]);
  const rotinasPerfComplexo = useMemo(() => filterRoutines("Performance", "Complexo"), [normalizedRotinas, state]);

  // Rotinas técnicas preventivas vinculadas às camadas Monitor / Flow.
  // Cumulativas: rotina oferta=Monitor aparece em Flow quando Monitor não está
  // displayable; a alocação usa o bucket displayable mais baixo ≥ à oferta.
  const filterLayerRoutines = (camada: "Monitor" | "Flow") =>
    normalizedRotinas
      .filter(r => !r.gerencial && preventBucket(r.oferta) === camada)
      .map(r => {
        const rotina = normalizeOsRotina(r);
        const mult = rotinaMultiplicador(rotina, inv, complexFlags);
        const demanda = r.chamadosMes * mult;
        const custo = rotinaCusto(r, demanda);
        return { id: r.id, grupo: r.grupo, rotina: r.rotina, freq: r.frequencia, demanda, mult, custo };
      })
      .filter(i => i.demanda > 0)
      .sort((a, b) => a.grupo.localeCompare(b.grupo, "pt-BR") || a.rotina.localeCompare(b.rotina, "pt-BR"));

  const rotinasMonitor = useMemo(() => filterLayerRoutines("Monitor"), [normalizedRotinas, state]);
  const rotinasFlow = useMemo(() => filterLayerRoutines("Flow"), [normalizedRotinas, state]);

  // Rotinas Gerenciais Selbetti — quadro próprio dentro da oferta vinculada de cada rotina.
  const rotinasGerenciais = useMemo(() =>
    normalizedRotinas
      .filter(r => r.gerencial)
      .map(r => {
        const rotina = normalizeOsRotina(r);
        const mult = rotinaMultiplicador(rotina, inv, complexFlags);
        const demanda = r.chamadosMes * mult;
        const fa = r.automacao ? fatorAutoPerc : 1;
        const horas = r.horasExecucao ?? 1;
        const custo = demanda * horas * state.valorHoraN3 * fa;
        return { id: r.id, grupo: r.grupo, rotina: r.rotina, freq: r.frequencia, oferta: r.oferta, demanda, mult, custo };
      })
      .filter(i => i.demanda > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [normalizedRotinas, state],
  );
  const dominantTierKey: "Monitor" | "Flow" | "Operation" | "Performance" | null =
    state.tierPerformance ? "Performance"
    : state.tierOperation ? "Operation"
    : state.tierFlow ? "Flow"
    : state.tierMonitor ? "Monitor"
    : null;

  const rotinasField = useMemo(() => {
    if (!state.tierFieldOperation || n3OptionalScenario) return [];
    return normalizedRotinas
      .filter(r => r.grupo.toLowerCase().includes("microinform"))
      .filter(r => !r.gerencial)
      .filter(r => (r.oferta === "Performance" ? state.tierPerformance : true))
      .map(r => {
        const rotina = normalizeOsRotina(r);
        const mult = rotinaMultiplicador(rotina, inv, complexFlags);
        const demanda = r.chamadosMes * mult;
        const custo = rotinaCusto(r, demanda);
        return { id: r.id, grupo: r.grupo, rotina: r.rotina, freq: r.frequencia, oferta: r.oferta, demanda, mult, custo };
      })
      .filter(i => i.demanda > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedRotinas, state]);

  const sumCusto = (arr: { custo: number }[]) => arr.reduce((a, b) => a + b.custo, 0);
  const custoRotinasOp = sumCusto(rotinasOp);
  const custoRotinasPerfPadrao = sumCusto(rotinasPerfPadrao);
  const custoRotinasPerfComplexo = sumCusto(rotinasPerfComplexo);
  const custoRotinasField = sumCusto(rotinasField);

  // === GMUDs por camada ===
  const gmudInput = {
    custoPorChamadoN2: results.custoPorChamadoN2,
    tempoMedioChamadoN3: state.tempoMedioChamadoN3,
    valorHoraN3: state.valorHoraN3,
    percN2: state.percGmudN2 ?? 70,
    percN3: state.percGmudN3 ?? 30,
  };
  const gmudBuckets = useMemo(() => bucketGmuds(gmuds), [gmuds]);
  const buildGmudData = (lista: Gmud[]) => {
    const items = lista.map((g) => computeGmud(g, gmudInput));
    const totals = items.reduce(
      (acc, i) => {
        acc.chamados += i.chamadosMes;
        acc.horasN3 += i.horasN3;
        acc.custo += i.custo;
        return acc;
      },
      { chamados: 0, horasN3: 0, custo: 0 },
    );
    return { items, totals };
  };
  const gmudOperationData = useMemo(
    () => buildGmudData(gmudBuckets.operation),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gmudBuckets, results.custoPorChamadoN2, state.tempoMedioChamadoN3, state.valorHoraN3, state.percGmudN2, state.percGmudN3],
  );
  const gmudPerformanceData = useMemo(
    () => buildGmudData(gmudBuckets.performance),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gmudBuckets, results.custoPorChamadoN2, state.tempoMedioChamadoN3, state.valorHoraN3, state.percGmudN2, state.percGmudN3],
  );

  // Rotinas Performance consomem horas do pool N3 contratado (slider).
  // O custo das rotinas é abatido das horas N3 (sem cobrar em separado).
  // Rotinas Operation seguem o mesmo princípio (absorvidas pelo pool N3 contratado).
  const horasRotinasOpN3 = state.valorHoraN3 > 0
    ? custoRotinasOp / state.valorHoraN3
    : 0;
  const horasRotinasPerfN3 = state.valorHoraN3 > 0
    ? (custoRotinasPerfPadrao + custoRotinasPerfComplexo) / state.valorHoraN3
    : 0;
  // Quando Performance está ativo, o pool N3 fica em Performance e absorve
  // tanto as rotinas de Performance quanto as de Operation.
  const horasRotinasN3 = horasRotinasOpN3 + horasRotinasPerfN3;

  // ============================================================
  // Filtra itens descritivos ("O que está incluído") suprimindo
  // automaticamente recursos que estão desabilitados na camada
  // (atendentes=0, proxys=0, horas N3=0, rotinas vazias etc.).
  // ============================================================
  const incluidosFlags = {
    monitorProxys: (sm.qtdProxys || 0) > 0,
    flowAtendentes: (sf.qtdAtendentes || 0) > 0,
    flowProxys: (state.qtdProxysFlow || 0) > 0 || (sf.qtdProxys || 0) > 0,
    flowHorasAutomacao: (state.horasN3FlowManut || 0) > 0 || (sf.custoN3Manut || 0) > 0,
    flowHorasN3Opcional: (state.horasN3Flow || 0) > 0 || (sf.custoN3 || 0) > 0,
    opRotinas: custoRotinasOp > 0,
    opN3: (!n3OptionalScenario || state.tierOperationN3) && (state.horasN3Mensais || 0) > 0,
    perfRotinas: (custoRotinasPerfPadrao + custoRotinasPerfComplexo) > 0,
    perfHorasN3: (state.horasN3Mensais || 0) > 0,
    perfComplexo: algumComplexAtivo,
    fieldRotinas: custoRotinasField > 0,
  };
  const incluidoRules: Record<CamadaKey, Array<{ test: RegExp; keep: boolean }>> = {
    monitor: [
      { test: /prox/i, keep: incluidosFlags.monitorProxys },
    ],
    flow: [
      { test: /atendent/i, keep: incluidosFlags.flowAtendentes },
      { test: /prox/i, keep: incluidosFlags.flowProxys },
      { test: /hora.*automa|automa.*evento|horas?\s*de\s*automa/i, keep: incluidosFlags.flowHorasAutomacao },
      { test: /acionamento|opcional/i, keep: incluidosFlags.flowHorasN3Opcional },
    ],
    operation: [
      { test: /rotina/i, keep: incluidosFlags.opRotinas },
      { test: /n3\s+contratad|atendimento\s+n3/i, keep: incluidosFlags.opN3 },
    ],
    performance: [
      { test: /rotina/i, keep: incluidosFlags.perfRotinas },
      { test: /ambientes?\s+complex|HA,\s*multi-?site|complex/i, keep: incluidosFlags.perfComplexo },
      { test: /hora.*n3|n3.*dedicad|hora.*automa/i, keep: incluidosFlags.perfHorasN3 },
    ],
    fieldService: [
      { test: /rotina/i, keep: incluidosFlags.fieldRotinas },
    ],
    enterprise: [],
  };
  const filterIncluidos = (key: CamadaKey, items: string[]) =>
    items.filter((t) => {
      const txt = (t || "").trim();
      if (!txt) return false;
      for (const r of incluidoRules[key]) {
        if (!r.keep && r.test.test(txt)) return false;
      }
      return true;
    });
  const escopoFiltered: Record<CamadaKey, EscopoCamada> = {
    monitor: { ...escopo.monitor, incluidos: filterIncluidos("monitor", escopo.monitor.incluidos) },
    flow: { ...escopo.flow, incluidos: filterIncluidos("flow", escopo.flow.incluidos) },
    operation: { ...escopo.operation, incluidos: filterIncluidos("operation", escopo.operation.incluidos) },
    fieldService: { ...escopo.fieldService, incluidos: filterIncluidos("fieldService", escopo.fieldService.incluidos) },
    performance: { ...escopo.performance, incluidos: filterIncluidos("performance", escopo.performance.incluidos) },
    enterprise: { ...escopo.enterprise, incluidos: escopo.enterprise.incluidos.filter((t) => (t || "").trim()) },
  };

  // Escopo unificado Monitor + Flow (usado quando ambas as camadas estão ativas).
  // Já consome as listas FILTRADAS de cada camada antes de mesclar/deduplicar.
  const escopoFlowDisplay: EscopoCamada = unifiedMonitorFlow
    ? {
        titulo: "Monitor + Flow",
        tagline:
          "Monitoramento da infraestrutura integrado ao ITSM com atendentes dedicados",
        descricao: mergeDescricoes(escopo.monitor.descricao, escopo.flow.descricao),
        incluidos: dedupLines([...escopoFiltered.monitor.incluidos, ...escopoFiltered.flow.incluidos]),
        restricoes: dedupLines([...escopo.monitor.restricoes, ...escopo.flow.restricoes]),
      }
    : escopoFiltered.flow;

  // Valores de venda por camada (fonte canônica compartilhada com o painel de
  // Camadas, o Resumo de Cotação e a Apresentação).
  const toSell = (c: number) => c * fatorVenda;
  const tierPricing = computeTierPricing(state, results, extrasOperacionais);
  const valorMonitor = monitorVisible ? tierPricing.venda.monitor : 0;
  const valorFlow = flowVisible ? tierPricing.venda.flow : 0;
  const custoOperacaoBase =
    results.custoN1 + results.custoN2 + (state.tierPerformance ? 0 : results.custoN3);
  const valorFieldService = state.tierFieldOperation
    ? tierPricing.venda.fieldService
    : 0;
  const valorOperation = state.tierOperation ? tierPricing.venda.operation : 0;
  const valorPerformance = state.tierPerformance ? tierPricing.venda.performance : 0;
  // Rotinas Gerenciais Selbetti são cobradas em separado e são CUMULATIVAS entre
  // as camadas: uma gerencial de Monitor permanece ativa em Flow/Operation/
  // Performance; de Flow permanece em Operation/Performance; etc. Cada gerencial
  // é exibida e cobrada em uma única camada — a camada ativa mais baixa cuja
  // ordem seja ≥ à oferta vinculada da rotina (display bucket).
  const gerencialBucket = (oferta: "Monitor" | "Flow" | "Operation" | "Performance") =>
    gerencialBucketFor(state, oferta);
  const gerenciaisDe = (camada: "Monitor" | "Flow" | "Operation" | "Performance") =>
    rotinasGerenciais.filter((r) => {
      const oferta = (r as any).oferta as "Monitor" | "Flow" | "Operation" | "Performance";
      return gerencialBucket(oferta) === camada;
    });
  // Somatório de gerenciais efetivamente cobradas (apenas as que caem em
  // alguma camada ativa via cascata cumulativa).
  const rotinasGerenciaisCobradas = rotinasGerenciais.filter((r) => {
    const oferta = (r as any).oferta as "Monitor" | "Flow" | "Operation" | "Performance";
    return gerencialBucket(oferta) !== null;
  });
  const custoRotinasGerenciais = sumCusto(rotinasGerenciaisCobradas);
  const valorRotinasGerenciais = tierPricing.venda.gerenciais;
  // Total canônico: idêntico ao preço de venda mensal e ao total das Camadas.
  const investimentoTotal = tierPricing.venda.total;

  // Subtotais decompostos para exibir a composição do valor de cada camada
  const valorMonitorParts = monitorVisible
    ? [
        { label: "Monitoramento de ativos", value: toSell(sm.custoMonitoramento) },
        { label: "N1 alocado (triagem)", value: toSell(sm.custoN1Alocado) },
        ...(sm.custoN3Manut > 0 ? [{ label: "Manutenção e Automação (N3)", value: toSell(sm.custoN3Manut) }] : []),
        ...(sm.custoN3 > 0 ? [{ label: "Atendimento N3 (horas opcionais)", value: toSell(sm.custoN3) }] : []),
        ...(sm.custoAtendentes > 0
          ? [{ label: `Atendentes no ITSM (${sm.qtdAtendentes}x)`, value: toSell(sm.custoAtendentes) }]
          : []),
        ...(sm.custoProxys > 0
          ? [{ label: `Proxys de monitoramento (${sm.qtdProxys}x)`, value: toSell(sm.custoProxys) }]
          : []),
      ]
    : [];
  const valorFlowParts = flowVisible
    ? [
        { label: "Monitoramento integrado ao ITSM", value: toSell(sf.custoMonitoramento) },
        ...(sf.custoN1Alocado > 0 ? [{ label: "N1 alocado (triagem)", value: toSell(sf.custoN1Alocado) }] : []),
        ...(sf.custoN3Manut > 0 ? [{ label: "Horas de automação (N3)", value: toSell(sf.custoN3Manut) }] : []),
        ...(sf.custoN3 > 0 ? [{ label: "Atendimento N3 (horas opcionais)", value: toSell(sf.custoN3) }] : []),
        ...(sf.custoAtendentes > 0
          ? [{ label: `Atendentes no ITSM (${sf.qtdAtendentes}x)`, value: toSell(sf.custoAtendentes) }]
          : []),
        ...(sf.custoProxys > 0
          ? [{ label: `Proxys da camada Flow (${sf.qtdProxys}x)`, value: toSell(sf.custoProxys) }]
          : []),
      ]
    : [];
  const valorOperationParts = state.tierOperation
    ? [
        {
          label: state.tierPerformance ? "Serviço base (N1 + N2)" : "Serviço base (N1 + N2 + N3)",
          value: toSell(custoOperacaoBase),
        },
        ...(valorFieldService > 0
          ? [{ label: "Field Service de Microinformática", value: valorFieldService }]
          : []),
        ...(gmudOperationData.totals.custo > 0
          ? [{ label: "GMUDs (Operation)", value: toSell(gmudOperationData.totals.custo) }]
          : []),
        ...(tierPricing.venda.endpointTooling > 0
          ? [{
              label: `Ferramenta de endpoint (${formatNumber(state.qtdEquipamentos || 0)} equip.)`,
              value: tierPricing.venda.endpointTooling,
            }]
          : []),
        ...(tierPricing.custo.residualBucket === "Operation" && tierPricing.venda.residual > 0.005
          ? [{ label: "Monitoramento de ativos (UM)", value: tierPricing.venda.residual }]
          : []),
      ]
    : [];
  const valorPerformanceParts = state.tierPerformance
    ? [
        {
          label: `Atendimento N3 (${formatNumber(state.horasN3Mensais)}h)`,
          value: toSell(results.custoN3),
        },
        ...(gmudPerformanceData.totals.custo > 0
          ? [{ label: "GMUDs (Performance)", value: toSell(gmudPerformanceData.totals.custo) }]
          : []),
        ...(tierPricing.custo.residualBucket === "Performance" && tierPricing.venda.residual > 0.005
          ? [{ label: "Monitoramento de ativos (UM)", value: tierPricing.venda.residual }]
          : []),
      ]
    : [];
  const valorFieldParts = state.tierFieldOperation
    ? [
        { label: "Equipe presencial (N1F + N2F + N3F)", value: toSell(fs.custoN1F + fs.custoN2F + fs.custoN3F) },
        { label: "Triagem N1", value: toSell(fs.custoTriagemN1) },
        ...(fs.overflowAtivo
          ? [{ label: "Transbordo remoto (N1 + N2F)", value: toSell(fs.custoTransbordoN1Remoto + fs.custoTransbordoN2F) }]
          : []),
        ...(custoRotinasField > 0
          ? [{ label: "Rotinas Field · Microinformática", value: toSell(custoRotinasField) }]
          : []),
      ]
    : [];

  const horasAtendN3 = results.horasAtendimentoN3;
  const horasPrev = Math.max(0, horasTotaisN3 - horasAtendN3);

  // Horas de Melhoria — configuradas no painel Smart Tiers (persistidas em
  // localStorage). Subdividem o resíduo "Horas Técnicas" do bucket Operation
  // sem alterar o custo total. Replicamos o mesmo clamp usado no painel.
  const [horasMelhoriaOpRaw] = usePersistentState<number>("gestao-ti:smartOp:horasMelhoria", 0);
  const horasLivreOpDetalhe = Math.max(0, (state.horasN3Mensais || 0) - horasAtendN3 - horasRotinasOpN3);
  const melhoriaOpHardMax = Math.max(0, Math.min(horasLivreOpDetalhe, state.horasMelhoriaOpMax ?? horasLivreOpDetalhe));
  const melhoriaOpHardMin = Math.max(0, Math.min(melhoriaOpHardMax, state.horasMelhoriaOpMin ?? 0));
  const horasMelhoriaOp = Math.max(melhoriaOpHardMin, Math.min(melhoriaOpHardMax, Math.round(horasMelhoriaOpRaw || 0)));

  // Mesma lógica para o bucket Performance (TAM + Owner + Rotinas + Chamados → resíduo).
  const [horasMelhoriaPerfRaw] = usePersistentState<number>("gestao-ti:smartPerf:horasMelhoria", 0);
  const horasTamPerfDetalhe = horasTamN3;
  const horasOwnerPerfDetalhe = horasOwnerN3;
  const horasLivrePerfDetalhe = Math.max(
    0,
    (state.horasN3Mensais || 0) - horasAtendN3 - horasRotinasN3 - horasTamPerfDetalhe - horasOwnerPerfDetalhe,
  );
  const melhoriaPerfHardMax = Math.max(0, Math.min(horasLivrePerfDetalhe, state.horasMelhoriaPerfMax ?? horasLivrePerfDetalhe));
  const melhoriaPerfHardMin = Math.max(0, Math.min(melhoriaPerfHardMax, state.horasMelhoriaPerfMin ?? 0));
  const horasMelhoriaPerf = Math.max(melhoriaPerfHardMin, Math.min(melhoriaPerfHardMax, Math.round(horasMelhoriaPerfRaw || 0)));

  // ============================================================
  // Exportação de Apresentação (.pptx)
  // Monta payload com camadas ativas, composições e itens adicionais
  // ============================================================
  const buildApresentacaoPayload = (): ApresentacaoPayload => {
    const camadas: CamadaSlideData[] = [];
    const pushCamada = (
      key: CamadaKey,
      valor: number,
      composicao: { label: string; value: number }[],
      extras: Partial<Pick<CamadaSlideData,
        "metricas" | "recursos" | "horasN3" | "rotinasGrupos" | "field"
      >> = {},
    ) => {
      const esc = escopoFiltered[key];
      camadas.push({
        key,
        titulo: esc.titulo,
        tagline: esc.tagline,
        descricao: esc.descricao,
        incluidos: esc.incluidos,
        restricoes: escopo[key].restricoes,
        valor,
        composicao,
        ...extras,
      });
    };
    // Helpers para construir extras por camada
    const rotinaToSlide = (r: { rotina: string; grupo: string; freq: string; demanda: number; custo: number }): RotinaSlideItem => ({
      rotina: r.rotina,
      grupo: r.grupo,
      frequencia: r.freq,
      demanda: r.demanda,
      custo: r.custo * fatorVenda,
    });

    const monitorExtras = () => {
      const metricas = [
        { label: "Total de ativos", value: formatNumber(sm.ativos) },
        { label: "Ch. monitoramento", value: `${formatNumber(sm.chamadosAtivos, 1)}/mês` },
        { label: "Alocação N1", value: `${state.percAlocacaoN1Monitor}%` },
      ];
      const recursos: RecursoSlideItem[] = [];
      if (sm.qtdAtendentes > 0)
        recursos.push({ label: "Atendentes no ITSM", qtd: sm.qtdAtendentes, detalhe: "acessos", valor: toSell(sm.custoAtendentes) });
      if (sm.qtdProxys > 0)
        recursos.push({ label: "Proxys de monitoramento", qtd: sm.qtdProxys, detalhe: sm.qtdProxys === 1 ? "1 inicial" : `1 inicial + ${sm.qtdProxys - 1} adic.`, valor: toSell(sm.custoProxys) });
      let horasN3: HorasN3Slide | undefined;
      if (!state.tierOperation && (state.horasN3MonitorManut > 0 || state.horasN3Monitor > 0)) {
        const hManut = state.horasN3MonitorManut || 0;
        const hAcion = state.horasN3Monitor || 0;
        horasN3 = {
          total: hManut + hAcion,
          valorHora: valorHoraN3Venda,
          modo: "monitor",
          blocos: [
            { titulo: "Manutenção e Automação", horas: hManut, valor: toSell(sm.custoN3Manut), descricao: "Ajustes, automações e tunings da plataforma de monitoramento." },
            { titulo: "Atendimento N3", horas: hAcion, valor: toSell(sm.custoN3), descricao: "Horas para tratamento de incidentes detectados." },
          ].filter((b) => b.horas > 0),
        };
      }
      const rotinasGrupos: RotinaGrupoSlide[] = [];
      if (rotinasMonitor.length > 0) {
        rotinasGrupos.push({
          titulo: `Rotinas Técnicas Preventivas — Smart Monitor (${rotinasMonitor.length})`,
          items: rotinasMonitor.map(rotinaToSlide),
        });
      }
      const gerMonitor = gerenciaisDe("Monitor");
      if (gerMonitor.length > 0) {
        rotinasGrupos.push({
          titulo: `Rotinas Gerenciais Selbetti — Smart Monitor (${gerMonitor.length})`,
          items: gerMonitor.map(rotinaToSlide),
        });
      }
      return { metricas, recursos, horasN3, rotinasGrupos: rotinasGrupos.length ? rotinasGrupos : undefined };
    };

    const flowExtras = () => {
      const metricas = [
        { label: "Ativos integrados", value: formatNumber(sf.ativos) },
        { label: "Ch. monitoramento", value: `${formatNumber(sf.chamadosAtivos, 1)}/mês` },
        { label: "Alocação N1 Flow", value: `${state.percAlocacaoN1Flow}%` },
      ];
      const recursos: RecursoSlideItem[] = [];
      if (sf.qtdAtendentes > 0)
        recursos.push({ label: "Atendentes no ITSM", qtd: sf.qtdAtendentes, detalhe: "acessos", valor: toSell(sf.custoAtendentes) });
      if (sf.qtdProxys > 0)
        recursos.push({ label: "Proxys da camada Flow", qtd: sf.qtdProxys, detalhe: sf.qtdProxys === 1 ? "1 inicial" : `1 inicial + ${sf.qtdProxys - 1} adic.`, valor: toSell(sf.custoProxys) });
      let horasN3: HorasN3Slide | undefined;
      if (!state.tierOperation && (sf.horasN3Manut > 0 || sf.horasN3 > 0)) {
        const hManut = sf.horasN3Manut || 0;
        const hAcion = sf.horasN3 || 0;
        horasN3 = {
          total: hManut + hAcion,
          valorHora: valorHoraN3Venda,
          modo: "flow",
          blocos: [
            { titulo: "Manutenção e Automação", horas: hManut, valor: toSell(sf.custoN3Manut), descricao: "Tratamento contínuo e automações de eventos." },
            { titulo: "Atendimento N3", horas: hAcion, valor: toSell(sf.custoN3), descricao: "Horas técnicas sob demanda." },
          ].filter((b) => b.horas > 0),
        };
      }
      const rotinasGrupos: RotinaGrupoSlide[] = [];
      if (rotinasFlow.length > 0) {
        rotinasGrupos.push({
          titulo: `Rotinas Técnicas Preventivas — Smart Flow (${rotinasFlow.length})`,
          items: rotinasFlow.map(rotinaToSlide),
        });
      }
      const gerFlow = gerenciaisDe("Flow");
      if (gerFlow.length > 0) {
        rotinasGrupos.push({
          titulo: `Rotinas Gerenciais Selbetti — Smart Flow (${gerFlow.length})`,
          items: gerFlow.map(rotinaToSlide),
        });
      }
      return { metricas, recursos, horasN3, rotinasGrupos: rotinasGrupos.length ? rotinasGrupos : undefined };
    };

    const operationExtras = () => {
      const metricas = [
        { label: "Volume N1", value: `${formatNumber(results.volumeN1, 1)} ch/mês` },
        { label: "Volume N2", value: `${formatNumber(results.volumeN2, 1)} ch/mês` },
        { label: "Custo/ch N1", value: formatBRL(results.custoPorChamadoN1) },
      ];
      const rotinasGrupos: RotinaGrupoSlide[] = [];
      if (rotinasOp.length > 0) {
        rotinasGrupos.push({
          titulo: `Rotinas preventivas básicas (${rotinasOp.length})`,
          items: rotinasOp.map(rotinaToSlide),
        });
      }
      const gerOperation = gerenciaisDe("Operation");
      if (gerOperation.length > 0) {
        rotinasGrupos.push({
          titulo: `Rotinas Gerenciais Selbetti — Smart Operation (${gerOperation.length})`,
          items: gerOperation.map(rotinaToSlide),
        });
      }
      let horasN3: HorasN3Slide | undefined;
      if ((!n3OptionalScenario || state.tierOperationN3) && !state.tierPerformance && state.horasN3Mensais > 0) {
        const total = state.horasN3Mensais;
        const horasLivreOp = Math.max(0, total - horasAtendN3 - horasRotinasOpN3);
        horasN3 = {
          total,
          valorHora: valorHoraN3Venda,
          modo: "operation",
          blocos: [
            { titulo: "Chamados N3", horas: horasAtendN3, valor: horasAtendN3 * valorHoraN3Venda, descricao: "Atendimento reativo de incidentes complexos." },
            { titulo: "Rotinas Operation", horas: horasRotinasOpN3, valor: horasRotinasOpN3 * valorHoraN3Venda, descricao: "Rotinas preventivas absorvidas no pool N3." },
            { titulo: "Horas técnicas", horas: horasLivreOp, valor: horasLivreOp * valorHoraN3Venda, descricao: "Saldo livre para projetos e demandas pontuais." },
          ].filter((b) => b.horas > 0),
        };
      }
      let field: FieldSlideData | undefined;
      if (state.tierFieldOperation) {
        field = {
          profissionais: [
            { nivel: "N1F", qtd: state.fieldDirectQtdN1, valor: toSell(fs.custoN1F) },
            { nivel: "N2F", qtd: state.fieldDirectQtdN2, valor: toSell(fs.custoN2F) },
            { nivel: "N3F", qtd: state.fieldDirectQtdN3, valor: toSell(fs.custoN3F) },
          ],
          equipamentos: state.qtdEquipamentos || 0,
          chamadosEscalados: fs.volumeUsuariosEscalado,
          overflowVolume: fs.overflowAtivo ? fs.volumeTransbordoN1Remoto : undefined,
        };
        if (rotinasField.length > 0) {
          rotinasGrupos.push({
            titulo: `Rotinas Field — Microinformática (${rotinasField.length})`,
            items: rotinasField.map(rotinaToSlide),
          });
        }
      }
      return { metricas, rotinasGrupos: rotinasGrupos.length ? rotinasGrupos : undefined, horasN3, field };
    };

    const performanceExtras = () => {
      const rotinasGrupos: RotinaGrupoSlide[] = [];
      if (rotinasPerfPadrao.length > 0) {
        rotinasGrupos.push({
          titulo: `Rotinas Performance — Ambiente Padrão (${rotinasPerfPadrao.length})`,
          items: rotinasPerfPadrao.map(rotinaToSlide),
        });
      }
      if (algumComplexAtivo && rotinasPerfComplexo.length > 0) {
        rotinasGrupos.push({
          titulo: `Rotinas Performance — Ambiente Complexo (${rotinasPerfComplexo.length})`,
          items: rotinasPerfComplexo.map(rotinaToSlide),
        });
      }
      const gerPerformance = gerenciaisDe("Performance");
      if (gerPerformance.length > 0) {
        rotinasGrupos.push({
          titulo: `Rotinas Gerenciais Selbetti — Smart Performance (${gerPerformance.length})`,
          items: gerPerformance.map(rotinaToSlide),
        });
      }
      let horasN3: HorasN3Slide | undefined;
      if ((!n3OptionalScenario || state.tierOperationN3) && state.horasN3Mensais > 0) {
        const total = state.horasN3Mensais;
        // Mesma cascata da tela (fonte única) — as parcelas fecham no total.
        const distPerf = computeN3Distribution({
          total,
          horasChamados: horasAtendN3,
          horasRotinas: horasRotinasN3,
          horasTam: horasTamN3,
          horasOwner: horasOwnerN3,
          horasMelhoria: horasMelhoriaPerf,
        });
        const horasTam = distPerf.tam;
        const horasOwner = distPerf.owner;
        const horasLivre = distPerf.tecnicas;
        horasN3 = {
          total,
          valorHora: valorHoraN3Venda,
          modo: "performance",
          blocos: [
            { titulo: "Chamados N3", horas: distPerf.chamados, valor: distPerf.chamados * valorHoraN3Venda, descricao: "Atendimento reativo N3." },
            { titulo: "Rotinas", horas: distPerf.rotinas, valor: distPerf.rotinas * valorHoraN3Venda, descricao: "Rotinas Performance/Operation absorvidas." },
            { titulo: "TAM", horas: horasTam, valor: horasTam * valorHoraN3Venda, descricao: "Acompanhamento técnico e governança." },
            { titulo: "Owner", horas: horasOwner, valor: horasOwner * valorHoraN3Venda, descricao: "Especialista dedicado às rotinas e melhorias." },
            { titulo: "Melhoria", horas: distPerf.melhoria, valor: distPerf.melhoria * valorHoraN3Venda, descricao: "Horas reservadas para evoluções e melhorias contínuas." },
            { titulo: "Horas técnicas", horas: horasLivre, valor: horasLivre * valorHoraN3Venda, descricao: "Saldo para projetos e demandas pontuais." },
          ].filter((b) => b.horas > 0),
        };
      }
      return { rotinasGrupos: rotinasGrupos.length ? rotinasGrupos : undefined, horasN3 };
    };

    if (unifiedMonitorFlow) {
      // Camada unificada Monitor + Flow: une descrições/itens (sem duplicar),
      // mantém recursos do Flow como mandatórios e soma valores e composição.
      const mExtras = monitorExtras();
      const fExtras = flowExtras();
      const recursos = [...(fExtras.recursos ?? []), ...(mExtras.recursos ?? [])];
      const metricas = fExtras.metricas; // Flow é mandatório
      // Horas N3: prioriza Flow; se Monitor tiver horas, mescla.
      const horasN3 = fExtras.horasN3 ?? mExtras.horasN3;
      const rotinasGruposMerged = [
        ...(fExtras.rotinasGrupos ?? []),
        ...(mExtras.rotinasGrupos ?? []),
      ];
      camadas.push({
        key: "flow",
        titulo: escopoFlowDisplay.titulo,
        tagline: escopoFlowDisplay.tagline,
        descricao: escopoFlowDisplay.descricao,
        incluidos: escopoFlowDisplay.incluidos,
        restricoes: escopoFlowDisplay.restricoes,
        valor: valorMonitor + valorFlow,
        composicao: [...valorMonitorParts, ...valorFlowParts],
        metricas,
        recursos,
        horasN3,
        rotinasGrupos: rotinasGruposMerged.length ? rotinasGruposMerged : undefined,
      });
    } else {
      if (monitorVisible) pushCamada("monitor", valorMonitor, valorMonitorParts, monitorExtras());
      if (flowVisible) pushCamada("flow", valorFlow, valorFlowParts, flowExtras());
    }
    if (state.tierOperation) pushCamada("operation", valorOperation, valorOperationParts, operationExtras());
    if (state.tierFieldOperation)
      pushCamada("fieldService", valorFieldService, valorFieldParts);
    if (state.tierPerformance)
      pushCamada("performance", valorPerformance, valorPerformanceParts, performanceExtras());
    if (state.tierEnterprise)
      pushCamada("enterprise", 0, []);

    // Itens adicionais (replicando regra de visibilidade do bloco visual)
    const escala = state.criticidadeEscala ?? [];
    const ajuste = escala[state.criticidadeNivel] ?? 0;
    const adj = (t: number) => Math.max(0, t * (1 + ajuste));
    const cppN1 = results.custoPorChamadoN1;
    const cppN2 = results.custoPorChamadoN2;
    const cN3perChamado = state.valorHoraN3 * state.tempoMedioChamadoN3;
    const pesos = state.monitorPesos ?? { servidores: 1, bancoDados: 1.2, firewall: 0.7, ativosRede: 0.5 };
    const faixas = state.monitorFaixas ?? [];
    const umInvAtual =
      (state.qtdServidores || 0) * pesos.servidores +
      (state.qtdBancosDados || 0) * pesos.bancoDados +
      (state.qtdSistemas || 0) * pesos.firewall +
      (state.qtdAtivosRede || 0) * pesos.ativosRede;
    const custoPorUMMarginal = (() => {
      const um = Math.max(0, umInvAtual);
      for (const f of faixas) if (um > f.de && um <= f.ate) return f.custoPorUM || 0;
      return faixas.length > 0 ? faixas[faixas.length - 1].custoPorUM || 0 : 0;
    })();
    const computeMonitoradoUnit = (taxa: number, peso: number) => {
      const chamadosBrutos = adj(taxa);
      const chamadosLiq = chamadosBrutos * (1 - state.reducaoN0 / 100);
      const vN1 = chamadosLiq * (state.percN1 / 100);
      const vN2 = chamadosLiq * (state.percN2 / 100);
      const vN3 = chamadosLiq * (state.percN3 / 100);
      const custoIncidentes = cppN1 * vN1 + cppN2 * vN2 + cN3perChamado * vN3;
      const custoMonit = custoPorUMMarginal * peso;
      const custoN1Aloc = state.tierMonitor && !state.tierOperation
        ? (state.percAlocacaoN1Monitor / 100) * cppN1 * chamadosLiq
        : 0;
      return (custoIncidentes + custoMonit + custoN1Aloc) * fatorVenda;
    };
    const isItemVisible = (it: ItemAdicional): boolean => {
      switch (it.tipo) {
        case "monitorado-servidor": return monitorVisible && (state.qtdServidores || 0) > 0;
        case "monitorado-rede":
        case "monitorado-firewall": return monitorVisible && (state.qtdAtivosRede || 0) > 0;
        case "monitorado-bd": return monitorVisible && (state.qtdBancosDados || 0) > 0;
        case "monitorado-sistema": return monitorVisible && (state.qtdSistemas || 0) > 0;
        case "proxy": return monitorVisible || flowVisible;
        case "itsm": return flowVisible;
        case "hora-n3": return state.tierOperation || state.tierPerformance;
        case "tam":
        case "owner": return state.tierEnterprise;
        case "fixo":
        default: return true;
      }
    };
    const computeItemValor = (it: ItemAdicional): number => {
      if (typeof it.valorManual === "number" && it.valorManual > 0) return it.valorManual;
      switch (it.tipo) {
        case "monitorado-servidor": return computeMonitoradoUnit(state.taxaServidor, pesos.servidores);
        case "monitorado-rede":
        case "monitorado-firewall": return computeMonitoradoUnit(state.taxaRede, pesos.ativosRede);
        case "monitorado-bd": return computeMonitoradoUnit(state.taxaBancoDados, pesos.bancoDados);
        case "monitorado-sistema": return computeMonitoradoUnit(state.taxaSistemas, pesos.firewall);
        case "proxy": return (state.valorProxyAdicional || 0) * fatorVenda;
        case "hora-n3": return valorHoraN3Venda;
        default: return it.valorManual ?? 0;
      }
    };
    const itensSlide: ItemAdicionalSlide[] = itensAdicionais
      .filter(isItemVisible)
      .map((it) => ({
        descricao: it.descricao,
        unidade: it.unidade,
        valor: computeItemValor(it),
        observacao: it.observacao,
      }));

    const payload: ApresentacaoPayload = {
      ofertaNome: dominantOffer?.name ?? "Proposição de Smart ITO",
      ofertaTagline: dominantOffer?.tagline ?? "Detalhamento da proposta",
      componentes: componentNames,
      camadas,
      itensAdicionais: itensSlide,
      restricoesGerais,
      investimentoTotal: investimentoTotal,
      presetName: activePreset.name ?? undefined,
      exportedAt: Date.now(),
      watermark: approval.watermark ?? undefined,
    };
    return payload;
  };
  const handleExportPresentation = async () => {
    if (exportBlocked) {
      toast.error(exportDisabledReason ?? "Exportação bloqueada.");
      return;
    }
    try {
      await exportarApresentacaoTemplate(buildApresentacaoPayload());
    } catch (e) {
      console.error(e);
      toast.error("Falha ao gerar apresentação: " + (e as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-3 px-4">
          <BackHomeButton />
          <Link to="/ito" className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0">
            <ClipboardList className="h-5 w-5 text-primary shrink-0" />
            <h1 className="text-sm font-bold text-foreground truncate">
              Proposição{dominantOffer ? ` · ${dominantOffer.name}` : ""}
            </h1>
          </Link>
          <div className="ml-auto shrink-0 pl-2 flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <FileDown className="h-4 w-4" />
                  <span className="hidden sm:inline">Exportar</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={handleExportPDF}
                  className="gap-2"
                  disabled={exportBlocked}
                  title={exportDisabledReason}
                >
                  <FileDown className="h-4 w-4" />
                  Anexo Contratual (PDF)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleExportPresentation}
                  className="gap-2"
                  disabled={exportBlocked}
                  title={exportDisabledReason}
                >
                  <Presentation className="h-4 w-4" />
                  Apresentação (PPTX)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <SortableNav current="detalhamento" />
          </div>
        </div>
      </header>

      <main
        id="proposicao-printable"
        className="proposicao-printable report-anexo mx-auto max-w-5xl p-6 space-y-6"
      >
<WriteFence permission="page.detalhamento.write" anyOf={["pricing.edit"]}>
        <section data-pdf-section className="report-section text-center pt-2 pb-1">
          <div className="report-kicker inline-flex items-center gap-2 rounded-full border bg-card/60 backdrop-blur px-3 py-1 mb-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Proposta Comercial</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
            {dominantOffer ? dominantOffer.name : "Proposição de Smart ITO"}
          </h1>
          <p className="report-description text-sm text-muted-foreground mt-3">
            {dominantOffer ? dominantOffer.tagline : "Detalhamento por camada da oferta"}
          </p>
          {componentNames.length > 0 && (
            <div className="composta-list mt-4 flex flex-wrap items-center justify-center gap-2">
              <span className="composta-label text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Composta por
              </span>
              {componentNames.map((n, i) => (
                <span key={n} className="composta-item inline-flex items-center gap-1.5">
                  {i > 0 && <span className="composta-plus text-muted-foreground/60 text-xs">+</span>}
                  <span className="composta-pill inline-flex items-center gap-1 rounded-full border bg-card/70 backdrop-blur px-2.5 py-1 text-[11px] font-bold">
                    <span className="composta-dot" aria-hidden="true" />
                    <span>{n}</span>
                  </span>
                </span>
              ))}
            </div>
          )}
          <div className="mt-4 h-1 w-24 mx-auto rounded-full bg-gradient-to-r from-primary to-accent" />
        </section>

        {/* Cabeçalho: dados de cadastro da precificação */}
        {presetCadastro && (
          <section className="report-section rounded-2xl border-2 border-border bg-card/60 backdrop-blur p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-1.5 w-6 rounded-full bg-gradient-to-r from-primary to-accent" />
              <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Identificação da Proposta
              </h2>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
              {[
                { label: "Proposta", value: presetCadastro.name },
                { label: "Cliente", value: presetCadastro.client_name },
                { label: "Código Salesforce", value: presetCadastro.salesforce_code },
                { label: "Código da cotação", value: presetCadastro.quote_code },
                { label: "Prazo de contrato", value: presetCadastro.contract_term },
                { label: "Gerente de contas", value: presetCadastro.account_manager },
                { label: "Especialista BU", value: presetCadastro.bu_specialist },
                { label: "Arquiteto BU", value: presetCadastro.bu_architect },
                {
                  label: "Emitido em",
                  value: new Date().toLocaleDateString("pt-BR"),
                },
              ]
                .filter((f) => f.value && String(f.value).trim() !== "")
                .map((f) => (
                  <div key={f.label} className="min-w-0">
                    <dt className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      {f.label}
                    </dt>
                    <dd className="text-sm font-semibold text-foreground mt-0.5 break-words">
                      {f.value}
                    </dd>
                  </div>
                ))}
            </dl>
          </section>
        )}

        {/* SMART MONITOR */}
        {monitorVisible && !unifiedMonitorFlow && (
        <TierBlock active={monitorVisible} color="bronze" icon={TierMonitorIcon} tierIndex={1}
          dominant={dominantColor === "bronze"}
          title={escopo.monitor.titulo} tagline={escopo.monitor.tagline}
          valor={valorMonitor}>
          {escopo.monitor.descricao && (
            <p className="text-xs text-muted-foreground leading-relaxed">{escopo.monitor.descricao}</p>
          )}
          {escopoFiltered.monitor.incluidos.length > 0 && (
            <>
              <SubTitle>O que está incluído</SubTitle>
              <ul className="space-y-1.5">
                {escopoFiltered.monitor.incluidos.map((t, i) => (
                  <Bullet key={i} color="bronze">{t}</Bullet>
                ))}
              </ul>
            </>
          )}
          {!state.tierOperation && !state.tierPerformance && !state.tierEnterprise && state.itsmFlowSelected && (
            <div className="mt-3 rounded border bg-background/70 p-3 flex items-center justify-between gap-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">ITSM integrado</div>
              <div className="text-sm font-semibold text-foreground">{state.itsmFlowSelected}</div>
            </div>
          )}
          {!flowVisible && (() => {
            const forceInv = state.tierOperation || state.tierPerformance || state.tierEnterprise;
            const src = forceInv ? "inventario" : (state.demandSource ?? "inventario");
            const manualTotal = (state.volumeChamadosAtivosManual || 0) + (state.volumeChamadosUsuariosManual || 0);
            const niveisRisco = ["Muito Baixo", "Baixo", "Padrão", "Alto", "Muito Alto"];
            const nivelRisco = state.criticidadeNivel ?? 2;
            return (
              <>
              <div className="mt-3 rounded border bg-background/70 p-3 flex items-center justify-between gap-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Estimativa de demanda</div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-foreground">
                    {src === "manual" ? "Volume informado" : "Calculada pelo inventário"}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {src === "manual"
                      ? `${formatNumber(manualTotal)} ch/mês (ativos + usuários) × custo unitário`
                      : "Taxas × quantidades cadastradas"}
                  </div>
                </div>
              </div>
              <div className="mt-2 rounded border bg-background/70 p-3 flex items-center justify-between gap-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Nível de geração de chamados</div>
                <div className="text-sm font-semibold text-foreground">{niveisRisco[nivelRisco]}</div>
              </div>
              </>
            );
          })()}
          {!flowVisible && (
          <>
          <SubTitle>Componentes monitorados</SubTitle>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Comp icon={Server} label="Servidores" qtd={state.qtdServidores} ativo />
            <Comp icon={Network} label="Ativos de Rede" qtd={state.qtdAtivosRede} ativo />
            <Comp icon={Database} label="Bancos de Dados" qtd={state.qtdBancosDados} ativo />
            <Comp icon={Shield} label="Firewall / Sistemas" qtd={state.qtdSistemas} ativo />
          </ul>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
            <Stat label="Total de ativos" value={formatNumber(sm.ativos)} />
            <Stat label="Chamados de monitoramento" value={`${formatNumber(sm.chamadosAtivos, 1)}/mês`} />
            <Stat label="Alocação N1 sobre monitor" value={`${state.percAlocacaoN1Monitor}%`} />
          </div>

          {(sm.qtdAtendentes > 0 || sm.qtdProxys > 0) && (
            <div className="mt-4">
              <SubTitle>Recursos dimensionados</SubTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sm.qtdAtendentes > 0 && (
                  <div className="rounded border bg-background/70 p-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Atendentes no ITSM</div>
                      <div className="text-lg font-bold leading-tight">{formatNumber(sm.qtdAtendentes)}</div>
                      <div className="text-[11px] text-muted-foreground">acessos</div>
                    </div>
                    <div className="report-price text-right">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Valor mensal</div>
                      <div className="text-base font-bold text-primary">{formatBRL(toSell(sm.custoAtendentes))}</div>
                    </div>
                  </div>
                )}
                {sm.qtdProxys > 0 && (
                  <div className="rounded border bg-background/70 p-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Proxys de monitoramento</div>
                      <div className="text-lg font-bold leading-tight">{formatNumber(sm.qtdProxys)}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {sm.qtdProxys === 1 ? "1 inicial" : `1 inicial + ${sm.qtdProxys - 1} adicional${sm.qtdProxys - 1 > 1 ? "is" : ""}`}
                      </div>
                    </div>
                    <div className="report-price text-right">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Valor mensal</div>
                      <div className="text-base font-bold text-primary">{formatBRL(toSell(sm.custoProxys))}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {!state.tierOperation && (state.horasN3MonitorManut > 0 || state.horasN3Monitor > 0) && (() => {
            const hManut = Math.max(0, state.horasN3MonitorManut || 0);
            const hAcion = Math.max(0, state.horasN3Monitor || 0);
            const hTotal = hManut + hAcion;
            const pctManut = hTotal > 0 ? (hManut / hTotal) * 100 : 0;
            const pctAcion = hTotal > 0 ? (hAcion / hTotal) * 100 : 0;
            return (
              <div className="mt-4">
                <SubTitle>Consumo das horas N3 / Manutenção e Automação</SubTitle>
                <div className="rounded border bg-background/70 p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Total contratado</span>
                    <span className="font-semibold">
                      {formatNumber(hTotal)}h<span className="report-price"> · {formatBRL(hTotal * state.valorHoraN3 * fatorVenda)}</span>
                    </span>
                  </div>
                <div className="flex h-3 overflow-hidden rounded-full border bg-muted">
                  {pctManut > 0 && (
                    <div className="bg-gradient-to-r from-sky-400 to-sky-500" style={{ width: `${pctManut}%` }} />
                  )}
                  {pctAcion > 0 && (
                    <div className="bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${pctAcion}%` }} />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded bg-sky-500/10 border border-sky-500/30 px-2 py-1.5">
                    <div className="text-muted-foreground text-[10px]">Manutenção e Automação · {pctManut.toFixed(0)}%</div>
                    <div className="font-semibold">{formatNumber(hManut)}h<span className="report-price"> · {formatBRL(sm.custoN3Manut * fatorVenda)}</span></div>
                    <div className="text-[10px] text-muted-foreground">Ajustes e tunings do monitoramento.</div>
                  </div>
                  <div className="rounded bg-amber-500/10 border border-amber-500/30 px-2 py-1.5">
                    <div className="text-muted-foreground text-[10px]">Atendimento N3 · {pctAcion.toFixed(0)}%</div>
                    <div className="font-semibold">{formatNumber(hAcion)}h<span className="report-price"> · {formatBRL(sm.custoN3 * fatorVenda)}</span></div>
                    <div className="text-[10px] text-muted-foreground">Tratamento de incidentes detectados.</div>
                  </div>
                </div>
                </div>
              </div>
            );
          })()}
          <CompositionBox title="Composição do valor mensal" total={valorMonitor} parts={valorMonitorParts} color="bronze" />
          </>
          )}
          {rotinasMonitor.length > 0 && (
            <>
              <SubTitle className="mt-4">Rotinas Técnicas Preventivas — Smart Monitor ({rotinasMonitor.length})</SubTitle>
              <p className="text-[11px] text-muted-foreground mb-2">
                Consumidas pelas horas de Manutenção e Automação do Smart Monitor.
              </p>
              <RoutineList items={rotinasMonitor} accent="bronze" />
            </>
          )}
          {gerenciaisDe("Monitor").length > 0 && (
            <>
              <SubTitle className="mt-4">Rotinas Gerenciais Selbetti ({gerenciaisDe("Monitor").length})</SubTitle>
              <p className="text-[11px] text-muted-foreground mb-2">
                Precificadas em separado — não abatem das horas contratadas para atuação técnica.
              </p>
              <RoutineList items={gerenciaisDe("Monitor")} accent="bronze" />
            </>
          )}
        </TierBlock>
        )}

        {/* SMART FLOW */}
        {flowVisible && (
        <TierBlock active={flowVisible} color="steel" icon={TierFlowIcon} tierIndex={2}
          dominant={dominantColor === "steel"}
          title={escopoFlowDisplay.titulo} tagline={escopoFlowDisplay.tagline}
          valor={unifiedMonitorFlow ? valorMonitor + valorFlow : valorFlow}>
          {escopoFlowDisplay.descricao && (
            <p className="text-xs text-muted-foreground leading-relaxed">{escopoFlowDisplay.descricao}</p>
          )}
          {escopoFlowDisplay.incluidos.length > 0 && (
            <>
              <SubTitle>O que está incluído</SubTitle>
              <ul className="space-y-1.5">
                {escopoFlowDisplay.incluidos.map((t, i) => (
                  <Bullet key={i} color="steel">{t}</Bullet>
                ))}
              </ul>
            </>
          )}
          {unifiedMonitorFlow && (
            <>
              <SubTitle>Componentes monitorados</SubTitle>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Comp icon={Server} label="Servidores" qtd={state.qtdServidores} ativo />
                <Comp icon={Network} label="Ativos de Rede" qtd={state.qtdAtivosRede} ativo />
                <Comp icon={Database} label="Bancos de Dados" qtd={state.qtdBancosDados} ativo />
                <Comp icon={Shield} label="Firewall / Sistemas" qtd={state.qtdSistemas} ativo />
              </ul>
            </>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
            <Stat label="Ativos integrados" value={formatNumber(sf.ativos)} />
            <Stat label="Chamados de monitoramento" value={`${formatNumber(sf.chamadosAtivos, 1)}/mês`} />
            <Stat label="Alocação N1 sobre Flow" value={`${state.percAlocacaoN1Flow}%`} />
          </div>
          {(() => {
            const forceInv = state.tierOperation || state.tierPerformance || state.tierEnterprise;
            const src = forceInv ? "inventario" : (state.demandSource ?? "inventario");
            const manualTotal = (state.volumeChamadosAtivosManual || 0) + (state.volumeChamadosUsuariosManual || 0);
            const niveisRisco = ["Muito Baixo", "Baixo", "Padrão", "Alto", "Muito Alto"];
            const nivelRisco = state.criticidadeNivel ?? 2;
            return (
              <>
              <div className="mt-3 rounded border bg-background/70 p-3 flex items-center justify-between gap-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Estimativa de demanda</div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-foreground">
                    {src === "manual" ? "Volume informado" : "Calculada pelo inventário"}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {src === "manual"
                      ? `${formatNumber(manualTotal)} ch/mês (ativos + usuários) × custo unitário`
                      : "Taxas × quantidades cadastradas"}
                  </div>
                </div>
              </div>
              <div className="mt-2 rounded border bg-background/70 p-3 flex items-center justify-between gap-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Nível de geração de chamados</div>
                <div className="text-sm font-semibold text-foreground">{niveisRisco[nivelRisco]}</div>
              </div>
              </>
            );
          })()}

          {(sf.qtdAtendentes > 0 || sf.qtdProxys > 0) && (
            <div className="mt-4">
              <SubTitle>Recursos dimensionados</SubTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sf.qtdAtendentes > 0 && (
                  <div className="rounded border bg-background/70 p-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Atendentes no ITSM</div>
                      <div className="text-lg font-bold leading-tight">{formatNumber(sf.qtdAtendentes)}</div>
                      <div className="text-[11px] text-muted-foreground">acessos</div>
                    </div>
                    <div className="report-price text-right">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Valor mensal</div>
                      <div className="text-base font-bold text-primary">{formatBRL(toSell(sf.custoAtendentes))}</div>
                    </div>
                  </div>
                )}
                {sf.qtdProxys > 0 && (
                  <div className="rounded border bg-background/70 p-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Proxys da camada Flow</div>
                      <div className="text-lg font-bold leading-tight">{formatNumber(sf.qtdProxys)}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {sf.qtdProxys === 1 ? "1 inicial" : `1 inicial + ${sf.qtdProxys - 1} adicional${sf.qtdProxys - 1 > 1 ? "is" : ""}`}
                      </div>
                    </div>
                    <div className="report-price text-right">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Valor mensal</div>
                      <div className="text-base font-bold text-primary">{formatBRL(toSell(sf.custoProxys))}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {!state.tierOperation && (sf.horasN3Manut > 0 || sf.horasN3 > 0) && (() => {
            const hManut = Math.max(0, sf.horasN3Manut || 0);
            const hAcion = Math.max(0, sf.horasN3 || 0);
            const hTotal = hManut + hAcion;
            const pctManut = hTotal > 0 ? (hManut / hTotal) * 100 : 0;
            const pctAcion = hTotal > 0 ? (hAcion / hTotal) * 100 : 0;
            return (
              <div className="mt-4">
                <SubTitle>Consumo das horas N3 / Manutenção e Automação</SubTitle>
                <div className="rounded border bg-background/70 p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Total contratado</span>
                    <span className="font-semibold">
                      {formatNumber(hTotal)}h<span className="report-price"> · {formatBRL(hTotal * state.valorHoraN3 * fatorVenda)}</span>
                    </span>
                  </div>
                  <div className="flex h-3 overflow-hidden rounded-full border bg-muted">
                    {pctManut > 0 && (
                      <div className="bg-gradient-to-r from-sky-400 to-sky-500" style={{ width: `${pctManut}%` }} />
                    )}
                    {pctAcion > 0 && (
                      <div className="bg-gradient-to-r from-cyan-400 to-cyan-600" style={{ width: `${pctAcion}%` }} />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded bg-sky-500/10 border border-sky-500/30 px-2 py-1.5">
                      <div className="text-muted-foreground text-[10px]">Manutenção e Automação · {pctManut.toFixed(0)}%</div>
                      <div className="font-semibold">{formatNumber(hManut)}h<span className="report-price"> · {formatBRL(sf.custoN3Manut * fatorVenda)}</span></div>
                      <div className="text-[10px] text-muted-foreground">Tratamento contínuo e automações de eventos.</div>
                    </div>
                    <div className="rounded bg-cyan-500/10 border border-cyan-500/30 px-2 py-1.5">
                      <div className="text-muted-foreground text-[10px]">Atendimento N3 · {pctAcion.toFixed(0)}%</div>
                      <div className="font-semibold">{formatNumber(hAcion)}h<span className="report-price"> · {formatBRL(sf.custoN3 * fatorVenda)}</span></div>
                      <div className="text-[10px] text-muted-foreground">Horas técnicas sob demanda.</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          <CompositionBox
            title="Composição do valor mensal"
            total={unifiedMonitorFlow ? valorMonitor + valorFlow : valorFlow}
            parts={unifiedMonitorFlow ? [...valorMonitorParts, ...valorFlowParts] : valorFlowParts}
            color="steel"
          />
          {rotinasFlow.length > 0 && (
            <>
              <SubTitle className="mt-4">Rotinas Técnicas Preventivas — Smart Flow ({rotinasFlow.length})</SubTitle>
              <p className="text-[11px] text-muted-foreground mb-2">
                Consumidas pelas horas de Manutenção e Automação do Smart Flow.
              </p>
              <RoutineList items={rotinasFlow} accent="steel" />
            </>
          )}
          {gerenciaisDe("Flow").length > 0 && (
            <>
              <SubTitle className="mt-4">Rotinas Gerenciais Selbetti ({gerenciaisDe("Flow").length})</SubTitle>
              <p className="text-[11px] text-muted-foreground mb-2">
                Precificadas em separado — não abatem das horas contratadas para atuação técnica.
              </p>
              <RoutineList items={gerenciaisDe("Flow")} accent="steel" />
            </>
          )}
        </TierBlock>
        )}

        {/* SMART OPERATION */}
        <TierBlock active={state.tierOperation} color="silver" icon={TierOperationIcon} tierIndex={3}
          dominant={dominantColor === "silver"}
          title={escopo.operation.titulo} tagline={escopo.operation.tagline}
          valor={valorOperation}>
          {escopo.operation.descricao && (
            <p className="text-xs text-muted-foreground leading-relaxed">{escopo.operation.descricao}</p>
          )}
          {escopoFiltered.operation.incluidos.length > 0 && (
            <>
              <SubTitle>O que está incluído</SubTitle>
              <ul className="space-y-1.5">
                {escopoFiltered.operation.incluidos.map((t, i) => (
                  <Bullet key={i} color="silver">{t}</Bullet>
                ))}
              </ul>
            </>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
            <Stat label="Volume N1" value={`${formatNumber(results.volumeN1, 1)} ch/mês`} />
            <Stat label="Volume N2" value={`${formatNumber(results.volumeN2, 1)} ch/mês`} />
            <div className="report-price"><Stat label="Custo/chamado N1" value={formatBRL(results.custoPorChamadoN1)} /></div>
          </div>

          {rotinasOp.length > 0 && (
            <>
              <SubTitle className="mt-4">Rotinas Técnicas Preventivas — Smart Operation ({rotinasOp.length})</SubTitle>
              <RoutineList items={rotinasOp} accent="silver" />
            </>
          )}
          {gerenciaisDe("Operation").length > 0 && (
            <>
              <SubTitle className="mt-4">Rotinas Gerenciais Selbetti ({gerenciaisDe("Operation").length})</SubTitle>
              <p className="text-[11px] text-muted-foreground mb-2">
                Precificadas em separado — não abatem das horas contratadas para atuação técnica.
              </p>
              <RoutineList items={gerenciaisDe("Operation")} accent="silver" />
            </>
          )}

          {gmudOperationData.items.length > 0 && (
            <>
              <SubTitle className="mt-4">GMUDs incluídas — Operation ({gmudOperationData.items.length})</SubTitle>
              <GmudReportTable items={gmudOperationData.items} totals={gmudOperationData.totals} accent="silver" toSell={toSell} />
            </>
          )}

          {(!n3OptionalScenario || state.tierOperationN3) && !state.tierPerformance && state.horasN3Mensais > 0 && (
            <N3HoursBox
              total={state.horasN3Mensais}
              consumidas={horasAtendN3}
              previstas={horasPrev}
              chamadosN3={results.volumeN3}
              tempoMedio={state.tempoMedioChamadoN3}
              valorHora={valorHoraN3Venda}
              modo="operation"
              horasRotinas={horasRotinasOpN3}
              horasMelhoria={horasMelhoriaOp}
            />
          )}

          {/* FIELD SERVICE — sub-oferta dentro do Smart Operation */}
          {state.tierFieldOperation && (
            <div className="mt-5 rounded-2xl border-2 border-amber-300/70 dark:border-amber-700/60 bg-gradient-to-br from-amber-50/60 via-background/40 to-orange-50/40 dark:from-amber-950/30 dark:to-orange-950/20 p-4 space-y-3 shadow-inner">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="rounded-xl p-2 bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-white shadow-md">
                  <Wrench className="h-4 w-4" strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-[160px]">
                  <p className="text-sm font-extrabold tracking-tight">{escopo.fieldService.titulo}</p>
                  <p className="text-[11px] text-muted-foreground italic">{escopo.fieldService.tagline}</p>
                </div>
                {valorFieldService > 0 && (
                  <div className="report-price text-right shrink-0">
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Valor mensal</p>
                    <p className="text-base font-extrabold bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-300 dark:to-orange-300 bg-clip-text text-transparent tabular-nums">{formatBRL(valorFieldService)}</p>
                  </div>
                )}
              </div>
              {escopo.fieldService.descricao && (
                <p className="text-xs text-muted-foreground leading-relaxed">{escopo.fieldService.descricao}</p>
              )}
              {escopoFiltered.fieldService.incluidos.length > 0 && (
                <>
                  <SubTitle>O que está incluído</SubTitle>
                  <ul className="space-y-1.5">
                    {escopoFiltered.fieldService.incluidos.map((t, i) => (
                      <Bullet key={i} color="amber">{t}</Bullet>
                    ))}
                  </ul>
                </>
              )}
              <SubTitle>Equipe presencial alocada</SubTitle>
              <div className="grid grid-cols-3 gap-2">
                <Stat label="N1F" value={`${state.fieldDirectQtdN1} prof.`} subClassName="report-price" sub={formatBRL(fs.custoN1F)} />
                <Stat label="N2F" value={`${state.fieldDirectQtdN2} prof.`} subClassName="report-price" sub={formatBRL(fs.custoN2F)} />
                <Stat label="N3F" value={`${state.fieldDirectQtdN3} prof.`} subClassName="report-price" sub={formatBRL(fs.custoN3F)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Stat label="Equipamentos cobertos" value={formatNumber(state.qtdEquipamentos)} />
                <Stat label="Chamados escalados ao Field" value={`${formatNumber(fs.volumeUsuariosEscalado, 1)}/mês`} />
              </div>
              {fs.overflowAtivo && (
                <div className="rounded-lg border border-amber-300 bg-amber-100/40 dark:bg-amber-900/20 p-3 text-xs">
                  <strong>Transbordo ativo:</strong> {formatNumber(fs.volumeTransbordoN1Remoto, 1)} ch/mês excedem capacidade presencial e são tratados via N1 remoto + N2F.
                </div>
              )}
              {rotinasField.length > 0 && (
                <>
                  <SubTitle>Rotinas Field — Microinformática ({rotinasField.length})</SubTitle>
                  <RoutineList items={rotinasField} accent="amber" />
                </>
              )}
              <CompositionBox title="Composição Field Service de Microinformática" total={valorFieldService} parts={valorFieldParts} color="amber" />
            </div>
          )}
          <CompositionBox title="Composição do valor mensal" total={valorOperation} parts={valorOperationParts} color="silver" />
        </TierBlock>

        {/* SMART PERFORMANCE */}
        <TierBlock active={state.tierPerformance} color="gold" icon={TierPerformanceIcon} tierIndex={4}
          dominant={dominantColor === "gold"}
          title={escopo.performance.titulo} tagline={escopo.performance.tagline}
          valor={valorPerformance}>
          {escopo.performance.descricao && (
            <p className="text-xs text-muted-foreground leading-relaxed">{escopo.performance.descricao}</p>
          )}
          {escopoFiltered.performance.incluidos.length > 0 && (
            <>
              <SubTitle>O que está incluído</SubTitle>
              <ul className="space-y-1.5">
                {escopoFiltered.performance.incluidos.map((t, i) => (
                  <Bullet key={i} color="gold">{t}</Bullet>
                ))}
              </ul>
            </>
          )}

          {rotinasPerfPadrao.length > 0 && (
            <>
              <SubTitle className="mt-4">Rotinas Técnicas Preventivas — Smart Performance · Ambiente Padrão ({rotinasPerfPadrao.length})</SubTitle>
              <RoutineList items={rotinasPerfPadrao} accent="gold" />
            </>
          )}

          {algumComplexAtivo && rotinasPerfComplexo.length > 0 && (
            <>
              <SubTitle className="mt-4">Rotinas Técnicas Preventivas — Smart Performance · Ambiente Complexo ({rotinasPerfComplexo.length})</SubTitle>
              <RoutineList items={rotinasPerfComplexo} accent="gold" complexo />
            </>
          )}
          {gerenciaisDe("Performance").length > 0 && (
            <>
              <SubTitle className="mt-4">Rotinas Gerenciais Selbetti ({gerenciaisDe("Performance").length})</SubTitle>
              <p className="text-[11px] text-muted-foreground mb-2">
                Precificadas em separado — não abatem das horas contratadas para atuação técnica.
              </p>
              <RoutineList items={gerenciaisDe("Performance")} accent="gold" />
            </>
          )}

          {gmudPerformanceData.items.length > 0 && (
            <>
              <SubTitle className="mt-4">GMUDs incluídas — Performance ({gmudPerformanceData.items.length})</SubTitle>
              <GmudReportTable items={gmudPerformanceData.items} totals={gmudPerformanceData.totals} accent="gold" toSell={toSell} />
            </>
          )}

          {state.tierPerformance && (!n3OptionalScenario || state.tierOperationN3) && state.horasN3Mensais > 0 && (
            <N3HoursBox
              total={state.horasN3Mensais}
              consumidas={horasAtendN3}
              previstas={horasPrev}
              chamadosN3={results.volumeN3}
              tempoMedio={state.tempoMedioChamadoN3}
              valorHora={valorHoraN3Venda}
              modo="performance"
              horasRotinas={horasRotinasN3}
              horasMelhoria={horasMelhoriaPerf}
              alocacao={{ tam: horasTamN3, owner: horasOwnerN3 }}
            />
          )}
          <CompositionBox title="Composição do valor mensal" total={valorPerformance} parts={valorPerformanceParts} color="gold" />
        </TierBlock>

        {/* SMART ENTERPRISE */}
        <TierBlock active={state.tierEnterprise} color="diamond" icon={TierEnterpriseIcon} tierIndex={5}
          dominant={dominantColor === "diamond"}
          title={escopo.enterprise.titulo} tagline={escopo.enterprise.tagline} valor={0}>
          {escopo.enterprise.descricao && (
            <p className="text-xs text-muted-foreground leading-relaxed">{escopo.enterprise.descricao}</p>
          )}
          {escopoFiltered.enterprise.incluidos.length > 0 && (
            <>
              <SubTitle>O que está incluído</SubTitle>
              <ul className="space-y-1.5">
                {escopoFiltered.enterprise.incluidos.map((t, i) => (
                  <Bullet key={i} color="diamond">{t}</Bullet>
                ))}
              </ul>
            </>
          )}
        </TierBlock>

        {/* INVESTIMENTO */}
        <Card className="report-section border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Investimento Mensal Total{dominantOffer ? ` · ${dominantOffer.name}` : ""}
                </p>
                <p className="mt-1 text-3xl md:text-4xl font-bold text-primary">{formatBRL(investimentoTotal)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Valor mensal de contrato{contractTerm ? ` · Prazo: ${contractTerm}` : ""}
                </p>
              </div>
              <div className="text-right text-xs space-y-1">
                <div><span className="text-muted-foreground">Anual: </span><strong>{formatBRL(investimentoTotal * 12)}</strong></div>
                <div>
                  <span className="text-muted-foreground">Total do contrato ({mesesContrato} {mesesContrato === 1 ? "mês" : "meses"}): </span>
                  <strong>{formatBRL(investimentoTotal * mesesContrato)}</strong>
                </div>
              </div>
            </div>
            <div className="mt-4 border-t border-primary/20 pt-3 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
                Componentes da oferta{dominantOffer ? ` ${dominantOffer.name}` : ""}
              </p>
              {unifiedMonitorFlow ? (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Monitor + Flow</span>
                  <span className="font-semibold tabular-nums">{formatBRL(valorMonitor + valorFlow)}</span>
                </div>
              ) : (
                <>
              {monitorVisible && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Monitor</span>
                  <span className="font-semibold tabular-nums">{formatBRL(valorMonitor)}</span>
                </div>
              )}
              {flowVisible && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Flow</span>
                  <span className="font-semibold tabular-nums">{formatBRL(valorFlow)}</span>
                </div>
              )}
                </>
              )}
              {state.tierOperation && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Operation{state.tierFieldOperation ? " (com Field Service de Microinformática)" : ""}</span>
                  <span className="font-semibold tabular-nums">{formatBRL(valorOperation)}</span>
                </div>
              )}
              {state.tierPerformance && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Performance</span>
                  <span className="font-semibold tabular-nums">{formatBRL(valorPerformance)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-primary/30 pt-1.5 mt-1">
                <span className="text-xs font-bold">Total mensal</span>
                <span className="text-sm font-extrabold text-primary tabular-nums">{formatBRL(investimentoTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs font-bold">Total do contrato ({mesesContrato} {mesesContrato === 1 ? "mês" : "meses"})</span>
                <span className="text-sm font-extrabold text-primary tabular-nums">{formatBRL(investimentoTotal * mesesContrato)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ITENS ADICIONAIS AO CONTRATO */}
        {(() => {
          if (!itensAdicionais || itensAdicionais.length === 0) return null;
          const escala = state.criticidadeEscala ?? [];
          const ajuste = escala[state.criticidadeNivel] ?? 0;
          const adj = (t: number) => Math.max(0, t * (1 + ajuste));
          const monitorActive = state.tierMonitor;
          // Visibilidade por item: coerente com camadas ativas e inventário.
          const isItemVisible = (it: ItemAdicional): boolean => {
            switch (it.tipo) {
              case "monitorado-servidor":
                return monitorVisible && (state.qtdServidores || 0) > 0;
              case "monitorado-rede":
              case "monitorado-firewall":
                return monitorVisible && (state.qtdAtivosRede || 0) > 0;
              case "monitorado-bd":
                return monitorVisible && (state.qtdBancosDados || 0) > 0;
              case "monitorado-sistema":
                return monitorVisible && (state.qtdSistemas || 0) > 0;
              case "proxy":
                // Proxy adicional faz sentido quando há coleta (Monitor ou Flow)
                return monitorVisible || flowVisible;
              case "itsm":
                // Acesso ao ITSM é exclusivo do Smart Flow
                return flowVisible;
              case "hora-n3":
                // Horas N3 avulsas só com Operation ou Performance ativos
                return state.tierOperation || state.tierPerformance;
              case "tam":
              case "owner":
                // Governança executiva — depende do Smart Enterprise
                return state.tierEnterprise;
              case "fixo":
              default:
                return true;
            }
          };
          const itensVisiveis = itensAdicionais.filter(isItemVisible);
          if (itensVisiveis.length === 0) return null;
          // Custo base por chamado (sem markup)
          const cppN1 = results.custoPorChamadoN1;
          const cppN2 = results.custoPorChamadoN2;
          const cN3perChamado = state.valorHoraN3 * state.tempoMedioChamadoN3;
          const pesos2 = state.monitorPesos ?? { servidores: 1, bancoDados: 1.2, firewall: 0.7, ativosRede: 0.5 };
          const faixas2 = state.monitorFaixas ?? [];
          const umInvAtual2 =
            (state.qtdServidores || 0) * pesos2.servidores +
            (state.qtdBancosDados || 0) * pesos2.bancoDados +
            (state.qtdSistemas || 0) * pesos2.firewall +
            (state.qtdAtivosRede || 0) * pesos2.ativosRede;
          const custoPorUMMarginal2 = (() => {
            const um = Math.max(0, umInvAtual2);
            for (const f of faixas2) if (um > f.de && um <= f.ate) return f.custoPorUM || 0;
            return faixas2.length > 0 ? faixas2[faixas2.length - 1].custoPorUM || 0 : 0;
          })();
          const computeMonitoradoUnit = (taxa: number, peso: number): { custo: number; chamados: number } => {
            const chamadosBrutos = adj(taxa);
            const chamadosLiq = chamadosBrutos * (1 - state.reducaoN0 / 100);
            const vN1 = chamadosLiq * (state.percN1 / 100);
            const vN2 = chamadosLiq * (state.percN2 / 100);
            const vN3 = chamadosLiq * (state.percN3 / 100);
            const custoIncidentes = cppN1 * vN1 + cppN2 * vN2 + cN3perChamado * vN3;
            const custoMonit = custoPorUMMarginal2 * peso;
            // Parcela de N1 alocada ao Smart Monitor (quando Operation inativo)
            const custoN1Aloc = monitorActive && !state.tierOperation
              ? (state.percAlocacaoN1Monitor / 100) * cppN1 * chamadosLiq
              : 0;
            return { custo: custoIncidentes + custoMonit + custoN1Aloc, chamados: chamadosLiq };
          };
          const valorFinal = (custo: number) => custo * fatorVenda;

          const computeItem = (it: ItemAdicional): { valor: number; detalhe?: string } => {
            if (typeof it.valorManual === "number" && it.valorManual > 0) {
              return { valor: it.valorManual };
            }
            switch (it.tipo) {
              case "monitorado-servidor": {
                const r = computeMonitoradoUnit(state.taxaServidor, pesos2.servidores);
                return { valor: valorFinal(r.custo), detalhe: `${formatNumber(r.chamados, 1)} ch/mês previstos` };
              }
              case "monitorado-rede":
              case "monitorado-firewall": {
                const r = computeMonitoradoUnit(state.taxaRede, pesos2.ativosRede);
                return { valor: valorFinal(r.custo), detalhe: `${formatNumber(r.chamados, 1)} ch/mês previstos` };
              }
              case "monitorado-bd": {
                const r = computeMonitoradoUnit(state.taxaBancoDados, pesos2.bancoDados);
                return { valor: valorFinal(r.custo), detalhe: `${formatNumber(r.chamados, 1)} ch/mês previstos` };
              }
              case "monitorado-sistema": {
                const r = computeMonitoradoUnit(state.taxaSistemas, pesos2.firewall);
                return { valor: valorFinal(r.custo), detalhe: `${formatNumber(r.chamados, 1)} ch/mês previstos` };
              }
              case "proxy":
                return { valor: (state.valorProxyAdicional || 0) * fatorVenda };
              case "hora-n3":
                return { valor: valorHoraN3Venda };
              case "itsm":
              case "tam":
              case "owner":
              case "fixo":
              default:
                return { valor: it.valorManual ?? 0 };
            }
          };

          return (
            <Card className="report-section border-primary/20">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <PackagePlus className="h-4 w-4 text-primary" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                    Itens adicionais ao contrato
                  </p>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug report-price">
                  Itens cobrados como adicionais ao escopo contratado. Para ativos monitorados,
                  o valor unitário considera o custo de monitoramento e os chamados previstos
                  (incidentes ponderados no funil N1/N2/N3 do contrato), com markup de margem
                  e impostos. Para os demais, valor unitário conforme contrato.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-1.5 px-2 font-semibold">Item</th>
                        <th className="text-left py-1.5 px-2 font-semibold">Unidade</th>
                        <th className="text-right py-1.5 px-2 font-semibold report-price">Valor unitário</th>
                        <th className="text-left py-1.5 px-2 font-semibold">Observação</th>
                      </tr>
                    </thead>
                    <tbody>
                       {itensVisiveis.map((it) => {
                        const { valor, detalhe } = computeItem(it);
                        return (
                          <tr key={it.id} className="border-b border-muted-foreground/10 align-top">
                            <td className="py-1.5 px-2 font-medium text-foreground">{it.descricao}</td>
                            <td className="py-1.5 px-2 text-muted-foreground">{it.unidade}</td>
                            <td className="py-1.5 px-2 text-right font-semibold tabular-nums report-price">
                              {formatBRL(valor)}
                              {detalhe && (
                                <div className="text-[10px] font-normal text-muted-foreground">{detalhe}</div>
                              )}
                            </td>
                            <td className="py-1.5 px-2 text-muted-foreground leading-snug">
                              {it.observacao}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-muted-foreground italic report-price">
                  Valores mensais sugeridos. Itens marcados como “manual” usam o valor fixo
                  cadastrado em Configurações › Escopo.
                </p>
              </CardContent>
            </Card>
          );
        })()}

        {/* RESTRIÇÕES DE ATUAÇÃO — bloco compacto por camada ativa */}
        {(() => {
          const ativos: CamadaKey[] = [];
          if (monitorVisible) ativos.push("monitor");
          if (flowVisible) ativos.push("flow");
          if (state.tierOperation) ativos.push("operation");
          if (state.tierFieldOperation) ativos.push("fieldService");
          if (state.tierPerformance) ativos.push("performance");
          if (state.tierEnterprise) ativos.push("enterprise");
          const blocos = ativos
            .map((k) => ({ k, items: (escopo[k]?.restricoes ?? []).filter((r) => r.trim()) }))
            .filter((b) => b.items.length > 0);
          if (blocos.length === 0) return null;
          const gerais = restricoesGerais.filter((r) => r.trim().length > 0);
          return (
            <Card className="border-muted-foreground/20 bg-muted/20">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-muted-foreground" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                    Restrições de atuação
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {blocos.map((b) => (
                    <div key={b.k} className="rounded-lg border bg-background/70 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/80 mb-1.5">
                        {CAMADA_LABEL[b.k]}
                      </p>
                      <ul className="space-y-1 text-[11px] text-muted-foreground leading-snug">
                        {b.items.map((t, i) => (
                          <li key={i} className="flex gap-1.5">
                            <span className="text-muted-foreground/60">·</span>
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                {gerais.length > 0 && (
                  <div className="rounded-lg border border-dashed bg-background/50 p-3 mt-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/80 mb-1.5">
                      Restrições Gerais
                    </p>
                    <ul className="space-y-1 text-[11px] text-muted-foreground leading-snug">
                      {gerais.map((t, i) => (
                        <li key={i} className="flex gap-1.5">
                          <span className="text-muted-foreground/60">·</span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground italic">
                  Itens fora deste escopo podem ser atendidos sob demanda mediante orçamento específico.
                </p>
              </CardContent>
            </Card>
          );
        })()}
        {isSavedPricing && (
          <div className="mt-8 pt-4 border-t border-border/40 text-center text-[11px] text-muted-foreground italic">
            <div>
              Precificação: <span className="font-medium not-italic text-foreground">{activePreset.name}</span>
            </div>
            <div>Exportado em {new Date().toLocaleString("pt-BR")}</div>
          </div>
        )}
      </WriteFence>
      </main>
    </div>
  );
}

/* ===== Subcomponents ===== */

function CompositionBox({
  title,
  total,
  parts,
  color,
}: {
  title: string;
  total: number;
  parts: { label: string; value: number }[];
  color: string;
}) {
  const theme = TIER_THEMES[color] ?? TIER_THEMES.silver;
  if (parts.length < 2 || total <= 0) return null;
  return (
    <div className={`report-price mt-4 rounded-xl border-2 ${theme.ring} bg-background/70 backdrop-blur-sm p-3 space-y-1.5`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
      {parts.map((p, i) => (
        <div key={i} className="flex justify-between text-[12px]">
          <span className="text-muted-foreground">{i === 0 ? "" : "+ "}{p.label}</span>
          <span className="font-semibold tabular-nums">{formatBRL(p.value)}</span>
        </div>
      ))}
      <div className="flex justify-between border-t border-dashed pt-1.5 mt-1">
        <span className="text-[12px] font-bold">Total</span>
        <span className={`text-sm font-extrabold tabular-nums bg-gradient-to-r ${theme.valueGrad} bg-clip-text text-transparent`}>{formatBRL(total)}</span>
      </div>
    </div>
  );
}

function TierBlock({
  active, color, icon: Icon, title, tagline, valor, children, tierIndex, dominant,
}: {
  active: boolean; color: string; icon: React.ElementType;
  title: string; tagline: string; valor: number;
  tierIndex?: number; children?: React.ReactNode; dominant?: boolean;
}) {
  const theme = TIER_THEMES[color] ?? TIER_THEMES.silver;
  const alias = TIER_ALIAS[color];
  const AliasIcon = alias?.icon;
  if (!active) {
    return (
      <div className="relative rounded-3xl border-2 border-dashed border-muted-foreground/25 bg-muted/10 p-5 opacity-60">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl p-3 bg-muted text-muted-foreground"><Icon className="h-5 w-5" /></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-muted-foreground">{title}</p>
              <Badge variant="secondary" className="text-[9px]"><Circle className="h-2.5 w-2.5 mr-1" />Não incluso</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground italic mt-0.5">{tagline}</p>
          </div>
          {alias && AliasIcon && (
            <div className="ml-auto flex items-center gap-1.5 rounded-full border border-dashed px-2.5 py-1 text-muted-foreground">
              <AliasIcon className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em]">{alias.name}</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return (
    <div data-tier={color} className={`report-section group relative overflow-hidden rounded-3xl border-2 ${theme.ring} bg-gradient-to-br ${theme.bg} shadow-xl ${theme.glow} transition-all hover:shadow-2xl ${dominant ? "ring-4 ring-offset-2 ring-offset-background ring-current/30 scale-[1.005]" : ""}`}>
      {/* Decorative blobs */}
      <div className={`pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full blur-3xl ${theme.blob1}`} />
      <div className={`pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full blur-3xl ${theme.blob2}`} />
      <div className={`h-2 w-full bg-gradient-to-r ${theme.bar}`} />

      <div className="relative p-6 space-y-4">
        {/* Header row: icon + title + badge + value, all in one flex line — no absolute overlap */}
        <div className="flex items-start gap-4 flex-wrap">
          <div data-tier-icon className={`relative rounded-2xl p-3.5 shadow-lg ${theme.icon} transition-transform group-hover:scale-110 group-hover:rotate-3`}>
            <Icon className="h-6 w-6" strokeWidth={2.25} />
            {tierIndex && (
              <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-background border-2 border-current text-[10px] font-extrabold flex items-center justify-center text-foreground">
                {tierIndex}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-[180px]">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-extrabold tracking-tight">{title}</h3>
            </div>
            <p className={`tier-tagline text-[11px] font-semibold mt-1.5 inline-block px-2.5 py-1 rounded-full ${theme.chip}`}>{tagline}</p>
          </div>
          {alias && AliasIcon && (
            <div className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 shadow-md ${theme.badge} text-white`}>
              <AliasIcon className="h-4 w-4" strokeWidth={2.5} />
              <span className="text-[11px] font-extrabold uppercase tracking-[0.2em]">{alias.name}</span>
            </div>
          )}
          {valor > 0 && (
            <div className="report-price text-right shrink-0">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Valor mensal</p>
              <p className={`text-xl font-extrabold bg-gradient-to-r ${theme.valueGrad} bg-clip-text text-transparent tabular-nums`}>{formatBRL(valor)}</p>
            </div>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

function SubTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Star className="h-3 w-3 text-primary fill-primary/30" />
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/70">{children}</p>
      <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
    </div>
  );
}

function Bullet({ children, color }: { children: React.ReactNode; color: string }) {
  const theme = TIER_THEMES[color];
  return (
    <li className="flex items-start gap-2.5 text-[13px] leading-relaxed group/b">
      <div className={`mt-0.5 shrink-0 rounded-full p-0.5 bg-background/80 shadow-sm transition-transform group-hover/b:scale-110`}>
        <CheckCircle2 className={`h-4 w-4 ${theme?.check ?? "text-primary"}`} strokeWidth={2.5} />
      </div>
      <span className="text-foreground/90">{children}</span>
    </li>
  );
}

function Stat({ label, value, sub, subClassName }: { label: string; value: string; sub?: string; subClassName?: string }) {
  return (
    <div className="rounded-xl border bg-background/80 backdrop-blur-sm px-3 py-2.5 transition-all hover:shadow-md hover:-translate-y-0.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className="text-sm font-extrabold mt-0.5 tabular-nums">{value}</p>
      {sub && <p className={`text-[10px] text-muted-foreground tabular-nums ${subClassName ?? ""}`}>{sub}</p>}
    </div>
  );
}

function Comp({ icon: Icon, label, qtd, ativo }: { icon: React.ElementType; label: string; qtd: number; ativo: boolean }) {
  const enabled = qtd > 0 && ativo;
  return (
    <li className={`flex items-center justify-between rounded-xl border bg-background/80 backdrop-blur-sm px-3 py-2.5 transition-all hover:shadow-md hover:-translate-y-0.5 ${!enabled ? "opacity-50" : ""}`}>
      <span className="flex items-center gap-2.5 text-[12.5px] font-medium">
        <span className="rounded-lg p-1.5 bg-gradient-to-br from-sky-500/15 to-cyan-500/15 text-sky-600 dark:text-sky-300">
          <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
        </span>
        {label}
      </span>
      <span className="text-sm font-extrabold tabular-nums">{formatNumber(qtd)}</span>
    </li>
  );
}

function RoutineList({
  items, accent, complexo,
}: {
  items: { id: string; grupo: string; rotina: string; freq: string; demanda: number }[];
  accent: string; complexo?: boolean;
}) {
  const theme = TIER_THEMES[accent];
  const totalDemanda = items.reduce((a, b) => a + b.demanda, 0);
  return (
    <div className="rounded-xl border bg-background/80 backdrop-blur-sm overflow-hidden shadow-sm">
      <table className="w-full text-[11.5px]">
        <thead className={`bg-gradient-to-r ${theme?.bar ?? "from-primary to-primary"} text-white`}>
          <tr>
            <th className="text-left px-3 py-2 font-bold uppercase tracking-wider text-[10px]">Rotina</th>
            <th className="text-left px-3 py-2 font-bold uppercase tracking-wider text-[10px] w-28">Frequência</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i, idx) => (
            <tr key={i.id} className={`border-t ${idx % 2 ? "bg-muted/30" : ""} hover:bg-muted/50 transition-colors`}>
              <td className="px-3 py-2">
                <ListChecks className={`inline h-3.5 w-3.5 mr-1.5 ${theme?.check ?? "text-primary"}`} strokeWidth={2.5} />
                <span className="text-muted-foreground">{i.grupo} · </span><span className="font-medium">{i.rotina}</span>
              </td>
              <td className="px-3 py-2 text-muted-foreground">{i.freq}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t bg-muted/40">
            <td className="px-3 py-2 font-bold uppercase tracking-wider text-[10px]" colSpan={1}>
              Total previsto {complexo ? "(execuções/mês)" : "(chamados/mês)"}
            </td>
            <td className="px-3 py-2 text-right tabular-nums font-extrabold">{totalDemanda.toFixed(1)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function GmudReportTable({
  items, totals, accent, toSell,
}: {
  items: GmudComputed[];
  totals: { chamados: number; horasN3: number; custo: number };
  accent: string;
  toSell: (c: number) => number;
}) {
  const theme = TIER_THEMES[accent];
  return (
    <div className="rounded-xl border bg-background/80 backdrop-blur-sm overflow-hidden shadow-sm">
      <table className="w-full text-[11.5px]">
        <thead className={`bg-gradient-to-r ${theme?.bar ?? "from-primary to-primary"} text-white`}>
          <tr>
            <th className="text-left px-3 py-2 font-bold uppercase tracking-wider text-[10px]">Descrição</th>
            <th className="text-left px-3 py-2 font-bold uppercase tracking-wider text-[10px] w-20">Tipo</th>
            <th className="text-left px-3 py-2 font-bold uppercase tracking-wider text-[10px] w-24">Frequência</th>
            <th className="text-right px-3 py-2 font-bold uppercase tracking-wider text-[10px] w-20">Ch/mês</th>
            <th className="text-right px-3 py-2 font-bold uppercase tracking-wider text-[10px] w-20">Horas N3</th>
          </tr>
        </thead>
        <tbody>
          {items.map((g, idx) => (
            <tr key={g.id} className={`border-t ${idx % 2 ? "bg-muted/30" : ""}`}>
              <td className="px-3 py-2">
                <GitBranch className={`inline h-3.5 w-3.5 mr-1.5 ${theme?.check ?? "text-primary"}`} strokeWidth={2.5} />
                <span className="font-medium">{g.descricao}</span>
              </td>
              <td className="px-3 py-2 text-muted-foreground">{g.tipo}</td>
              <td className="px-3 py-2 text-muted-foreground">{g.frequencia}</td>
              <td className="px-3 py-2 text-right tabular-nums">{g.chamadosMes.toFixed(2)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{g.horasN3.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t bg-muted/40">
            <td className="px-3 py-2 font-bold uppercase tracking-wider text-[10px]" colSpan={3}>Total</td>
            <td className="px-3 py-2 text-right tabular-nums font-extrabold">{totals.chamados.toFixed(2)}</td>
            <td className="px-3 py-2 text-right tabular-nums font-extrabold">{totals.horasN3.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function N3HoursBox({
  total, consumidas, previstas, chamadosN3, tempoMedio, valorHora, modo, horasRotinas = 0, horasMelhoria = 0, alocacao,
}: {
  total: number; consumidas: number; previstas: number;
  chamadosN3: number; tempoMedio: number; valorHora: number;
  modo: "operation" | "performance";
  horasRotinas?: number;
  horasMelhoria?: number;
  /** Horas absolutas de TAM e Owner (apenas modo performance). */
  alocacao?: { tam: number; owner: number };
}) {
  const pctConsumido = total > 0 ? Math.min(100, (consumidas / total) * 100) : 0;
  const deficit = consumidas > total;
  // Distribuição em cascata — soma das parcelas == total contratado.
  const dist = computeN3Distribution({
    total,
    horasChamados: consumidas,
    horasRotinas,
    horasTam: alocacao?.tam ?? 0,
    horasOwner: alocacao?.owner ?? 0,
    horasMelhoria,
  });
  const horasTam = dist.tam;
  const horasOwner = dist.owner;
  const horasMelhoriaPerfClamp = dist.melhoria;
  const horasLivre = dist.tecnicas;
  const pctChamados = dist.pct(dist.chamados);
  const pctRotinas = dist.pct(dist.rotinas);
  const pctTam = dist.pct(horasTam);
  const pctOwner = dist.pct(horasOwner);
  const pctMelhoriaPerf = dist.pct(horasMelhoriaPerfClamp);
  const pctLivre = dist.pct(horasLivre);
  const valorTotalVenda = total * valorHora;
  const livreNegativo = dist.excedente > 0;

  return (
    <div className="mt-4 rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-background/90 to-background/60 backdrop-blur-sm p-4 space-y-4 shadow-md">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl p-2 bg-gradient-to-br from-primary/20 to-primary/5">
            <Clock className="h-4 w-4 text-primary" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-sm font-extrabold">Horas N3 contratadas</p>
            <p className="text-[11px] text-muted-foreground">{formatNumber(total)}h/mês<span className="report-price"> × {formatBRL(valorHora)}/h <span className="text-[9px] uppercase tracking-wider">(venda)</span></span></p>
          </div>
        </div>
        <div className="text-right report-price">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Valor mensal</p>
          <p className="text-base font-extrabold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent tabular-nums">{formatBRL(valorTotalVenda)}</p>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>Atendimento de chamados N3</span>
          <span>{formatNumber(consumidas, 1)}h ({pctConsumido.toFixed(0)}%)</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className={`h-full ${deficit ? "bg-destructive" : pctConsumido > 80 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${pctConsumido}%` }} />
        </div>
        <p className="text-[11px] text-muted-foreground">
          {formatNumber(chamadosN3, 1)} chamados × {tempoMedio}h = {formatNumber(consumidas, 1)}h consumidas
        </p>
      </div>

      {modo === "operation" && (() => {
        const horasMelhoriaClamp = dist.melhoria;
        const horasLivreOp = dist.tecnicas;
        const pctLivreOp = dist.pct(horasLivreOp);
        const pctMelhoriaOp = dist.pct(horasMelhoriaClamp);
        const estourado = dist.excedente > 0;
        return (
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-foreground/80">Divisão de uso das horas N3</p>
            </div>
            <div className="flex h-7 w-full rounded-full overflow-hidden shadow-inner border bg-muted">
              {pctChamados > 0 && (
                <div className="bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center text-white text-[10px] font-extrabold" style={{ width: `${Math.min(100, pctChamados)}%` }}>
                  {pctChamados >= 10 && `Chamados ${pctChamados.toFixed(0)}%`}
                </div>
              )}
              {pctRotinas > 0 && (
                <div className="bg-gradient-to-r from-rose-400 to-rose-600 flex items-center justify-center text-white text-[10px] font-extrabold" style={{ width: `${Math.min(100, pctRotinas)}%` }}>
                  {pctRotinas >= 10 && `Rotinas ${pctRotinas.toFixed(0)}%`}
                </div>
              )}
              {pctMelhoriaOp > 0 && (
                <div className="bg-gradient-to-r from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-[10px] font-extrabold" style={{ width: `${Math.min(100, pctMelhoriaOp)}%` }}>
                  {pctMelhoriaOp >= 10 && `Melhoria ${pctMelhoriaOp.toFixed(0)}%`}
                </div>
              )}
              {pctLivreOp > 0 && (
                <div className="bg-gradient-to-r from-violet-500 to-fuchsia-600 flex items-center justify-center text-white text-[10px] font-extrabold" style={{ width: `${pctLivreOp}%` }}>
                  {pctLivreOp >= 8 && `Horas Técnicas ${pctLivreOp.toFixed(0)}%`}
                </div>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground italic">
              Horas Técnicas = Total contratado − Chamados N3 (funil) − Rotinas Operation − Horas de Melhoria
            </p>
            <div className={`grid grid-cols-1 ${horasMelhoriaClamp > 0 ? "sm:grid-cols-4" : "sm:grid-cols-3"} gap-2`}>
              <DistCard color="amber" pct={pctChamados} horas={dist.chamados} valor={dist.chamados * valorHora}
                titulo="Chamados" subtitulo="Atendimento reativo N3"
                desc="Tratamento de incidentes complexos escalados pelo funil de chamados." />
              <DistCard color="rose" pct={pctRotinas} horas={dist.rotinas} valor={dist.rotinas * valorHora}
                titulo="Rotinas" subtitulo="Rotinas Operation"
                desc="Horas consumidas pelas rotinas preventivas básicas, já cobradas dentro do pool de horas N3." />
              {horasMelhoriaClamp > 0 && (
                <DistCard color="indigo" pct={pctMelhoriaOp} horas={horasMelhoriaClamp} valor={horasMelhoriaClamp * valorHora}
                  titulo="Melhoria" subtitulo="Horas de Melhoria"
                  desc="Horas reservadas para evoluções e melhorias contínuas no ambiente." />
              )}
              <DistCard color="violet" pct={pctLivreOp} horas={horasLivreOp} valor={horasLivreOp * valorHora}
                titulo="Horas Técnicas" subtitulo="Saldo disponível"
                desc="Horas remanescentes para projetos, mudanças e demandas pontuais." alerta={estourado} />
            </div>
            {estourado && (
              <div className="rounded-lg border-2 border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px]">
                <strong className="text-destructive">⚠ Horas Técnicas zeradas:</strong> Chamados N3 + Rotinas Operation já consomem todas as horas contratadas. Aumente o pacote de horas.
              </div>
            )}
          </div>
        );
      })()}

      {modo === "performance" && alocacao && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-foreground/80">Divisão de uso das horas N3</p>
          </div>

          {/* Barra segmentada — chamados + TAM + Owner + Livre */}
          <div className="flex h-7 w-full rounded-full overflow-hidden shadow-inner border bg-muted">
            {pctChamados > 0 && (
              <div className="bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center text-white text-[10px] font-extrabold" style={{ width: `${Math.min(100, pctChamados)}%` }}>
                {pctChamados >= 10 && `Chamados ${pctChamados.toFixed(0)}%`}
              </div>
            )}
            {pctRotinas > 0 && (
              <div className="bg-gradient-to-r from-rose-400 to-rose-600 flex items-center justify-center text-white text-[10px] font-extrabold" style={{ width: `${Math.min(100, pctRotinas)}%` }}>
                {pctRotinas >= 10 && `Rotinas ${pctRotinas.toFixed(0)}%`}
              </div>
            )}
            {pctTam > 0 && (
              <div className="bg-gradient-to-r from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-[10px] font-extrabold" style={{ width: `${pctTam}%` }}>
                {pctTam >= 8 && `TAM ${pctTam}%`}
              </div>
            )}
            {pctOwner > 0 && (
              <div className="bg-gradient-to-r from-sky-400 to-sky-600 flex items-center justify-center text-white text-[10px] font-extrabold" style={{ width: `${pctOwner}%` }}>
                {pctOwner >= 8 && `Owner ${pctOwner}%`}
              </div>
            )}
            {pctMelhoriaPerf > 0 && (
              <div className="bg-gradient-to-r from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-[10px] font-extrabold" style={{ width: `${Math.min(100, pctMelhoriaPerf)}%` }}>
                {pctMelhoriaPerf >= 8 && `Melhoria ${pctMelhoriaPerf.toFixed(0)}%`}
              </div>
            )}
            {pctLivre > 0 && (
              <div className="bg-gradient-to-r from-violet-500 to-fuchsia-600 flex items-center justify-center text-white text-[10px] font-extrabold" style={{ width: `${pctLivre}%` }}>
                {pctLivre >= 8 && `Horas Técnicas ${pctLivre.toFixed(0)}%`}
              </div>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground italic">
            Horas Técnicas = Total contratado − Chamados N3 − Rotinas Performance − Horas TAM − Horas Owner − Horas de Melhoria
          </p>

          {/* Cards detalhados */}
          <div className={`grid grid-cols-1 ${horasMelhoriaPerfClamp > 0 ? "sm:grid-cols-6" : "sm:grid-cols-5"} gap-2`}>
            <DistCard color="amber" pct={pctChamados} horas={dist.chamados} valor={dist.chamados * valorHora}
              titulo="Chamados" subtitulo="Atendimento reativo N3"
              desc="Tratamento de incidentes complexos escalados pelo funil de chamados." />
            <DistCard color="rose" pct={pctRotinas} horas={dist.rotinas} valor={dist.rotinas * valorHora}
              titulo="Rotinas" subtitulo="Rotinas Performance"
              desc="Horas consumidas pelas rotinas preventivas Padrão/Complexo, já cobradas dentro do pool de horas N3." />
            <DistCard color="emerald" pct={pctTam} horas={horasTam} valor={horasTam * valorHora}
              titulo="TAM" subtitulo="Technical Account Manager"
              desc="Acompanhamento técnico, governança do contrato e relacionamento com o cliente." />
            <DistCard color="sky" pct={pctOwner} horas={horasOwner} valor={horasOwner * valorHora}
              titulo="Owner" subtitulo="Especialista dedicado"
              desc="Execução das rotinas preventivas e melhorias contínuas no ambiente." />
            {horasMelhoriaPerfClamp > 0 && (
              <DistCard color="indigo" pct={pctMelhoriaPerf} horas={horasMelhoriaPerfClamp} valor={horasMelhoriaPerfClamp * valorHora}
                titulo="Melhoria" subtitulo="Horas de Melhoria"
                desc="Horas reservadas para evoluções e melhorias contínuas no ambiente." />
            )}
            <DistCard color="violet" pct={pctLivre} horas={horasLivre} valor={horasLivre * valorHora}
              titulo="Horas Técnicas" subtitulo="Saldo disponível"
              desc="Horas remanescentes para projetos, mudanças e demandas pontuais." alerta={livreNegativo} />
          </div>

          {livreNegativo && (
            <div className="rounded-lg border-2 border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px]">
              <strong className="text-destructive">⚠ Horas Técnicas zeradas:</strong> a soma de Chamados + Rotinas + TAM + Owner já consome todas as horas N3 contratadas. Considere ampliar o pacote ou reduzir os percentuais de TAM/Owner.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DistCard({
  color, pct, horas, valor, titulo, subtitulo, desc, alerta,
}: {
  color: "emerald" | "sky" | "violet" | "amber" | "rose" | "indigo";
  pct: number; horas: number; valor: number;
  titulo: string; subtitulo: string; desc: string; alerta?: boolean;
}) {
  const styles = {
    emerald: { bg: "from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20", border: "border-emerald-300/60 dark:border-emerald-700/60", dot: "bg-gradient-to-br from-emerald-400 to-emerald-600", text: "text-emerald-700 dark:text-emerald-300" },
    sky:     { bg: "from-sky-50 to-sky-100/50 dark:from-sky-950/40 dark:to-sky-900/20",                 border: "border-sky-300/60 dark:border-sky-700/60",         dot: "bg-gradient-to-br from-sky-400 to-sky-600",         text: "text-sky-700 dark:text-sky-300" },
    violet:  { bg: "from-violet-50 to-fuchsia-100/50 dark:from-violet-950/40 dark:to-fuchsia-900/20",   border: "border-violet-300/60 dark:border-violet-700/60",   dot: "bg-gradient-to-br from-violet-500 to-fuchsia-600",  text: "text-violet-700 dark:text-violet-300" },
    amber:   { bg: "from-amber-50 to-orange-100/50 dark:from-amber-950/40 dark:to-orange-900/20",       border: "border-amber-300/60 dark:border-amber-700/60",     dot: "bg-gradient-to-br from-amber-400 to-orange-500",    text: "text-amber-700 dark:text-amber-300" },
    rose:    { bg: "from-rose-50 to-rose-100/50 dark:from-rose-950/40 dark:to-rose-900/20",             border: "border-rose-300/60 dark:border-rose-700/60",       dot: "bg-gradient-to-br from-rose-400 to-rose-600",       text: "text-rose-700 dark:text-rose-300" },
    indigo:  { bg: "from-indigo-50 to-indigo-100/50 dark:from-indigo-950/40 dark:to-indigo-900/20",     border: "border-indigo-300/60 dark:border-indigo-700/60",   dot: "bg-gradient-to-br from-indigo-400 to-indigo-600",   text: "text-indigo-700 dark:text-indigo-300" },
  }[color];
  const dimmed = pct === 0 && !alerta;
  return (
    <div className={`relative rounded-xl border-2 ${alerta ? "border-destructive/60" : styles.border} bg-gradient-to-br ${styles.bg} p-3 ${dimmed ? "opacity-50" : ""}`}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${styles.dot} shadow-sm`} />
          <p className={`text-sm font-extrabold ${styles.text}`}>{titulo}</p>
        </div>
        <span className={`text-[10px] font-extrabold ${styles.text} tabular-nums`}>{pct.toFixed(0)}%</span>
      </div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{subtitulo}</p>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-lg font-extrabold tabular-nums">{formatNumber(horas, 1)}</span>
        <span className="text-[10px] text-muted-foreground font-semibold">h/mês</span>
      </div>
      <p className="text-[11px] font-bold tabular-nums text-foreground/80 report-price">{formatBRL(valor)}<span className="text-[9px] text-muted-foreground font-normal">/mês</span></p>
      <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug">{desc}</p>
    </div>
  );
}
