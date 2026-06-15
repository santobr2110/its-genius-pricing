import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Database, Hand, Bot, FolderOpen, DollarSign } from "lucide-react";
import UserMenu from "@/components/auth/UserMenu";
import ThemeToggle from "@/components/ThemeToggle";
import BUMenu from "@/components/BUMenu";
import BackHomeButton from "@/components/BackHomeButton";
import { useAuth } from "@/contexts/AuthContext";
import type { PermissionKey } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof Database; permission?: PermissionKey };

const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Configurações",
    items: [
      { to: "/profissionais-alocados/base-conhecimento", label: "Base de Conhecimento", icon: Database, permission: "page.prof.base_conhecimento" },
      { to: "/profissionais-alocados/financeiro", label: "Financeiro", icon: DollarSign, permission: "page.prof.financeiro" },
    ],
  },
  {
    label: "Seleção",
    items: [
      { to: "/profissionais-alocados/selecao-manual", label: "Seleção Manual", icon: Hand, permission: "page.prof.selecao_manual" },
      { to: "/profissionais-alocados/selecao-ia", label: "Seleção com IA", icon: Bot, permission: "page.prof.selecao_ia" },
    ],
  },
  {
    label: "Precificações",
    items: [
      { to: "/profissionais-alocados/cotacoes", label: "Cotações Salvas", icon: FolderOpen, permission: "page.prof.cotacoes" },
    ],
  },
];

function TopNav() {
  const { pathname } = useLocation();
  const { can } = useAuth();
  return (
    <nav className="flex flex-wrap items-center gap-4 border-b bg-background px-4 py-2">
      {GROUPS.map((g) => {
        const visible = g.items.filter((i) => !i.permission || can(i.permission));
        if (visible.length === 0) return null;
        return (
          <div key={g.label} className="flex items-center gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pr-1">
              {g.label}:
            </span>
            <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-0.5">
              {visible.map((it) => {
                const Icon = it.icon;
                const active = pathname === it.to || pathname.startsWith(it.to + "/");
                return (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-foreground/70 hover:bg-background hover:text-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {it.label}
                  </NavLink>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

export default function ProfissionaisLayout() {
  return (
    <div className="min-h-screen w-full bg-muted/30">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="flex h-12 items-center gap-2 px-4">
          <BackHomeButton />
          <BUMenu />
          <h1 className="text-sm font-bold truncate">Precificação de Profissionais Alocados</h1>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
        <TopNav />
      </header>
      <main className="px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}