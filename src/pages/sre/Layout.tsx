import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Timer, Calculator, FileText, FolderOpen, DollarSign, Settings, ChevronDown, Receipt, Table as TableIcon,
  BookOpen, SlidersHorizontal, ClipboardList, Package, Megaphone, type LucideIcon,
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
import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CONFIG_SRE_PADRAO, type SnapshotSre } from "@/lib/sre/carrinho";
import { SRE_TAB_COTACAO_ID, useSreState } from "./useSreState";

export const SRE_BASE = "/observabilidade/consultivo-sre";
const BASE = SRE_BASE;

type Item = { to: string; label: string; icon: LucideIcon; desc?: string };
const FIN: Item[] = [
  { to: `${BASE}/financeiro`, label: "Resultado da Operação", icon: Receipt, desc: "Da venda ao lucro" },
  { to: `${BASE}/financeiro/impostos`, label: "Impostos & Markup", icon: Calculator, desc: "Município, IR/CSLL, pisos" },
  { to: `${BASE}/financeiro/comissoes`, label: "Comissões", icon: TableIcon, desc: "Comissão fixa ou Escala Selbetti" },
];
const CFG: Item[] = [
  { to: `${BASE}/configuracoes/pacotes`, label: "Pacotes", icon: Package, desc: "Horas e rentabilidade alvo por pacote" },
  { to: `${BASE}/configuracoes/conteudo`, label: "Conteúdo", icon: BookOpen, desc: "Textos da proposta" },
  { to: `${BASE}/configuracoes/campanhas`, label: "Campanhas", icon: Megaphone, desc: "Condições promocionais" },
  { to: `${BASE}/configuracoes/parametros`, label: "Parâmetros", icon: SlidersHorizontal, desc: "Custos e parâmetros da oferta" },
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

export function SreEmConstrucao({ titulo = "Em construção" }: { titulo?: string }) {
  return (
    <Card className="mx-auto max-w-3xl">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <Timer className="h-10 w-10 text-primary" />
        <h1 className="text-xl font-semibold">{titulo}</h1>
        <p className="text-sm text-muted-foreground">Esta parte dos Pacotes Consultivos Zabbix SRE chega na próxima fase.</p>
      </CardContent>
    </Card>
  );
}

export default function SreLayout() {
  const { can } = useAuth();
  const { pathname } = useLocation();
  const naRaiz = pathname.replace(/\/+$/, "") === BASE;
  const { atual, setAtual, setLinhas, setConfig, setSnapshot } = useSreState();

  // "Abrir em nova aba": carrega a cotação indicada em ?cotacao=<id> só nesta aba.
  useEffect(() => {
    if (!SRE_TAB_COTACAO_ID || atual.id === SRE_TAB_COTACAO_ID) return;
    supabase.from("pricing_presets")
      .select("id,name,client_name,quote_code,account_manager,bu_specialist,salesforce_code,bu_architect,payload")
      .eq("id", SRE_TAB_COTACAO_ID).is("deleted_at", null).maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) { toast.error("Cotação não encontrada."); return; }
        const p = (data.payload ?? {}) as { linhas?: never[]; config?: object; snapshot?: SnapshotSre };
        setLinhas(p.linhas ?? []);
        setConfig({ ...CONFIG_SRE_PADRAO, ...(p.config ?? {}) });
        setSnapshot(p.snapshot ?? null);
        setAtual({ id: data.id, nome: data.name, cliente: data.client_name ?? "", codigo: data.quote_code, gerenteConta: data.account_manager ?? "", especialistaBU: data.bu_specialist ?? "", salesforce: data.salesforce_code ?? "", arquitetoBU: data.bu_architect ?? "" });
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex min-h-12 max-w-[1600px] items-center gap-2 px-4 py-1.5">
          <BackHomeButton to={naRaiz ? "/" : BASE} />
          <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0"><Timer className="h-4 w-4" /></div>
          <h1 className="font-bold text-foreground truncate text-sm">Pacotes Consultivos Zabbix SRE</h1>
          <div className="ml-auto flex items-center gap-1.5">
            <BUMenu />
            <NavBtn to={BASE} label="Configurador" icon={Calculator} end />
            <NavBtn to={`${BASE}/proposta`} label="Proposta" icon={FileText} />
            <NavBtn to={`${BASE}/cotacoes`} label="Cotações" icon={FolderOpen} />
            <NavMenu label="Financeiro" icon={DollarSign} items={FIN} prefix={`${BASE}/financeiro`} />
            {can("page.sre.admin") && <NavMenu label="Configurações" icon={Settings} items={CFG} prefix={`${BASE}/configuracoes`} />}
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
