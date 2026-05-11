import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { PermissionKey } from "@/lib/permissions";

interface RoleInfo {
  id: string;
  slug: string;
  name: string;
  is_system: boolean;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: RoleInfo | null;
  isAdmin: boolean;
  permissions: Set<string>;
  can: (key: PermissionKey) => boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<RoleInfo | null>(null);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());

  const loadAccess = useCallback(async (uid: string) => {
    const { data: ur } = await supabase
      .from("user_roles")
      .select("role_id, roles ( id, slug, name, is_system )")
      .eq("user_id", uid)
      .maybeSingle();

    const r = (ur?.roles ?? null) as RoleInfo | null;
    setRole(r);

    if (!r) {
      setPermissions(new Set());
      return;
    }

    const { data: perms } = await supabase
      .from("role_permissions")
      .select("permission_key, allowed")
      .eq("role_id", r.id);

    setPermissions(new Set((perms ?? []).filter((p) => p.allowed).map((p) => p.permission_key)));
  }, []);

  const refresh = useCallback(async () => {
    if (user) await loadAccess(user.id);
  }, [user, loadAccess]);

  useEffect(() => {
    // Set up listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        // Defer to avoid deadlocks
        setTimeout(() => loadAccess(newSession.user.id), 0);
      } else {
        setRole(null);
        setPermissions(new Set());
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadAccess(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [loadAccess]);

  const isAdmin = role?.slug === "admin";

  const can = useCallback(
    (key: PermissionKey) => {
      if (isAdmin) return true;
      return permissions.has(key);
    },
    [isAdmin, permissions],
  );

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: fullName ? { full_name: fullName } : undefined,
      },
    });
    return error ? { error: error.message } : {};
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, role, isAdmin, permissions, can, signIn, signUp, signOut, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}