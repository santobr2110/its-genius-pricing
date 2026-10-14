import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  GraduationCap, Calculator, FileText, FolderOpen, DollarSign, Settings, ChevronDown,
  Receipt, Table as TableIcon, BookOpen, Boxes, SlidersHorizontal, ClipboardList, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import BUMenu from "@/components/BUMenu";
import ThemeToggle from "@/components/ThemeToggle";
import UserMenu from "@/components/auth/UserMenu";
import BackHomeButton from "@/components/BackHomeButton";

const BASE = "/observabilidade/treinamento";
type Item = { to: string; label: string; icon: LucideIcon; desc?: string };

const FIN: Item[] = [
  { to: `${BASE}/financeiro`, label: "Resultado da Operação", icon: Receipt, desc: "Da venda à rentabilidade" },
  { to: `${BASE}/financeiro/impostos`, label: "Impostos & Markup", icon: Calculator, desc: "Município, IR/CSLL, rentabilidade" },
  { to: `${BASE}/financeiro/comissoes`, label: "Comissões", icon: TableIcon, desc: "Faixas por rentabilidade" },
];
const CFG: Item[] = [
  { to: `${BASE}/configuracoes/cursos`, label: "Cursos", icon: GraduationCap, desc: "Cursos, exames, combos e extras" },
  { to: `${BASE}/configuracoes/conteudo`, label: "Conteúdo", icon: BookOpen, desc: "Textos e cronograma da proposta" },
  { to: `${BASE}/configuracoes/combos`, label: "Combos", icon: Boxes, desc: "Composição dos combos" },
  { to: `${BASE}/configuracoes/parametros`, label: "Parâmetros", icon: SlidersHorizontal, desc: "Taxas e regras de cálculo" },
  { to: `${BASE}/configuracoes/pendencias`, label: "Pendências", icon: ClipboardList, desc: "Itens simulados ou a confirmar" },
];

const btn = (active: boolean) => cn("gap-1.5 text-xs h-8", active && "border-primary/60 bg-primary/10 text-foreground");

function NavBtn({ to, label, icon: Icon, end }: Item & { end?: boolean }) {
  return (
    <NavLink to={to} end={end}>
      {({ isActive }) => (
        <Button variant="outline" size="sm" className={btn(isActive)}><Icon className="h-3.5 w-3.5" /><span className="hidden 2xl:inline">{label}</span></Button>
      )}
    </NavLink>
  );
}

function NavMenu({ label, icon: Icon, items, prefix }: { label: string; icon: LucideIcon; items: Item[]; prefix: string }) {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const active = pathname.startsWith(prefix);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={btn(active)}>
          <Icon className="h-3.5 w-3.5" /><span className="hidden 2xl:inline">{label}</span><ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map(({ to, label: l, icon: I, desc }) => (
          <DropdownMenuItem key={to} onSelect={() => nav(to)} className={cn("items-start gap-2", pathname === to && "bg-muted")}>
            <I className="h-4 w-4 mt-0.5 text-primary" />
            <div><p className="text-sm">{l}</p>{desc && <p className="text-[11px] text-muted-foreground">{desc}</p>}</div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function TreinamentoLayout() {
  const { can } = useAuth();
  const { pathname } = useLocation();
  const naRaiz = pathname.replace(/\/+$/, "") === BASE;
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex min-h-12 max-w-[1600px] items-center gap-2 px-4 py-1.5">
          <BackHomeButton to={naRaiz ? "/" : BASE} />
          <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0"><GraduationCap className="h-4 w-4" /></div>
          <h1 className="font-bold text-foreground truncate text-sm">Treinamento</h1>
          <div className="ml-auto flex items-center gap-1.5">
            <BUMenu />
            <NavBtn to={BASE} label="Configurador" icon={Calculator} end />
            <NavBtn to={`${BASE}/proposta`} label="Proposta" icon={FileText} />
            <NavBtn to={`${BASE}/cotacoes`} label="Cotações" icon={FolderOpen} />
            <NavMenu label="Financeiro" icon={DollarSign} items={FIN} prefix={`${BASE}/financeiro`} />
            {can("page.trn.admin") && <NavMenu label="Configurações" icon={Settings} items={CFG} prefix={`${BASE}/configuracoes`} />}
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] p-4">
        <Outlet />
      </main>
    </div>
  );
}
