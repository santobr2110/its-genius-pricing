import { NavLink, Outlet } from "react-router-dom";
import { GraduationCap, Calculator, FileText, FolderOpen, DollarSign, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import BUMenu from "@/components/BUMenu";
import ThemeToggle from "@/components/ThemeToggle";
import UserMenu from "@/components/auth/UserMenu";
import BackHomeButton from "@/components/BackHomeButton";

const BASE = "/observabilidade/treinamento";
const NAV = [
  { to: BASE, label: "Configurador", icon: Calculator, end: true },
  { to: `${BASE}/proposta`, label: "Proposta", icon: FileText, end: false },
  { to: `${BASE}/cotacoes`, label: "Cotações", icon: FolderOpen, end: false },
  { to: `${BASE}/financeiro`, label: "Financeiro", icon: DollarSign, end: false },
  { to: `${BASE}/configuracoes`, label: "Configurações", icon: Settings, end: false, admin: true },
];

export default function TreinamentoLayout() {
  const { can } = useAuth();
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-2 px-4">
          <BackHomeButton />
          <GraduationCap className="h-5 w-5 text-primary shrink-0" />
          <h1 className="font-bold text-foreground truncate text-base">Observabilidade · Treinamento</h1>
          <div className="ml-auto shrink-0 pl-2 flex items-center gap-2">
            <BUMenu />
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
        <nav className="mx-auto flex max-w-[1600px] gap-1 overflow-x-auto px-4 pb-2">
          {NAV.filter((n) => !n.admin || can("page.trn.admin")).map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${isActive ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
              <Icon className="h-3.5 w-3.5" /> {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-[1400px] p-4">
        <Outlet />
      </main>
    </div>
  );
}
