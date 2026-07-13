import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { Inbox, KeyRound, Loader2, LogOut, Send, Shield, UserCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function UserMenu() {
  const { user, role, isAdmin, fullName, signOut } = useAuth();
  const navigate = useNavigate();
  const [pwOpen, setPwOpen] = useState(false);
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [busy, setBusy] = useState(false);
  if (!user) return null;

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 8) return toast.error("A nova senha deve ter ao menos 8 caracteres.");
    if (newPw !== newPw2) return toast.error("As senhas não coincidem.");
    if (!user.email) return toast.error("Usuário sem email associado.");
    setBusy(true);
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: curPw,
    });
    if (signErr) {
      setBusy(false);
      return toast.error("Senha atual incorreta.");
    }
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Senha alterada com sucesso.");
    setCurPw(""); setNewPw(""); setNewPw2("");
    setPwOpen(false);
  };

  const displayName = fullName?.trim() || user.email || "";
  const initials = fullName?.trim() ? getInitials(fullName) : (user.email?.[0] ?? "?").toUpperCase();

  return (
    <>
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
        <DropdownMenuItem onClick={() => navigate("/aprovacoes/minhas")} className="gap-2 text-sm">
          <Inbox className="h-4 w-4" /> Minhas Aprovações
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/solicitacoes/minhas")} className="gap-2 text-sm">
          <Send className="h-4 w-4" /> Minhas Solicitações
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setPwOpen(true)} className="gap-2 text-sm">
          <KeyRound className="h-4 w-4" /> Alterar senha
        </DropdownMenuItem>
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
    <Dialog open={pwOpen} onOpenChange={setPwOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Alterar senha</DialogTitle>
          <DialogDescription>Informe sua senha atual e escolha uma nova senha.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submitPassword} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cur-pw">Senha atual</Label>
            <Input id="cur-pw" type="password" autoComplete="current-password" value={curPw} onChange={(e) => setCurPw(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-pw">Nova senha (mín. 8)</Label>
            <Input id="new-pw" type="password" autoComplete="new-password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-pw2">Confirmar nova senha</Label>
            <Input id="new-pw2" type="password" autoComplete="new-password" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} required />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPwOpen(false)} disabled={busy}>Cancelar</Button>
            <Button type="submit" disabled={busy} className="gap-2">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}
