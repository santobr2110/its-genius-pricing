import { NavLink } from "react-router-dom";
import { Receipt, Calculator, Table as TableIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/financeiro", label: "Resultado da Operação", icon: Receipt, end: true },
  { to: "/financeiro/impostos", label: "Impostos & Markup", icon: Calculator, end: false },
  { to: "/financeiro/comissoes", label: "Comissões", icon: TableIcon, end: false },
];

export default function FinanceiroSubNav() {
  return (
    <div className="flex flex-wrap gap-1.5 rounded-lg border bg-background p-1 w-fit">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            className={({ isActive }) =>
              cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )
            }
          >
            <Icon className="h-3.5 w-3.5" />
            {it.label}
          </NavLink>
        );
      })}
    </div>
  );
}