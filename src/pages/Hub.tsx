import { Link } from "react-router-dom";
import { Calculator, Server, Cloud, Activity, ArrowRight, Sparkles } from "lucide-react";
import UserMenu from "@/components/auth/UserMenu";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { GROUP_ACCESS_KEYS } from "@/lib/offerings";
import type { PermissionKey } from "@/lib/permissions";

const OFFERINGS = [
  {
    id: "ito",
    label: "ITO",
    title: "Smart ITO",
    description: "Calculadora completa de precificação para operações de TI: equipes N1/N2/N3, field service, métricas e propostas.",
    to: "/ito",
    icon: Calculator,
    available: true,
    gradient: "from-emerald-300 via-green-500 to-teal-600",
    glow: "shadow-[0_0_40px_-10px_rgba(52,211,153,0.6)]",
    accent: "text-emerald-400",
    ring: "group-hover:ring-emerald-400/50",
  },
  {
    id: "datacenter",
    label: "Datacenter",
    title: "Datacenter",
    description: "Estrutura de precificação para serviços de datacenter — disponível em breve.",
    to: "/datacenter",
    icon: Server,
    available: false,
    gradient: "from-green-400 via-emerald-500 to-teal-600",
    glow: "shadow-[0_0_40px_-10px_rgba(16,185,129,0.6)]",
    accent: "text-green-400",
    ring: "group-hover:ring-green-400/50",
  },
  {
    id: "cloud",
    label: "Cloud",
    title: "Cloud",
    description: "Estrutura de precificação para serviços de nuvem — disponível em breve.",
    to: "/cloud",
    icon: Cloud,
    available: false,
    gradient: "from-lime-300 via-green-400 to-emerald-500",
    glow: "shadow-[0_0_40px_-10px_rgba(132,204,22,0.6)]",
    accent: "text-lime-400",
    ring: "group-hover:ring-lime-400/50",
  },
  {
    id: "observabilidade",
    label: "Observabilidade",
    title: "Observabilidade",
    description: "Estrutura de precificação para observabilidade e monitoração — disponível em breve.",
    to: "/observabilidade",
    icon: Activity,
    available: false,
    gradient: "from-teal-300 via-emerald-500 to-green-600",
    glow: "shadow-[0_0_40px_-10px_rgba(20,184,166,0.6)]",
    accent: "text-teal-400",
    ring: "group-hover:ring-teal-400/50",
  },
];

export default function Hub() {
  const { can } = useAuth();
  const visible = OFFERINGS.filter((o) =>
    can(GROUP_ACCESS_KEYS[o.id as keyof typeof GROUP_ACCESS_KEYS] as PermissionKey),
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020f0a] text-slate-100">
      {/* Background grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(52,211,153,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(52,211,153,0.12) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
        }}
      />
      {/* Aurora blobs */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full bg-emerald-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-[520px] w-[520px] rounded-full bg-green-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/3 right-1/4 h-[320px] w-[320px] rounded-full bg-teal-500/15 blur-[120px]" />

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 bg-white/[0.02] backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-6">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Sparkles className="h-5 w-5 text-emerald-300" />
              <div className="absolute inset-0 blur-md bg-emerald-400/40 -z-10" />
            </div>
            <span className="text-xs font-semibold tracking-[0.2em] text-slate-300">
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
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] font-medium uppercase tracking-widest text-slate-300">
              Plataforma Comercial
            </span>
          </div>
          <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight">
            <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Escolha uma oferta
            </span>
            <br />
            <span className="bg-gradient-to-r from-emerald-300 via-green-400 to-teal-300 bg-clip-text text-transparent">
              IT Solutions
            </span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-slate-400">
            Acesse a calculadora de precificação correspondente à oferta que deseja dimensionar.
          </p>
        </div>

        {/* Grid */}
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {(visible.length ? visible : OFFERINGS).map((o) => {
            const Icon = o.icon;
            const Card = (
              <div
                className={`group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.05] ring-1 ring-transparent ${o.ring} ${o.available ? "" : "opacity-90"}`}
              >
                {/* Animated top accent line */}
                <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${o.gradient} opacity-60`} />

                {/* Icon badge */}
                <div className="relative mb-5">
                  <div
                    className={`inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${o.gradient} ${o.glow} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
                  >
                    <Icon className="h-7 w-7 text-white drop-shadow" strokeWidth={2.2} />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-[0.18em] ${o.accent}`}>
                    {o.label}
                  </span>
                  {!o.available && (
                    <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-slate-400">
                      Em breve
                    </span>
                  )}
                </div>
                <h2 className="mt-2 text-xl font-semibold text-white">{o.title}</h2>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">{o.description}</p>

                <div className="mt-6 flex items-center gap-1.5 text-sm font-medium text-slate-300 transition-colors group-hover:text-white">
                  {o.available ? "Abrir calculadora" : "Visualizar"}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>

                {/* Bottom glow */}
                <div
                  className={`pointer-events-none absolute -bottom-16 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full bg-gradient-to-br ${o.gradient} opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-40`}
                />
              </div>
            );
            return (
              <Link key={o.id} to={o.to} className="block h-full">
                {Card}
              </Link>
            );
          })}
        </div>

        <div className="mt-12 text-center text-xs text-slate-500">
          Selecione uma oferta acima · Você poderá alternar entre elas pelo seletor no topo
        </div>
      </main>
    </div>
  );
}