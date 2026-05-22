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
  { id: "hub", label: "Página inicial", description: "Hub de ofertas IT Solutions", to: "/", icon: Home },
  { id: "ito", label: "ITO", description: "Smart ITO — calculadora completa", to: "/ito", icon: Calculator },
  { id: "datacenter", label: "Datacenter", description: "Em breve", to: "/datacenter", icon: Server },
  { id: "cloud", label: "Cloud", description: "Em breve", to: "/cloud", icon: Cloud },
  { id: "observabilidade", label: "Observabilidade", description: "Em breve", to: "/observabilidade", icon: Activity },
];

export default function BUMenu() {
  const { pathname } = useLocation();
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
        {OFFERINGS.map((o) => {
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