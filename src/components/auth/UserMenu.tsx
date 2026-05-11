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

export default function UserMenu() {
  const { user, role, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
          <UserCircle2 className="h-4 w-4" />
          <span className="hidden sm:inline max-w-[140px] truncate">{user.email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs">
          <div className="font-medium truncate">{user.email}</div>
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
