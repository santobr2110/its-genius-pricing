import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calculator, Server, Cloud, Activity, ArrowRight, Sparkles, Package, Clock, Users, BriefcaseBusiness } from "lucide-react";
import UserMenu from "@/components/auth/UserMenu";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import {
  GROUP_ACCESS_KEYS,
  SMART_ITO_ACCESS_KEY,
  PACOTE_HORAS_ACCESS_KEY,
  PROFISSIONAIS_ALOCADOS_ACCESS_KEY,
} from "@/lib/offerings";
import type { PermissionKey } from "@/lib/permissions";

type OfferingCard = {
  id: string;
  title: string;
  description: string;
  to: string;
  icon: typeof Calculator;
  available: boolean;
  permissionKey: PermissionKey | null;
};

type GroupCard = {
  id: keyof typeof GROUP_ACCESS_KEYS;
  label: string;
  description: string;
  icon: typeof Package;
  gradient: string;
  glow: string;
  accent: string;
  ring: string;
  offerings: OfferingCard[];
};

const GROUPS: GroupCard[] = [
  {
    id: "ito",
    label: "ITO",
    description: "Operações de TI: monitoramento, equipes N1/N2/N3, field service e gestão.",
    icon: Package,
    gradient: "from-emerald-300 via-green-500 to-teal-600",
    glow: "shadow-[0_0_40px_-10px_rgba(52,211,153,0.6)]",
    accent: "text-emerald-400",
    ring: "group-hover:ring-emerald-400/50",
    offerings: [
      {
        id: "smart-ito",
        title: "Smart ITO",
        description: "Calculadora completa de precificação para operações de TI.",
        to: "/ito",
        icon: Calculator,
        available: true,
        permissionKey: SMART_ITO_ACCESS_KEY as PermissionKey,
      },
      {
        id: "profissionais-alocados",
        title: "BodyShop - Alocação de Profissionais",
        description: "Calcule o valor de venda de profissionais de TI alocados, com apoio de IA.",
        to: "/profissionais-alocados",
        icon: BriefcaseBusiness,
        available: true,
        permissionKey: PROFISSIONAIS_ALOCADOS_ACCESS_KEY as PermissionKey,
      },
      {
        id: "pacote-horas",
        title: "Pacote de Horas",
        description: "Modelo de pacote de horas — em desenvolvimento.",
        to: "/pacote-horas",
        icon: Clock,
        available: false,
        permissionKey: PACOTE_HORAS_ACCESS_KEY as PermissionKey,
      },
    ],
  },
  {
    id: "datacenter",
    label: "Datacenter",
    description: "Estrutura de precificação para serviços de datacenter.",
    icon: Server,
    gradient: "from-green-400 via-emerald-500 to-teal-600",
    glow: "shadow-[0_0_40px_-10px_rgba(16,185,129,0.6)]",
    accent: "text-green-400",
    ring: "group-hover:ring-green-400/50",
    offerings: [],
  },
  {
    id: "cloud",
    label: "Cloud",
    description: "Estrutura de precificação para serviços de nuvem.",
    icon: Cloud,
    gradient: "from-lime-300 via-green-400 to-emerald-500",
    glow: "shadow-[0_0_40px_-10px_rgba(132,204,22,0.6)]",
    accent: "text-lime-400",
    ring: "group-hover:ring-lime-400/50",
    offerings: [],
  },
  {
    id: "observabilidade",
    label: "Observabilidade",
    description: "Estrutura de precificação para observabilidade e monitoração.",
    icon: Activity,
    gradient: "from-teal-300 via-emerald-500 to-green-600",
    glow: "shadow-[0_0_40px_-10px_rgba(20,184,166,0.6)]",
    accent: "text-teal-400",
    ring: "group-hover:ring-teal-400/50",
    offerings: [],
  },
];

export default function Hub() {
  const { can } = useAuth();
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains("dark")),
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  const visibleGroups = GROUPS
    .filter((g) => can(GROUP_ACCESS_KEYS[g.id] as PermissionKey))
    .map((g) => ({
      ...g,
      offerings: g.offerings.filter((o) => !o.permissionKey || can(o.permissionKey)),
    }));

  return (
    <div className={`relative min-h-screen overflow-hidden ${isDark ? "bg-[#020f0a] text-slate-100" : "bg-gradient-to-b from-emerald-50 via-white to-teal-50 text-slate-900"}`}>
      {/* Background grid */}
      <div
        className={`pointer-events-none absolute inset-0 ${isDark ? "opacity-[0.15]" : "opacity-[0.08]"}`}
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(52,211,153,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(52,211,153,0.12) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
        }}
      />
      {/* Aurora blobs */}
      <div className={`pointer-events-none absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full blur-[120px] ${isDark ? "bg-emerald-500/20" : "bg-emerald-300/30"}`} />
      <div className={`pointer-events-none absolute -bottom-32 -right-32 h-[520px] w-[520px] rounded-full blur-[120px] ${isDark ? "bg-green-500/20" : "bg-green-300/30"}`} />
      <div className={`pointer-events-none absolute top-1/3 right-1/4 h-[320px] w-[320px] rounded-full blur-[120px] ${isDark ? "bg-teal-500/15" : "bg-teal-300/25"}`} />

      {/* Header */}
      <header className={`relative z-10 border-b backdrop-blur-xl ${isDark ? "border-white/5 bg-white/[0.02]" : "border-slate-200/70 bg-white/60"}`}>
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-6">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Sparkles className={`h-5 w-5 ${isDark ? "text-emerald-300" : "text-emerald-600"}`} />
              <div className="absolute inset-0 blur-md bg-emerald-400/40 -z-10" />
            </div>
            <span className={`text-xs font-semibold tracking-[0.2em] ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              BUSINESS UNIT · IT SOLUTIONS
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 mx-auto max-w-[1400px] px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 backdrop-blur ${isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-white/70"}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className={`text-[10px] font-medium uppercase tracking-widest ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              Plataforma Comercial
            </span>
          </div>
          <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight">
            <span className={`bg-gradient-to-r bg-clip-text text-transparent ${isDark ? "from-white via-slate-200 to-slate-400" : "from-slate-900 via-slate-700 to-slate-500"}`}>
              Grupos de Ofertas
            </span>
            <br />
            <span className={`bg-gradient-to-r bg-clip-text text-transparent ${isDark ? "from-emerald-300 via-green-400 to-teal-300" : "from-emerald-600 via-green-600 to-teal-600"}`}>
              IT Solutions
            </span>
          </h1>
          <p className={`mt-5 text-base sm:text-lg ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            Cada grupo reúne as ofertas disponíveis para dimensionamento e precificação.
          </p>
        </div>

        {/* Groups */}
        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {(visibleGroups.length ? visibleGroups : GROUPS).map((g) => {
            const GIcon = g.icon;
            return (
              <section
                key={g.id}
                className={`relative overflow-hidden rounded-2xl border p-6 backdrop-blur-xl ${isDark ? "border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02]" : "border-slate-200 bg-white/80"}`}
              >
                <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${g.gradient} opacity-60`} />

                <div className="flex items-start gap-4">
                  <div
                    className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${g.gradient} ${g.glow}`}
                  >
                    <GIcon className="h-6 w-6 text-white drop-shadow" strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0">
                    <div className={`text-[10px] font-bold uppercase tracking-[0.18em] ${g.accent}`}>
                      Grupo
                    </div>
                    <h2 className={`mt-1 text-xl font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{g.label}</h2>
                    <p className={`mt-1 text-sm leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>{g.description}</p>
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  {g.offerings.length === 0 ? (
                    <div className={`rounded-xl border border-dashed px-4 py-5 text-center ${isDark ? "border-white/10 bg-white/[0.02]" : "border-slate-300 bg-slate-50"}`}>
                      <span className="text-xs uppercase tracking-wider text-slate-500">
                        Nenhuma oferta disponível ainda
                      </span>
                    </div>
                  ) : (
                    g.offerings.map((o) => {
                      const OIcon = o.icon;
                      return (
                        <Link
                          key={o.id}
                          to={o.to}
                          className={`group flex items-center gap-3 rounded-xl border p-3 transition-all hover:-translate-y-0.5 ${isDark ? "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"} ${o.available ? "" : "opacity-80"}`}
                        >
                          <div className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${g.gradient} ${g.glow}`}>
                            <OIcon className="h-5 w-5 text-white" strokeWidth={2.2} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-semibold truncate ${isDark ? "text-white" : "text-slate-900"}`}>{o.title}</span>
                              {!o.available && (
                                <span className={`rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider ${isDark ? "border-white/15 bg-white/5 text-slate-400" : "border-slate-300 bg-slate-100 text-slate-600"}`}>
                                  Em breve
                                </span>
                              )}
                            </div>
                            <p className={`text-xs truncate ${isDark ? "text-slate-400" : "text-slate-600"}`}>{o.description}</p>
                          </div>
                          <ArrowRight className={`h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1 ${isDark ? "group-hover:text-white" : "group-hover:text-slate-900"}`} />
                        </Link>
                      );
                    })
                  )}
                </div>
              </section>
            );
          })}
        </div>

        <div className="mt-12 text-center text-xs text-slate-500">
          Selecione uma oferta dentro de um grupo · Você poderá alternar pelo seletor no topo
        </div>
      </main>
    </div>
  );
}