import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE);

    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);

    const callerId = authData.user.id;

    // Verify caller is admin
    const { data: adminCheck } = await admin
      .from("user_roles")
      .select("roles!inner ( slug )")
      .eq("user_id", callerId);
    const isAdmin = (adminCheck ?? []).some((r: any) => r.roles?.slug === "admin");
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "list") {
      const { data: usersData, error } = await admin.auth.admin.listUsers({ perPage: 200 });
      if (error) return json({ error: error.message }, 400);
      const { data: assignments } = await admin
        .from("user_roles")
        .select("user_id, role_id, roles ( id, name, slug )");
      const map = new Map<string, any>();
      (assignments ?? []).forEach((a: any) => map.set(a.user_id, a.roles));
      const users = usersData.users.map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        role: map.get(u.id) ?? null,
      }));
      return json({ users });
    }

    if (action === "create") {
      const { email, password, full_name, role_id } = body;
      if (!email || !password || password.length < 8) return json({ error: "Email e senha (mín 8) obrigatórios" }, 400);
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name ?? email },
      });
      if (error) return json({ error: error.message }, 400);
      if (role_id && data.user) {
        await admin.from("user_roles").upsert({ user_id: data.user.id, role_id });
      }
      return json({ user: data.user });
    }

    if (action === "update_password") {
      const { user_id, password } = body;
      if (!user_id || !password || password.length < 8) return json({ error: "Dados inválidos" }, 400);
      const { error } = await admin.auth.admin.updateUserById(user_id, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "delete") {
      const { user_id } = body;
      if (!user_id) return json({ error: "user_id obrigatório" }, 400);
      if (user_id === callerId) return json({ error: "Você não pode excluir a si mesmo." }, 400);
      const { error } = await admin.auth.admin.deleteUser(user_id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "assign_role") {
      const { user_id, role_id } = body;
      if (!user_id) return json({ error: "user_id obrigatório" }, 400);
      await admin.from("user_roles").delete().eq("user_id", user_id);
      if (role_id) {
        const { error } = await admin.from("user_roles").insert({ user_id, role_id });
        if (error) return json({ error: error.message }, 400);
      }
      return json({ ok: true });
    }

    return json({ error: "Ação desconhecida" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});