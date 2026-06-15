import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Database, Hand, Bot, DollarSign, ChevronDown, Check, GripVertical, Settings2, UsersRound, LucideIcon } from "lucide-react";
import UserMenu from "@/components/auth/UserMenu";
import ThemeToggle from "@/components/ThemeToggle";
import BUMenu from "@/components/BUMenu";
import BackHomeButton from "@/components/BackHomeButton";
import PrecificacoesProfMenu from "@/components/profissionais/PrecificacoesProfMenu";
import ParametrosMenu from "@/components/ParametrosMenu";
import { useAuth } from "@/contexts/AuthContext";
import type { PermissionKey } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PageDef { to: string; label: string; icon: LucideIcon; permission?: PermissionKey }
interface Group { label: string; icon: LucideIcon; items: PageDef[] }

const GROUPS: Group[] = [
  {
    label: "Configurações",
    icon: Settings2,
    items: [
      { to: "/profissionais-alocados/base-conhecimento", label: "Base de Conhecimento", icon: Database, permission: "page.prof.base_conhecimento" },
      { to: "/profissionais-alocados/financeiro", label: "Financeiro", icon: DollarSign, permission: "page.prof.financeiro" },
    ],
  },
  {
    label: "Seleção",
    icon: UsersRound,
    items: [
      { to: "/profissionais-alocados/selecao-manual", label: "Seleção Manual", icon: Hand, permission: "page.prof.selecao_manual" },
      { to: "/profissionais-alocados/selecao-ia", label: "Seleção com IA", icon: Bot, permission: "page.prof.selecao_ia" },
    ],
  },
];

function GroupSlot({ group, currentPath }: { group: Group; currentPath: string }) {
  const navigate = useNavigate();
  const { can } = useAuth();
  const visible = group.items.filter((i) => !i.permission || can(i.permission));
  if (visible.length === 0) return null;
  const isCurrent = visible.some((i) => currentPath === i.to || currentPath.startsWith(i.to + "/"));
  const Icon = group.icon;
  return (
    <div className={`flex items-center rounded-md border transition-colors shrink-0 ${isCurrent ? "bg-secondary border-secondary" : "bg-background hover:bg-muted/50"}`}>
      <span className="px-1 py-1.5 text-muted-foreground" aria-hidden>
        <GripVertical className="h-3 w-3" />
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8 pl-1 pr-2 rounded-l-none">
            <Icon className="h-3.5 w-3.5" />
            {group.label}
            <ChevronDown className="h-3 w-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs">{group.label}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {visible.map((it) => {
            const PIcon = it.icon;
            const active = currentPath === it.to || currentPath.startsWith(it.to + "/");
            return (
              <DropdownMenuItem key={it.to} onClick={() => navigate(it.to)} className="gap-2 text-sm">
                <PIcon className="h-4 w-4" />
                <span className="flex-1">{it.label}</span>
                {active && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function ProfissionaisLayout() {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen w-full bg-muted/30">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="flex h-12 items-center gap-2 px-4">
          <BackHomeButton />
          <BUMenu />
          <h1 className="text-sm font-bold truncate">Precificação de Profissionais Alocados</h1>
          <div className="ml-auto flex items-center gap-1.5">
            {GROUPS.map((g) => <GroupSlot key={g.label} group={g} currentPath={pathname} />)}
            <ParametrosMenu scope="profissionais" />
            <PrecificacoesProfMenu />
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}