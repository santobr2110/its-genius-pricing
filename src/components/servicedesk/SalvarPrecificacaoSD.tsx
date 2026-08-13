import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useServiceDesk } from "@/contexts/ServiceDeskContext";
import { useServiceDeskPricingPresets } from "@/hooks/servicedesk/useServiceDeskPricingPresets";

export default function SalvarPrecificacaoSD() {
  const { can } = useAuth();
  const { state, team, itens, rotinasOff } = useServiceDesk();
  const { save } = useServiceDeskPricingPresets({ autoLoad: false });
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [salesforceCode, setSalesforceCode] = useState("");
  const [accountManager, setAccountManager] = useState("");
  const [buSpecialist, setBuSpecialist] = useState("");
  const [contractTerm, setContractTerm] = useState("");
  const [buArchitect, setBuArchitect] = useState("");

  if (!can("sd.pricing.save")) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const preset = await save(
        name,
        { state, team: team.teamState, itensAdicionais: itens, rotinasOff },
        salesforceCode,
        { clientName, accountManager, buSpecialist, contractTerm, buArchitect },
      );
      toast.success(`Precificação salva (${preset.quoteCode ?? preset.name}).`);
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5"><Save className="h-3.5 w-3.5" /> Salvar precificação</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Salvar precificação — Smart Service Desk</DialogTitle></DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs">Nome da precificação</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Cliente X — Service Desk 24x7" />
          </div>
          <div className="space-y-1"><Label className="text-xs">Cliente</Label>
            <Input value={clientName} onChange={(e) => setClientName(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">Código Salesforce</Label>
            <Input value={salesforceCode} onChange={(e) => setSalesforceCode(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">Gerente de contas</Label>
            <Input value={accountManager} onChange={(e) => setAccountManager(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">Especialista BU</Label>
            <Input value={buSpecialist} onChange={(e) => setBuSpecialist(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">Prazo contratual</Label>
            <Input value={contractTerm} onChange={(e) => setContractTerm(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">Arquiteto BU</Label>
            <Input value={buArchitect} onChange={(e) => setBuArchitect(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}