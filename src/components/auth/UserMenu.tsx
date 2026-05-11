import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Shield, UserCircle2 } from "lucide-react";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function UserMenu() {
  const { user, role, isAdmin, fullName, signOut } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const displayName = fullName?.trim() || user.email || "";
  const initials = fullName?.trim() ? getInitials(fullName) : (user.email?.[0] ?? "?").toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" title={displayName}>
          <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
            {initials}
          </span>
          <span className="hidden sm:inline max-w-[120px] truncate">
            {fullName?.trim() || initials}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs">
          <div className="font-medium truncate">{displayName}</div>
          {fullName && <div className="text-muted-foreground text-[10px] truncate">{user.email}</div>}
          <div className="text-muted-foreground text-[10px]">
            Perfil: {role?.name ?? "Sem perfil"}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isAdmin && (
          <DropdownMenuItem onClick={() => navigate("/admin")} className="gap-2 text-sm">
            <Shield className="h-4 w-4" /> Administração
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => signOut()} className="gap-2 text-sm">
          <LogOut className="h-4 w-4" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
