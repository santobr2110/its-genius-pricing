import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BriefcaseBusiness, Calculator, FileText, FolderOpen, DollarSign, Settings, ChevronDown, Receipt, Table as TableIcon,
  UsersRound, BookOpen, SlidersHorizontal, ClipboardList, History, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import BUMenu from "@/components/BUMenu";
import ThemeToggle from "@/components/ThemeToggle";
import UserMenu from "@/components/auth/UserMenu";
import BackHomeButton from "@/components/BackHomeButton";

export const BS_BASE = "/profissionais-alocados";
const BASE = BS_BASE;

type Item = { to: string; label: string; icon: LucideIcon; desc?: string };
const FIN: Item[] = [
  { to: `${BASE}/financeiro`, label: "Resultado da Operação", icon: Receipt, desc: "Da venda ao lucro" },
  { to: `${BASE}/financeiro/impostos`, label: "Impostos & Markup", icon: Calculator, desc: "SKU fiscal, IR/CSLL, rentabilidade alvo" },
  { to: `${BASE}/financeiro/comissoes`, label: "Comissões", icon: TableIcon, desc: "Escala por rentabilidade" },
];
const CFG: Item[] = [
  { to: `${BASE}/configuracoes/cargos`, label: "Cargos", icon: UsersRound, desc: "Cargos, níveis e salários" },
  { to: `${BASE}/configuracoes/conteudo`, label: "Conteúdo", icon: BookOpen, desc: "Textos da proposta" },
  { to: `${BASE}/configuracoes/parametros`, label: "Parâmetros", icon: SlidersHorizontal, desc: "Encargos, overhead, horas" },
  { to: `${BASE}/configuracoes/pendencias`, label: "Pendências", icon: ClipboardList, desc: "Itens a confirmar" },
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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={btn(pathname.startsWith(prefix))}>
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

export function BodyshopEmConstrucao({ titulo = "Em construção" }: { titulo?: string }) {
  return (
    <Card className="mx-auto max-w-3xl">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <BriefcaseBusiness className="h-10 w-10 text-primary" />
        <h1 className="text-xl font-semibold">{titulo}</h1>
        <p className="text-sm text-muted-foreground">Esta parte do BodyShop novo chega nas próximas fases.</p>
        <NavLink to={`${BASE}/legado/selecao-manual`}><Button variant="outline" size="sm" className="gap-1.5"><History className="h-3.5 w-3.5" />Usar as telas antigas</Button></NavLink>
      </CardContent>
    </Card>
  );
}

export default function BodyshopLayout() {
  const { can } = useAuth();
  const { pathname } = useLocation();
  const naRaiz = pathname.replace(/\/+$/, "") === BASE;
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex min-h-12 max-w-[1600px] items-center gap-2 px-4 py-1.5">
          <BackHomeButton to={naRaiz ? "/" : BASE} />
          <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0"><BriefcaseBusiness className="h-4 w-4" /></div>
          <h1 className="font-bold text-foreground truncate text-sm">BodyShop - Alocação de Profissionais</h1>
          <div className="ml-auto flex items-center gap-1.5">
            <BUMenu />
            <NavBtn to={BASE} label="Configurador" icon={Calculator} end />
            <NavBtn to={`${BASE}/proposta`} label="Proposta" icon={FileText} />
            <NavBtn to={`${BASE}/cotacoes`} label="Cotações" icon={FolderOpen} />
            <NavMenu label="Financeiro" icon={DollarSign} items={FIN} prefix={`${BASE}/financeiro`} />
            {can("page.prof.admin") && <NavMenu label="Configurações" icon={Settings} items={CFG} prefix={`${BASE}/configuracoes`} />}
            <NavBtn to={`${BASE}/legado/selecao-manual`} label="Telas antigas" icon={History} />
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
