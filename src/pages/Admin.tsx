import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PERMISSIONS } from "@/lib/permissions";
import { toast } from "sonner";
import {
  Loader2, Plus, KeyRound, Trash2, ArrowLeft, ShieldCheck, Pencil, Save,
  ChevronRight, Layers, Package, Settings2, Server, Cloud, Activity, Calculator,
} from "lucide-react";
import type { PermissionKey } from "@/lib/permissions";

type PermEntry = {
  read: PermissionKey;
  write?: PermissionKey;
  label: string;
};
type PermCategory = {
  id: string;
  name: string;
  /** Simple flat permissions */
  keys?: PermissionKey[];
  /** Page entries with optional write permission */
  entries?: PermEntry[];
};
type OfferingNode = {
  id: string;
  name: string;
  accessKey: PermissionKey;
  icon: React.ComponentType<{ className?: string }>;
  categories: PermCategory[];
};
type GroupNode = {
  id: string;
  name: string;
  accessKey: PermissionKey;
  icon: React.ComponentType<{ className?: string }>;
  offerings: OfferingNode[];
};

const PERMISSION_TREE: GroupNode[] = [
  {
    id: "ito",
    name: "ITO",
    accessKey: "group.ito.access",
    icon: Layers,
    offerings: [
      {
        id: "smart-ito",
        name: "Smart ITO",
        accessKey: "offering.ito.smart-ito.access",
        icon: Calculator,
        categories: [
          {
            id: "paginas",
            name: "Páginas",
            entries: [
              { read: "page.home",              write: "page.home.write",              label: "Início / calculadora" },
              { read: "page.detalhamento",      write: "page.detalhamento.write",      label: "Proposição" },
              { read: "page.equipe_n1",         write: "page.equipe_n1.write",         label: "Equipe N1" },
              { read: "page.equipe_n2",         write: "page.equipe_n2.write",         label: "Equipe N2" },
              { read: "page.equipe_n3",         write: "page.equipe_n3.write",         label: "Equipe N3" },
              { read: "page.field_service",     write: "page.field_service.write",     label: "Field Service" },
              { read: "page.gestao_ti",         write: "page.gestao_ti.write",         label: "Gestão de TI" },
              { read: "page.financeiro",        write: "page.financeiro.write",        label: "Financeiro" },
              { read: "page.taxas_demanda",     write: "page.taxas_demanda.write",     label: "Métricas e Parâmetros" },
              { read: "page.precificacoes",                                            label: "Precificações salvas" },
              { read: "page.relatorio_demanda",                                        label: "Relatório de Demanda" },
            ],
          },
          {
            id: "precificacao",
            name: "Precificação",
            keys: ["pricing.edit", "pricing.save_preset", "pricing.delete_preset", "params.save_defaults", "pricing.export_pdf"],
          },
          { id: "equipes", name: "Equipes", keys: ["teams.edit"] },
          { id: "financeiro", name: "Financeiro", keys: ["financeiro.edit"] },
        ],
      },
    ],
  },
  { id: "datacenter", name: "Datacenter", accessKey: "group.datacenter.access", icon: Server, offerings: [] },
  { id: "cloud", name: "Cloud", accessKey: "group.cloud.access", icon: Cloud, offerings: [] },
  { id: "observabilidade", name: "Observabilidade", accessKey: "group.observabilidade.access", icon: Activity, offerings: [] },
];

const ADMIN_KEYS: PermissionKey[] = ["admin.users.manage", "admin.roles.manage"];

const PERMISSION_LABELS: Record<string, string> = Object.fromEntries(
  PERMISSIONS.map((p) => [p.key, p.label]),
);

interface RoleRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_system: boolean;
}
interface UserRow {
  id: string;
  email: string;
  created_at: string;
  full_name: string | null;
  role: { id: string; name: string; slug: string } | null;
}

export default function Admin() {
  const { user, refresh } = useAuth();
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [{ data: r }, usersRes] = await Promise.all([
      supabase.from("roles").select("*").order("is_system", { ascending: false }).order("name"),
      supabase.functions.invoke("admin-users", { body: { action: "list" } }),
    ]);
    setRoles((r as RoleRow[]) ?? []);
    if (usersRes.error) toast.error(usersRes.error.message);
    else setUsers(usersRes.data?.users ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-[1400px] items-center gap-3 px-4">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-1.5 h-8">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h1 className="font-bold text-base">Administração</h1>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] p-4">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : (
          <Tabs defaultValue="users">
            <TabsList>
              <TabsTrigger value="users">Usuários</TabsTrigger>
              <TabsTrigger value="roles">Perfis e Permissões</TabsTrigger>
            </TabsList>
            <TabsContent value="users">
              <UsersTab users={users} roles={roles} reload={loadAll} currentUserId={user?.id} />
            </TabsContent>
            <TabsContent value="roles">
              <RolesTab roles={roles} reload={loadAll} onRolesChanged={refresh} />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}

function UsersTab({
  users,
  roles,
  reload,
  currentUserId,
}: {
  users: UserRow[];
  roles: RoleRow[];
  reload: () => void;
  currentUserId?: string;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState<UserRow | null>(null);
  const [editOpen, setEditOpen] = useState<UserRow | null>(null);

  const handleAssign = async (userId: string, roleId: string) => {
    const { error } = await supabase.functions.invoke("admin-users", {
      body: { action: "assign_role", user_id: userId, role_id: roleId || null },
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Perfil atribuído.");
      reload();
    }
  };

  const handleDelete = async (u: UserRow) => {
    if (!confirm(`Remover usuário ${u.email}?`)) return;
    const { error } = await supabase.functions.invoke("admin-users", {
      body: { action: "delete", user_id: u.id },
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Usuário removido.");
      reload();
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Usuários</CardTitle>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Novo usuário
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="text-sm">{u.full_name || <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell className="text-sm">
                  {u.email}
                  {u.id === currentUserId && <Badge variant="secondary" className="ml-2 text-[10px]">você</Badge>}
                </TableCell>
                <TableCell>
                  <Select
                    value={u.role?.id ?? "none"}
                    onValueChange={(v) => handleAssign(u.id, v === "none" ? "" : v)}
                  >
                    <SelectTrigger className="h-8 w-[200px] text-xs">
                      <SelectValue placeholder="Sem perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem perfil</SelectItem>
                      {roles.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditOpen(u)} className="gap-1 h-8">
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setPwOpen(u)} className="gap-1 h-8">
                    <KeyRound className="h-3.5 w-3.5" /> Senha
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(u)}
                    disabled={u.id === currentUserId}
                    className="gap-1 h-8 text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} roles={roles} reload={reload} />
      <PasswordDialog user={pwOpen} onClose={() => setPwOpen(null)} />
      <EditProfileDialog user={editOpen} onClose={() => setEditOpen(null)} reload={reload} />
    </Card>
  );
}

function EditProfileDialog({
  user,
  onClose,
  reload,
}: {
  user: UserRow | null;
  onClose: () => void;
  reload: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setFullName(user?.full_name ?? "");
  }, [user]);

  const submit = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.functions.invoke("admin-users", {
      body: { action: "update_profile", user_id: user.id, full_name: fullName },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Perfil atualizado.");
      onClose();
      reload();
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar usuário</DialogTitle>
          <DialogDescription>{user?.email}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Nome completo</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nome Sobrenome" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
  roles,
  reload,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  roles: RoleRow[];
  reload: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [roleId, setRoleId] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setEmail("");
      setPassword("");
      setFullName("");
      setRoleId("");
    }
  }, [open]);

  const submit = async () => {
    if (!email || password.length < 8) {
      toast.error("Email e senha (mín 8) obrigatórios.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.functions.invoke("admin-users", {
      body: { action: "create", email, password, full_name: fullName, role_id: roleId || null },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Usuário criado.");
      onOpenChange(false);
      reload();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
          <DialogDescription>Crie uma conta e atribua um perfil.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Senha temporária (mín 8)</Label>
            <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Perfil</Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger><SelectValue placeholder="Sem perfil" /></SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PasswordDialog({ user, onClose }: { user: UserRow | null; onClose: () => void }) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) setPw("");
  }, [user]);

  const submit = async () => {
    if (!user) return;
    if (pw.length < 8) {
      toast.error("Senha deve ter ao menos 8 caracteres.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.functions.invoke("admin-users", {
      body: { action: "update_password", user_id: user.id, password: pw },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Senha atualizada.");
      onClose();
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Trocar senha</DialogTitle>
          <DialogDescription>{user?.email}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Nova senha (mín 8)</Label>
          <Input value={pw} onChange={(e) => setPw(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RolesTab({
  roles,
  reload,
  onRolesChanged,
}: {
  roles: RoleRow[];
  reload: () => void;
  onRolesChanged: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(roles[0]?.id ?? null);
  const [perms, setPerms] = useState<Set<string>>(new Set());
  const [initialPerms, setInitialPerms] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [view, setView] = useState<
    | { level: "root" }
    | { level: "group"; groupId: string }
    | { level: "offering"; groupId: string; offeringId: string }
    | { level: "admin" }
  >({ level: "root" });

  useEffect(() => {
    setView({ level: "root" });
  }, [selected]);

  useEffect(() => {
    if (!selected && roles[0]) setSelected(roles[0].id);
  }, [roles, selected]);

  const role = roles.find((r) => r.id === selected) ?? null;

  useEffect(() => {
    (async () => {
      if (!selected) {
        setPerms(new Set());
        setInitialPerms(new Set());
        return;
      }
      setLoading(true);
      const { data } = await supabase
        .from("role_permissions")
        .select("permission_key, allowed")
        .eq("role_id", selected);
      const initial = new Set((data ?? []).filter((p) => p.allowed).map((p) => p.permission_key));
      setPerms(initial);
      setInitialPerms(new Set(initial));
      setLoading(false);
    })();
  }, [selected]);

  const dirty = (() => {
    if (perms.size !== initialPerms.size) return true;
    for (const k of perms) if (!initialPerms.has(k)) return true;
    return false;
  })();

  const toggle = (key: string, on: boolean) => {
    if (!selected || role?.is_system) return;
    setPerms((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const setKeysAll = (keys: PermissionKey[], on: boolean) => {
    if (!selected || role?.is_system) return;
    setPerms((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => {
        if (on) next.add(k);
        else next.delete(k);
      });
      return next;
    });
  };

  const setAll = (on: boolean) => {
    if (!selected || role?.is_system) return;
    setPerms(on ? new Set(PERMISSIONS.map((p) => p.key)) : new Set());
  };

  const save = async () => {
    if (!selected || role?.is_system || !dirty) return;
    setSaving(true);
    const toAdd = [...perms].filter((k) => !initialPerms.has(k));
    const toRemove = [...initialPerms].filter((k) => !perms.has(k));
    try {
      if (toAdd.length) {
        const { error } = await supabase.from("role_permissions").upsert(
          toAdd.map((k) => ({ role_id: selected, permission_key: k, allowed: true })),
          { onConflict: "role_id,permission_key" },
        );
        if (error) throw error;
      }
      if (toRemove.length) {
        const { error } = await supabase
          .from("role_permissions")
          .delete()
          .eq("role_id", selected)
          .in("permission_key", toRemove);
        if (error) throw error;
      }
      setInitialPerms(new Set(perms));
      toast.success("Permissões salvas.");
      onRolesChanged();
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const discard = () => setPerms(new Set(initialPerms));

  const createRole = async () => {
    const name = newRoleName.trim();
    if (!name) return;
    const slug = name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 40) + "_" + Date.now().toString(36);
    const { data, error } = await supabase
      .from("roles")
      .insert({ name, slug, is_system: false })
      .select()
      .single();
    if (error) toast.error(error.message);
    else {
      toast.success("Perfil criado.");
      setNewRoleName("");
      setSelected(data.id);
      reload();
    }
  };

  const deleteRole = async () => {
    if (!role || role.is_system) return;
    if (!confirm(`Excluir perfil ${role.name}? Usuários ligados a ele ficarão sem perfil.`)) return;
    const { error } = await supabase.from("roles").delete().eq("id", role.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Perfil excluído.");
      setSelected(null);
      reload();
    }
  };

  return (
    <div className="mt-4 grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Perfis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {roles.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelected(r.id)}
              className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center justify-between ${
                selected === r.id ? "bg-secondary" : "hover:bg-muted/60"
              }`}
            >
              <span>{r.name}</span>
              {r.is_system && <Badge variant="outline" className="text-[10px]">sistema</Badge>}
            </button>
          ))}
          <div className="pt-2 flex gap-1.5">
            <Input
              placeholder="Novo perfil"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              className="h-8 text-sm"
            />
            <Button size="sm" onClick={createRole} className="h-8">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">{role?.name ?? "Selecione um perfil"}</CardTitle>
            {role?.is_system && (
              <p className="text-xs text-muted-foreground mt-1">
                Perfil de sistema — todas as permissões liberadas, não editável.
              </p>
            )}
          </div>
          {role && !role.is_system && (
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" onClick={() => setAll(true)} disabled={saving} className="h-8 text-xs">
                Marcar todas
              </Button>
              <Button variant="outline" size="sm" onClick={() => setAll(false)} disabled={saving} className="h-8 text-xs">
                Limpar todas
              </Button>
              <Button variant="ghost" size="sm" onClick={deleteRole} className="text-destructive gap-1.5 h-8">
                <Trash2 className="h-3.5 w-3.5" /> Excluir
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {!role ? (
            <p className="text-sm text-muted-foreground">Nenhum perfil selecionado.</p>
          ) : loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <div className="space-y-4">
              <PermissionDrillDown
                view={view}
                setView={setView}
                perms={perms}
                isSystem={!!role.is_system}
                toggle={toggle}
                setKeysAll={setKeysAll}
              />
              {!role.is_system && (
                <div className="sticky bottom-0 -mx-6 -mb-6 mt-4 flex items-center justify-between gap-2 border-t bg-background/95 px-6 py-3 backdrop-blur">
                  <p className="text-xs text-muted-foreground">
                    {dirty ? "Alterações não salvas" : "Sem alterações pendentes"}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={discard} disabled={!dirty || saving}>
                      Descartar
                    </Button>
                    <Button size="sm" onClick={save} disabled={!dirty || saving} className="gap-1.5">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Salvar alterações
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type DrillView =
  | { level: "root" }
  | { level: "group"; groupId: string }
  | { level: "offering"; groupId: string; offeringId: string }
  | { level: "admin" };

function countActive(keys: PermissionKey[], perms: Set<string>) {
  let n = 0;
  for (const k of keys) if (perms.has(k)) n++;
  return n;
}

function categoryKeys(c: PermCategory): PermissionKey[] {
  const out: PermissionKey[] = [];
  if (c.keys) out.push(...c.keys);
  if (c.entries) {
    c.entries.forEach((e) => {
      out.push(e.read);
      if (e.write) out.push(e.write);
    });
  }
  return out;
}

function collectKeys(group: GroupNode): PermissionKey[] {
  const keys: PermissionKey[] = [group.accessKey];
  group.offerings.forEach((o) => {
    keys.push(o.accessKey);
    o.categories.forEach((c) => keys.push(...categoryKeys(c)));
  });
  return keys;
}

function offeringKeys(o: OfferingNode): PermissionKey[] {
  const keys: PermissionKey[] = [o.accessKey];
  o.categories.forEach((c) => keys.push(...categoryKeys(c)));
  return keys;
}

function Crumb({
  items,
  onNavigate,
}: {
  items: { label: string; onClick?: () => void }[];
  onNavigate?: () => void;
}) {
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3 w-3 opacity-60" />}
          {it.onClick ? (
            <button
              onClick={it.onClick}
              className="hover:text-foreground hover:underline underline-offset-2"
            >
              {it.label}
            </button>
          ) : (
            <span className="text-foreground font-medium">{it.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}

function TileCard({
  icon: Icon,
  title,
  subtitle,
  active,
  total,
  onOpen,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  active: number;
  total: number;
  onOpen: () => void;
  accent?: string;
}) {
  const pct = total > 0 ? Math.round((active / total) * 100) : 0;
  return (
    <button
      onClick={onOpen}
      className="group relative text-left rounded-lg border bg-card hover:bg-accent/40 hover:border-primary/40 transition-all p-4 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between">
        <div className={`h-9 w-9 rounded-md flex items-center justify-center bg-primary/10 text-primary ${accent ?? ""}`}>
          <Icon className="h-4 w-4" />
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
      <div>
        <div className="font-medium text-sm">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>}
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{active} / {total} permissões</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </button>
  );
}

function PermissionDrillDown({
  view,
  setView,
  perms,
  isSystem,
  toggle,
  setKeysAll,
}: {
  view: DrillView;
  setView: (v: DrillView) => void;
  perms: Set<string>;
  isSystem: boolean;
  toggle: (key: string, on: boolean) => void;
  setKeysAll: (keys: PermissionKey[], on: boolean) => void;
}) {
  // ROOT
  if (view.level === "root") {
    return (
      <div>
        <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-3">
          Grupos (Business Unit)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PERMISSION_TREE.map((g) => {
            const keys = collectKeys(g);
            return (
              <TileCard
                key={g.id}
                icon={g.icon}
                title={g.name}
                subtitle={g.offerings.length ? `${g.offerings.length} oferta(s)` : "Nenhuma oferta"}
                active={countActive(keys, perms)}
                total={keys.length}
                onOpen={() => setView({ level: "group", groupId: g.id })}
              />
            );
          })}
          <TileCard
            icon={Settings2}
            title="Administração"
            subtitle="Usuários e perfis"
            active={countActive(ADMIN_KEYS, perms)}
            total={ADMIN_KEYS.length}
            onOpen={() => setView({ level: "admin" })}
          />
        </div>
      </div>
    );
  }

  // ADMIN leaf
  if (view.level === "admin") {
    return (
      <div>
        <Crumb
          items={[
            { label: "Permissões", onClick: () => setView({ level: "root" }) },
            { label: "Administração" },
          ]}
        />
        <PermissionList
          keys={ADMIN_KEYS}
          perms={perms}
          isSystem={isSystem}
          toggle={toggle}
          setKeysAll={setKeysAll}
        />
      </div>
    );
  }

  const group = PERMISSION_TREE.find((g) => g.id === view.groupId);
  if (!group) {
    setView({ level: "root" });
    return null;
  }

  // GROUP level
  if (view.level === "group") {
    const groupAllKeys = collectKeys(group);
    return (
      <div>
        <Crumb
          items={[
            { label: "Permissões", onClick: () => setView({ level: "root" }) },
            { label: group.name },
          ]}
        />

        <div className="rounded-lg border bg-muted/30 p-3 mb-4 flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={perms.has(group.accessKey)}
              disabled={isSystem}
              onCheckedChange={(v) => toggle(group.accessKey, !!v)}
            />
            <span className="font-medium">Acessar grupo {group.name}</span>
          </label>
          {!isSystem && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => setKeysAll(groupAllKeys, true)}>
                marcar tudo
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => setKeysAll(groupAllKeys, false)}>
                limpar tudo
              </Button>
            </div>
          )}
        </div>

        {group.offerings.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            <Package className="h-5 w-5 mx-auto mb-2 opacity-50" />
            Nenhuma oferta cadastrada neste grupo ainda.
          </div>
        ) : (
          <>
            <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-3">Ofertas</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {group.offerings.map((o) => {
                const keys = offeringKeys(o);
                return (
                  <TileCard
                    key={o.id}
                    icon={o.icon}
                    title={o.name}
                    subtitle={`${o.categories.length} categoria(s)`}
                    active={countActive(keys, perms)}
                    total={keys.length}
                    onOpen={() => setView({ level: "offering", groupId: group.id, offeringId: o.id })}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  }

  // OFFERING level — show categories with checkboxes
  const offering = group.offerings.find((o) => o.id === view.offeringId);
  if (!offering) {
    setView({ level: "group", groupId: group.id });
    return null;
  }

  const allOfferingKeys = offeringKeys(offering);

  return (
    <div>
      <Crumb
        items={[
          { label: "Permissões", onClick: () => setView({ level: "root" }) },
          { label: group.name, onClick: () => setView({ level: "group", groupId: group.id }) },
          { label: offering.name },
        ]}
      />

      <div className="rounded-lg border bg-muted/30 p-3 mb-4 flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={perms.has(offering.accessKey)}
            disabled={isSystem}
            onCheckedChange={(v) => toggle(offering.accessKey, !!v)}
          />
          <span className="font-medium">Acessar oferta {offering.name}</span>
        </label>
        {!isSystem && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => setKeysAll(allOfferingKeys, true)}>
              marcar tudo
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => setKeysAll(allOfferingKeys, false)}>
              limpar tudo
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {offering.categories.map((cat) => {
          const active = countActive(cat.keys, perms);
          return (
            <div key={cat.id} className="rounded-lg border">
              <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/20">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium">{cat.name}</h4>
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {active}/{cat.keys.length}
                  </Badge>
                </div>
                {!isSystem && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setKeysAll(cat.keys, true)}>
                      todas
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setKeysAll(cat.keys, false)}>
                      nenhuma
                    </Button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 p-2">
                {cat.keys.map((k) => (
                  <label key={k} className="flex items-center gap-2 text-sm py-1 px-2 rounded hover:bg-muted/60">
                    <Checkbox
                      checked={isSystem ? true : perms.has(k)}
                      disabled={isSystem}
                      onCheckedChange={(v) => toggle(k, !!v)}
                    />
                    <span>{PERMISSION_LABELS[k] ?? k}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PermissionList({
  keys,
  perms,
  isSystem,
  toggle,
  setKeysAll,
}: {
  keys: PermissionKey[];
  perms: Set<string>;
  isSystem: boolean;
  toggle: (key: string, on: boolean) => void;
  setKeysAll: (keys: PermissionKey[], on: boolean) => void;
}) {
  const active = countActive(keys, perms);
  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/20">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium">Permissões</h4>
          <Badge variant="secondary" className="text-[10px] h-5">{active}/{keys.length}</Badge>
        </div>
        {!isSystem && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setKeysAll(keys, true)}>
              todas
            </Button>
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setKeysAll(keys, false)}>
              nenhuma
            </Button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 p-2">
        {keys.map((k) => (
          <label key={k} className="flex items-center gap-2 text-sm py-1 px-2 rounded hover:bg-muted/60">
            <Checkbox
              checked={isSystem ? true : perms.has(k)}
              disabled={isSystem}
              onCheckedChange={(v) => toggle(k, !!v)}
            />
            <span>{PERMISSION_LABELS[k] ?? k}</span>
          </label>
        ))}
      </div>
    </div>
  );
}