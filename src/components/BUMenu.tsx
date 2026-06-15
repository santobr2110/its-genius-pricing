import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Briefcase, ChevronDown, Calculator, Server, Cloud, Activity, Check, Home, Clock, Users, Package } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  GROUP_ACCESS_KEYS,
  PACOTE_HORAS_ACCESS_KEY,
  SMART_ITO_ACCESS_KEY,
  PROFISSIONAIS_ALOCADOS_ACCESS_KEY,
} from "@/lib/offerings";
import type { PermissionKey } from "@/lib/permissions";

const ITO_PATHS = new Set([
  "/ito",
  "/detalhamento",
  "/equipe-n1",
  "/equipe-n2",
  "/equipe-n3",
  "/financeiro",
  "/taxas-demanda",
  "/precificacoes",
  "/field-service",
  "/gestao-ti",
  "/relatorio-demanda",
  "/resumo-cotacao",
]);

type GroupSlug = keyof typeof GROUP_ACCESS_KEYS;

interface OfferingItem {
  id: string;
  label: string;
  description: string;
  to: string;
  icon: typeof Calculator;
  permissionKey: string | null;
}

interface GroupItem {
  id: GroupSlug;
  label: string;
  icon: typeof Package;
  offerings: OfferingItem[];
}

const GROUPS_MENU: GroupItem[] = [
  {
    id: "ito",
    label: "ITO",
    icon: Package,
    offerings: [
      { id: "ito", label: "Smart ITO", description: "Calculadora completa", to: "/ito", icon: Calculator, permissionKey: SMART_ITO_ACCESS_KEY },
      { id: "profissionais-alocados", label: "Profissionais Alocados", description: "Precificação com IA", to: "/profissionais-alocados", icon: Users, permissionKey: PROFISSIONAIS_ALOCADOS_ACCESS_KEY },
      { id: "pacote-horas", label: "Pacote de Horas", description: "Em breve", to: "/pacote-horas", icon: Clock, permissionKey: PACOTE_HORAS_ACCESS_KEY },
    ],
  },
  { id: "datacenter", label: "Datacenter", icon: Server, offerings: [] },
  { id: "cloud", label: "Cloud", icon: Cloud, offerings: [] },
  { id: "observabilidade", label: "Observabilidade", icon: Activity, offerings: [] },
];

const GROUP_ROUTE: Record<GroupSlug, string> = {
  ito: "/ito",
  datacenter: "/datacenter",
  cloud: "/cloud",
  observabilidade: "/observabilidade",
};

export default function BUMenu() {
  const { pathname } = useLocation();
  const { can } = useAuth();

  const visibleGroups = GROUPS_MENU
    .filter((g) => can(GROUP_ACCESS_KEYS[g.id] as PermissionKey))
    .map((g) => ({
      ...g,
      offerings: g.offerings.filter((o) => !o.permissionKey || can(o.permissionKey as PermissionKey)),
    }));

  const currentGroupId: GroupSlug | null =
    pathname === "/datacenter" ? "datacenter"
    : pathname === "/cloud" ? "cloud"
    : pathname === "/observabilidade" ? "observabilidade"
    : (pathname === "/pacote-horas" || pathname.startsWith("/profissionais-alocados") || ITO_PATHS.has(pathname)) ? "ito"
    : null;
  const currentOfferingId: string | null =
    pathname === "/pacote-horas" ? "pacote-horas"
    : pathname.startsWith("/profissionais-alocados") ? "profissionais-alocados"
    : ITO_PATHS.has(pathname) ? "ito"
    : null;

  const currentGroupLabel = GROUPS_MENU.find((g) => g.id === currentGroupId)?.label;
  const currentOfferingLabel = currentGroupId
    ? GROUPS_MENU.find((g) => g.id === currentGroupId)?.offerings.find((o) => o.id === currentOfferingId)?.label
    : null;
  const currentLabel = pathname === "/"
    ? "Página inicial"
    : currentOfferingLabel
      ? `${currentGroupLabel} · ${currentOfferingLabel}`
      : currentGroupLabel ?? "Ofertas";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8">
          <Briefcase className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">IT Solutions</span>
          <span className="text-xs text-muted-foreground">/ {currentLabel}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel className="text-xs">Business Unit · IT Solutions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="gap-2">
          <Link to="/" className="flex items-center gap-2 w-full">
            <Home className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium flex-1">Página inicial</span>
            {pathname === "/" && <Check className="h-3.5 w-3.5 text-primary" />}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {visibleGroups.map((g, idx) => {
          const GIcon = g.icon;
          const groupActive = currentGroupId === g.id;
          return (
            <div key={g.id}>
              {idx > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold pt-2">
                <GIcon className="h-3.5 w-3.5" />
                <span className="flex-1">Grupo · {g.label}</span>
                {groupActive && !currentOfferingId && <Check className="h-3 w-3 text-primary" />}
              </DropdownMenuLabel>
              {g.offerings.length === 0 ? (
                <DropdownMenuItem asChild className="gap-2 pl-7">
                  <Link to={GROUP_ROUTE[g.id]} className="flex items-center gap-2 w-full">
                    <span className="text-sm flex-1 text-muted-foreground">Em breve</span>
                  </Link>
                </DropdownMenuItem>
              ) : (
                g.offerings.map((o) => {
                  const OIcon = o.icon;
                  const active = groupActive && currentOfferingId === o.id;
                  return (
                    <DropdownMenuItem key={o.id} asChild className="gap-2 pl-7">
                      <Link to={o.to} className="flex items-start gap-2 w-full">
                        <OIcon className="h-4 w-4 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{o.label}</div>
                          <div className="text-xs text-muted-foreground">{o.description}</div>
                        </div>
                        {active && <Check className="h-3.5 w-3.5 text-primary mt-1" />}
                      </Link>
                    </DropdownMenuItem>
                  );
                })
              )}
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}