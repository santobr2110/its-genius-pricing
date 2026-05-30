import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderOpen, Save, Download, Eye, ChevronDown, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useITSMContext } from "@/contexts/ITSMContext";
import { usePricingPresets, type PricingPreset } from "@/hooks/usePricingPresets";
import { snapshotCurrentParams } from "@/hooks/useParameterProfiles";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { SMART_ITO_NS } from "@/lib/offerings";
import {
  ESCOPO_DEFAULT, RESTRICOES_GERAIS_DEFAULT, ITENS_ADICIONAIS_DEFAULT,
  type EscopoProposicao, type ItemAdicional,
} from "@/data/escopoProposicao";

function readLs<T>(rawKey: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(SMART_ITO_NS + rawKey);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function SavePresetButton() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const { state, n1Team, n2Team, loadPreset } = useITSMContext();
  const { presets, save } = usePricingPresets();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const handleSave = async () => {
    const totalAtivos =
      (state.qtdServidores || 0) +
      (state.qtdAtivosRede || 0) +
      (state.qtdBancosDados || 0) +
      (state.qtdSistemas || 0);
    const chamadosAtivosMes = state.semVolumesAtuais ? 0 : state.volumeChamadosAtivosManual;
    const chamadosUsuariosMes = state.semVolumesAtuais ? 0 : state.volumeChamadosUsuariosManual;
    const volumes = {
      chamadosAtivosMes,
      chamadosUsuariosMes,
      chamadosPorAtivo: totalAtivos > 0 ? chamadosAtivosMes / totalAtivos : 0,
      chamadosPorUsuario: state.qtdUsuarios > 0 ? chamadosUsuariosMes / state.qtdUsuarios : 0,
    };
    const escopo = {
      proposicao: readLs<EscopoProposicao>("escopo:proposicao", ESCOPO_DEFAULT),
      restricoesGerais: readLs<string[]>("escopo:restricoesGerais", RESTRICOES_GERAIS_DEFAULT),
      itensAdicionais: readLs<ItemAdicional[]>("escopo:itensAdicionais", ITENS_ADICIONAIS_DEFAULT),
    };
    try {
      // Snapshot completo de todos os parâmetros persistidos (equivalente
      // ao Perfil de Parâmetros) para que a restauração seja 100% fiel.
      const { data: { user } } = await supabase.auth.getUser();
      const allParams = user ? await snapshotCurrentParams(user.id) : undefined;
      const preset = await save(name, state, n1Team, n2Team, volumes, escopo, allParams);
      toast.success(`Precificação "${preset.name}" salva.`);
      setName("");
      setOpen(false);
      // Ativa esta aba no modo "precificação aberta" para que edições
      // subsequentes sejam auto-salvas no preset recém-criado (mesmo
      // comportamento de "Abrir em nova aba").
      if (typeof window !== "undefined") {
        window.location.href = `/ito?preset=${encodeURIComponent(preset.id)}`;
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar.");
    }
  };

  const handleRestore = (p: PricingPreset) => {
    // Restaurar = abrir a precificação nesta aba em modo auto-save.
    if (typeof window !== "undefined") {
      window.location.href = `/ito?preset=${encodeURIComponent(p.id)}`;
    }
  };

  const canView = can("page.precificacoes");

  return (
    <>
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
          <DropdownMenuItem className="gap-2 text-sm" onClick={() => setOpen(true)}>
            <Save className="h-4 w-4" />
            <span className="flex-1">Salvar</span>
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2 text-sm">
              <Download className="h-4 w-4" />
              <span className="flex-1">Restaurar</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-64 max-h-80 overflow-y-auto">
              {presets.length === 0 ? (
                <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                  Nenhuma precificação salva.
                </div>
              ) : (
                presets.map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    onClick={() => handleRestore(p)}
                    className="flex flex-col items-start gap-0.5 text-sm"
                  >
                    <span className="font-medium truncate w-full">{p.name}</span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(p.updatedAt).toLocaleString("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          {canView && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 text-sm"
                onClick={() => navigate("/precificacoes")}
              >
                <Eye className="h-4 w-4" />
                <span className="flex-1">Visualizar</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar precificação</DialogTitle>
            <DialogDescription>
              Dê um nome para identificar esta configuração. Todos os parâmetros atuais
              (inventário, taxas, financeiro e equipes) serão salvos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="preset-name">Nome da precificação</Label>
            <Input
              id="preset-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Cliente Acme - Proposta v1"
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
