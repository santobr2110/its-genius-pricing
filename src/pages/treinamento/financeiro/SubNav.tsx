import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Submenu em pílulas, mesmo visual do Financeiro do Smart ITO. */
export default function SubNav({ items }: { items: { to: string; label: string; icon: LucideIcon; end?: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 rounded-lg border bg-background p-1 w-fit">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end}
          className={({ isActive }) => cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}>
          <Icon className="h-3.5 w-3.5" />{label}
        </NavLink>
      ))}
    </div>
  );
}
