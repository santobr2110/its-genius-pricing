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
import { snapshotCurrentPricingParams } from "@/hooks/useParameterProfiles";
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
  const [salesforceCode, setSalesforceCode] = useState("");
  const [clientName, setClientName] = useState("");
  const [accountManager, setAccountManager] = useState("");
  const [buSpecialist, setBuSpecialist] = useState("");
  const [contractTerm, setContractTerm] = useState("");
  const [buArchitect, setBuArchitect] = useState("");

  const handleSave = async () => {
    const missing: string[] = [];
    if (!clientName.trim()) missing.push("Nome do Cliente");
    if (!accountManager.trim()) missing.push("Gerente de Conta");
    if (!buSpecialist.trim()) missing.push("Especialista da BU");
    if (!contractTerm.trim()) missing.push("Prazo de Contrato");
    if (!salesforceCode.trim()) missing.push("No. Oportunidade Sales Force");
    if (!buArchitect.trim()) missing.push("Arquiteto BU");
    if (missing.length) {
      toast.error(`Preencha os campos obrigatórios: ${missing.join(", ")}`);
      return;
    }
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
      // Snapshot completo da precificação em tela: parâmetros carregados +
      // entradas atuais do cliente/oferta antes de salvar.
      const { data: { user } } = await supabase.auth.getUser();
      const allParams = user
        ? await snapshotCurrentPricingParams(user.id, { calculator: state, n1Team, n2Team })
        : undefined;
      const finalName = name.trim() || clientName.trim();
      const preset = await save(
        finalName,
        state,
        n1Team,
        n2Team,
        volumes,
        escopo,
        allParams,
        salesforceCode,
        {
          clientName: clientName.trim(),
          accountManager: accountManager.trim(),
          buSpecialist: buSpecialist.trim(),
          contractTerm: contractTerm.trim(),
          buArchitect: buArchitect.trim(),
        },
      );
      toast.success(`Precificação "${preset.name}" salva (${preset.quoteCode}).`);
      setName("");
      setSalesforceCode("");
      setClientName(""); setAccountManager(""); setBuSpecialist("");
      setContractTerm(""); setBuArchitect("");
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Salvar precificação</DialogTitle>
            <DialogDescription>
              Preencha os dados comerciais desta cotação. Um código único
              (ITS-SMART-ITO-XXXXXXX) será gerado automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="preset-client">Nome do Cliente *</Label>
              <Input id="preset-client" autoFocus value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="preset-am">Gerente de Conta *</Label>
              <Input id="preset-am" value={accountManager} onChange={(e) => setAccountManager(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="preset-bus">Especialista da BU *</Label>
              <Input id="preset-bus" value={buSpecialist} onChange={(e) => setBuSpecialist(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="preset-term">Prazo de Contrato *</Label>
              <Input id="preset-term" value={contractTerm} onChange={(e) => setContractTerm(e.target.value)} placeholder="Ex.: 12 meses" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="preset-sf">No. Oportunidade Sales Force *</Label>
              <Input id="preset-sf" value={salesforceCode} onChange={(e) => setSalesforceCode(e.target.value)} placeholder="Ex.: 0061x00000ABCDE" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="preset-arch">Arquiteto BU *</Label>
              <Input id="preset-arch" value={buArchitect} onChange={(e) => setBuArchitect(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="preset-name">Nome da precificação (opcional)</Label>
              <Input id="preset-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Padrão: nome do cliente" />
            </div>
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
