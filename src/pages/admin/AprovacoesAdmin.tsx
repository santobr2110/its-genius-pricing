import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useApprovalConfig } from "@/hooks/useApprovalConfig";
import type { ApprovalRole, ApprovalTier } from "@/lib/approval/types";

const OFFERINGS = [
  { code: "smart-ito", label: "Smart ITO" },
  { code: "profissionais", label: "Profissionais" },
  { code: "field-service", label: "Field Service" },
];

export default function AprovacoesAdmin() {
  const [offering, setOffering] = useState("smart-ito");
  const { roles, members, tiers, refresh } = useApprovalConfig(offering);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-[1400px] items-center gap-3 px-4">
          <Button asChild size="icon" variant="ghost" className="h-8 w-8">
            <Link to="/admin"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-sm font-bold">Administração · Aprovações de Precificação</h1>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] p-6 space-y-6">
        <RolesPanel roles={roles} members={members} onChange={refresh} />
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Faixas de Aprovação</CardTitle>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Calculadora:</Label>
              <Select value={offering} onValueChange={setOffering}>
                <SelectTrigger className="h-8 w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OFFERINGS.map((o) => <SelectItem key={o.code} value={o.code}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <TiersPanel offering={offering} roles={roles} tiers={tiers} onChange={refresh} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function RolesPanel({ roles, members, onChange }: {
  roles: ApprovalRole[]; members: any[]; onChange: () => void;
}) {
  const [newRoleLabel, setNewRoleLabel] = useState("");
  const [newRoleSlug, setNewRoleSlug] = useState("");

  const addRole = async () => {
    if (!newRoleLabel || !newRoleSlug) return;
    const { error } = await supabase.from("approval_roles").insert({ label: newRoleLabel, slug: newRoleSlug });
    if (error) { toast.error(error.message); return; }
    setNewRoleLabel(""); setNewRoleSlug(""); onChange();
  };

  const removeRole = async (id: string) => {
    if (!confirm("Remover este papel? Membros e vínculos serão removidos.")) return;
    const { error } = await supabase.from("approval_roles").delete().eq("id", id);
    if (error) toast.error(error.message); else onChange();
  };

  return (
    <Card>
      <CardHeader><CardTitle>Papéis e Pessoas</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label className="text-xs">Novo papel — Nome</Label>
            <Input value={newRoleLabel} onChange={(e) => setNewRoleLabel(e.target.value)} placeholder="Ex.: Diretor Comercial" />
          </div>
          <div className="w-48">
            <Label className="text-xs">Slug (chave única)</Label>
            <Input value={newRoleSlug} onChange={(e) => setNewRoleSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))} placeholder="diretor_comercial" />
          </div>
          <Button onClick={addRole}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
        </div>
        <div className="space-y-3">
          {roles.map((role) => (
            <RoleRow key={role.id} role={role} members={members.filter((m) => m.role_id === role.id)} onChange={onChange} onRemove={() => removeRole(role.id)} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RoleRow({ role, members, onChange, onRemove }: {
  role: ApprovalRole; members: any[]; onChange: () => void; onRemove: () => void;
}) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");

  const addMember = async () => {
    if (!email) return;
    // Look up user_id by email in profiles
    const { data: prof } = await supabase.from("profiles").select("id, full_name").eq("email", email).maybeSingle();
    if (!prof) { toast.error("Usuário não encontrado em profiles. Peça que ele faça login uma vez."); return; }
    const { error } = await supabase.from("approval_role_members").insert({
      role_id: role.id, user_id: prof.id, email, full_name: fullName || prof.full_name,
    });
    if (error) { toast.error(error.message); return; }
    setEmail(""); setFullName(""); onChange();
  };

  const removeMember = async (id: string) => {
    const { error } = await supabase.from("approval_role_members").delete().eq("id", id);
    if (error) toast.error(error.message); else onChange();
  };

  return (
    <div className="rounded border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-semibold">{role.label} <span className="text-xs text-muted-foreground">({role.slug})</span></div>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {members.map((m) => (
          <Badge key={m.id} variant="outline" className="gap-1">
            {m.full_name || m.email}
            <button onClick={() => removeMember(m.id)} className="ml-1 hover:text-destructive">×</button>
          </Badge>
        ))}
        {members.length === 0 && <span className="text-xs text-muted-foreground">Sem membros</span>}
      </div>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Label className="text-xs">E-mail do usuário (já cadastrado no app)</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@empresa.com" />
        </div>
        <div className="flex-1">
          <Label className="text-xs">Nome (opcional)</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <Button size="sm" onClick={addMember}><Plus className="h-4 w-4 mr-1" /> Vincular</Button>
      </div>
    </div>
  );
}

function TiersPanel({ offering, roles, tiers, onChange }: {
  offering: string; roles: ApprovalRole[]; tiers: ApprovalTier[]; onChange: () => void;
}) {
  const addTier = async () => {
    const { data, error } = await supabase.from("approval_tiers").insert({
      offering, label: "Nova faixa", min_pct: 0, max_pct: null, mode: "all",
      sort_order: (tiers[tiers.length - 1]?.sort_order ?? 0) + 10,
    }).select("id").single();
    if (error || !data) { toast.error(error?.message ?? "erro"); return; }
    onChange();
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={addTier}><Plus className="h-4 w-4 mr-1" /> Nova faixa</Button>
      </div>
      {tiers.length === 0 && <div className="text-sm text-muted-foreground">Nenhuma faixa configurada para esta calculadora.</div>}
      {tiers.map((t) => <TierRow key={t.id} tier={t} roles={roles} onChange={onChange} />)}
      <div className="text-xs text-muted-foreground">
        Regra: a faixa aplica quando <code>min_pct ≤ rentabilidade &lt; max_pct</code>. Deixe um campo vazio para sem limite.
        Se rentabilidade não cai em nenhuma faixa, não há aprovação requerida.
      </div>
    </div>
  );
}

function TierRow({ tier, roles, onChange }: { tier: ApprovalTier; roles: ApprovalRole[]; onChange: () => void; }) {
  const [dirty, setDirty] = useState<Partial<ApprovalTier> | null>(null);
  const [roleIds, setRoleIds] = useState<string[]>(tier.role_ids ?? []);
  const [dirtyRoles, setDirtyRoles] = useState(false);
  useEffect(() => { setRoleIds(tier.role_ids ?? []); }, [tier.role_ids]);

  const merged = { ...tier, ...(dirty ?? {}) };

  const save = async () => {
    if (dirty) {
      const { error } = await supabase.from("approval_tiers").update({
        label: merged.label, min_pct: merged.min_pct, max_pct: merged.max_pct,
        mode: merged.mode, ativo: merged.ativo, sort_order: merged.sort_order,
      }).eq("id", tier.id);
      if (error) { toast.error(error.message); return; }
    }
    if (dirtyRoles) {
      await supabase.from("approval_tier_roles").delete().eq("tier_id", tier.id);
      if (roleIds.length) {
        await supabase.from("approval_tier_roles").insert(roleIds.map((rid) => ({ tier_id: tier.id, role_id: rid })));
      }
    }
    setDirty(null); setDirtyRoles(false); onChange();
    toast.success("Faixa salva");
  };

  const remove = async () => {
    if (!confirm("Remover faixa?")) return;
    const { error } = await supabase.from("approval_tiers").delete().eq("id", tier.id);
    if (error) toast.error(error.message); else onChange();
  };

  return (
    <div className="rounded border p-3 space-y-2">
      <div className="grid grid-cols-12 gap-2 items-end">
        <div className="col-span-4">
          <Label className="text-xs">Rótulo</Label>
          <Input value={merged.label} onChange={(e) => setDirty({ ...dirty, label: e.target.value })} />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Min %</Label>
          <Input type="number" step="0.1" value={merged.min_pct ?? ""} onChange={(e) => setDirty({ ...dirty, min_pct: e.target.value === "" ? null : Number(e.target.value) })} />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Max %</Label>
          <Input type="number" step="0.1" value={merged.max_pct ?? ""} onChange={(e) => setDirty({ ...dirty, max_pct: e.target.value === "" ? null : Number(e.target.value) })} />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Modo</Label>
          <Select value={merged.mode} onValueChange={(v) => setDirty({ ...dirty, mode: v as "all" | "any" })}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos aprovam</SelectItem>
              <SelectItem value="any">Qualquer um aprova</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-1 flex items-center gap-1">
          <Checkbox checked={merged.ativo} onCheckedChange={(v) => setDirty({ ...dirty, ativo: !!v })} />
          <span className="text-xs">Ativo</span>
        </div>
        <div className="col-span-1 flex justify-end gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={save} disabled={!dirty && !dirtyRoles} title="Salvar"><Save className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={remove} title="Remover"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="pt-1">
        <Label className="text-xs">Papéis exigidos</Label>
        <div className="flex flex-wrap gap-2 mt-1">
          {roles.map((r) => {
            const checked = roleIds.includes(r.id);
            return (
              <label key={r.id} className={`text-xs px-2 py-1 rounded border cursor-pointer ${checked ? "bg-primary text-primary-foreground" : ""}`}>
                <input type="checkbox" className="hidden" checked={checked} onChange={() => {
                  setRoleIds((prev) => checked ? prev.filter((x) => x !== r.id) : [...prev, r.id]);
                  setDirtyRoles(true);
                }} />
                {r.label}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}