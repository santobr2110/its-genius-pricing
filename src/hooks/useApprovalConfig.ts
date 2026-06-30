import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ApprovalRole, ApprovalRoleMember, ApprovalTier } from "@/lib/approval/types";

export function useApprovalConfig(offering?: string) {
  const [roles, setRoles] = useState<ApprovalRole[]>([]);
  const [members, setMembers] = useState<ApprovalRoleMember[]>([]);
  const [tiers, setTiers] = useState<ApprovalTier[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [r, m, t, tr] = await Promise.all([
      supabase.from("approval_roles").select("*").order("label"),
      supabase.from("approval_role_members").select("*"),
      offering
        ? supabase.from("approval_tiers").select("*").eq("offering", offering).order("sort_order")
        : supabase.from("approval_tiers").select("*").order("offering").order("sort_order"),
      supabase.from("approval_tier_roles").select("*"),
    ]);
    const tierIds = new Set((t.data ?? []).map((x: any) => x.id));
    const trByTier = new Map<string, string[]>();
    (tr.data ?? []).forEach((row: any) => {
      if (!tierIds.has(row.tier_id)) return;
      const arr = trByTier.get(row.tier_id) ?? [];
      arr.push(row.role_id);
      trByTier.set(row.tier_id, arr);
    });
    setRoles((r.data ?? []) as ApprovalRole[]);
    setMembers((m.data ?? []) as ApprovalRoleMember[]);
    setTiers(((t.data ?? []) as any[]).map((x) => ({ ...x, role_ids: trByTier.get(x.id) ?? [] })));
    setLoading(false);
  }, [offering]);

  useEffect(() => { refresh(); }, [refresh]);

  return { roles, members, tiers, loading, refresh };
}