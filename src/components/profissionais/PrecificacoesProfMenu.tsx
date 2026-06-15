import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderOpen, Save, Download, Eye, ChevronDown, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCotacoes } from "@/hooks/useCotacoes";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function PrecificacoesProfMenu() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const { cotacoes } = useCotacoes("profissionais");
  const canView = can("page.prof.cotacoes");

  const handleSave = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("prof:save-cotacao"));
    }
  };

  const handleRestore = (id: string) => {
    navigate(`/profissionais-alocados/cotacoes?open=${encodeURIComponent(id)}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
          <FolderOpen className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Precificações</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs">Precificações</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2 text-sm" onClick={handleSave}>
          <Save className="h-4 w-4" />
          <span className="flex-1">Salvar</span>
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2 text-sm">
            <Download className="h-4 w-4" />
            <span className="flex-1">Restaurar</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-72 max-h-80 overflow-y-auto">
            {cotacoes.length === 0 ? (
              <div className="px-2 py-3 text-xs text-muted-foreground text-center">Nenhuma cotação salva.</div>
            ) : (
              cotacoes.slice(0, 20).map((c) => (
                <DropdownMenuItem key={c.id} onClick={() => handleRestore(c.id)} className="flex flex-col items-start gap-0.5 text-sm">
                  <span className="font-medium truncate w-full">{c.cliente} — {c.cargo}</span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(c.criado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        {canView && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 text-sm" onClick={() => navigate("/profissionais-alocados/cotacoes")}>
              <Eye className="h-4 w-4" />
              <span className="flex-1">Visualizar</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}