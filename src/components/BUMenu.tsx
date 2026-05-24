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
import { Briefcase, ChevronDown, Calculator, Server, Cloud, Activity, Check, Home } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { GROUP_ACCESS_KEYS } from "@/lib/offerings";
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
]);

const OFFERINGS = [
  { id: "hub", label: "Página inicial", description: "Hub de ofertas IT Solutions", to: "/", icon: Home, groupSlug: null as null | keyof typeof GROUP_ACCESS_KEYS },
  { id: "ito", label: "ITO", description: "Smart ITO — calculadora completa", to: "/ito", icon: Calculator, groupSlug: "ito" as const },
  { id: "datacenter", label: "Datacenter", description: "Em breve", to: "/datacenter", icon: Server, groupSlug: "datacenter" as const },
  { id: "cloud", label: "Cloud", description: "Em breve", to: "/cloud", icon: Cloud, groupSlug: "cloud" as const },
  { id: "observabilidade", label: "Observabilidade", description: "Em breve", to: "/observabilidade", icon: Activity, groupSlug: "observabilidade" as const },
];

export default function BUMenu() {
  const { pathname } = useLocation();
  const { can } = useAuth();
  const visible = OFFERINGS.filter((o) =>
    o.groupSlug == null
      ? true
      : can(GROUP_ACCESS_KEYS[o.groupSlug] as PermissionKey),
  );
  const currentId =
    pathname === "/" ? "hub"
    : pathname === "/datacenter" ? "datacenter"
    : pathname === "/cloud" ? "cloud"
    : pathname === "/observabilidade" ? "observabilidade"
    : ITO_PATHS.has(pathname) ? "ito"
    : null;
  const currentLabel = OFFERINGS.find((o) => o.id === currentId)?.label ?? "Ofertas";

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
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs">Business Unit · IT Solutions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {visible.map((o) => {
          const Icon = o.icon;
          const active = currentId === o.id;
          return (
            <DropdownMenuItem key={o.id} asChild className="gap-2">
              <Link to={o.to} className="flex items-start gap-2 w-full">
                <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{o.label}</div>
                  <div className="text-xs text-muted-foreground">{o.description}</div>
                </div>
                {active && <Check className="h-3.5 w-3.5 text-primary mt-1" />}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}