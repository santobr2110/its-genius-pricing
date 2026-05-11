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
import { PERMISSIONS, PERMISSION_GROUPS } from "@/lib/permissions";
import { toast } from "sonner";
import { Loader2, Plus, KeyRound, Trash2, ArrowLeft, ShieldCheck } from "lucide-react";

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
              <TableHead>Email</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
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
    </Card>
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
  const [loading, setLoading] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");

  useEffect(() => {
    if (!selected && roles[0]) setSelected(roles[0].id);
  }, [roles, selected]);

  const role = roles.find((r) => r.id === selected) ?? null;

  useEffect(() => {
    (async () => {
      if (!selected) return setPerms(new Set());
      setLoading(true);
      const { data } = await supabase
        .from("role_permissions")
        .select("permission_key, allowed")
        .eq("role_id", selected);
      setPerms(new Set((data ?? []).filter((p) => p.allowed).map((p) => p.permission_key)));
      setLoading(false);
    })();
  }, [selected]);

  const toggle = async (key: string, on: boolean) => {
    if (!selected || role?.is_system) return;
    const next = new Set(perms);
    if (on) next.add(key);
    else next.delete(key);
    setPerms(next);
    if (on) {
      await supabase
        .from("role_permissions")
        .upsert({ role_id: selected, permission_key: key, allowed: true }, { onConflict: "role_id,permission_key" });
    } else {
      await supabase.from("role_permissions").delete().eq("role_id", selected).eq("permission_key", key);
    }
    onRolesChanged();
  };

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
            <Button variant="ghost" size="sm" onClick={deleteRole} className="text-destructive gap-1.5">
              <Trash2 className="h-3.5 w-3.5" /> Excluir
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!role ? (
            <p className="text-sm text-muted-foreground">Nenhum perfil selecionado.</p>
          ) : loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <div className="space-y-4">
              {PERMISSION_GROUPS.map((group) => (
                <div key={group}>
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">{group}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {PERMISSIONS.filter((p) => p.group === group).map((p) => {
                      const checked = role.is_system ? true : perms.has(p.key);
                      return (
                        <label
                          key={p.key}
                          className="flex items-center gap-2 text-sm py-1 px-2 rounded hover:bg-muted/60"
                        >
                          <Checkbox
                            checked={checked}
                            disabled={role.is_system}
                            onCheckedChange={(v) => toggle(p.key, !!v)}
                          />
                          <span>{p.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}