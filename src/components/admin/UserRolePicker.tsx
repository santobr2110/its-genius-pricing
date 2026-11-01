import { useRef, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";

type Role = { id: string; name: string; slug: string };

export default function UserRolePicker({ userId, roles, assigned, onSaved }: {
  userId: string;
  roles: Role[];
  assigned: Role[];
  onSaved: (roles: Role[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  const changed = draft.length !== assigned.length || draft.some((id) => !assigned.some((r) => r.id === id));

  const save = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "assign_role", user_id: userId, role_ids: draft },
      });
      if (error || data?.error) throw new Error(error?.message ?? data.error);
      onSaved(roles.filter((r) => draft.includes(r.id)));
      toast.success("Perfis atualizados.");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar os perfis.");
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={(next) => {
      if (inFlight.current) return;
      if (next) setDraft(assigned.map((r) => r.id));
      setOpen(next);
    }}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Selecionar perfis" className="h-auto min-h-8 w-[220px] justify-start text-xs font-normal flex-wrap gap-1 py-1">
          {assigned.length === 0 ? <span className="text-muted-foreground">Sem perfil</span> : assigned.map((r) => (
            <Badge key={r.id} variant="secondary" className="text-[10px]">{r.name}</Badge>
          ))}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-2" align="start">
        <p className="px-1 pb-2 text-xs text-muted-foreground">As permissões dos perfis marcados são somadas.</p>
        {roles.map((r) => (
          <label key={r.id} className="flex items-center gap-2 rounded px-1 py-1.5 text-sm hover:bg-muted cursor-pointer">
            <Checkbox checked={draft.includes(r.id)} disabled={saving} onCheckedChange={(checked) => {
              setDraft((current) => checked === true ? [...new Set([...current, r.id])] : current.filter((id) => id !== r.id));
            }} />
            {r.name}
          </label>
        ))}
        <div className="flex justify-end gap-2 border-t mt-2 pt-2">
          <Button variant="ghost" size="sm" disabled={saving} onClick={() => setOpen(false)}>Cancelar</Button>
          <Button size="sm" disabled={saving || !changed} onClick={save}>
            {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />} Salvar perfis
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}