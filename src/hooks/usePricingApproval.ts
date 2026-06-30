import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { ApprovalDecision, ApprovalRequest, ApprovalStatus } from "@/lib/approval/types";
import { pickTier } from "@/lib/approval/types";
import { useApprovalConfig } from "@/hooks/useApprovalConfig";

export interface PricingApprovalState {
  loading: boolean;
  /** Aplicável: já existe uma faixa para a rentabilidade atual */
  requiresApproval: boolean;
  effectiveStatus: ApprovalStatus;
  request: ApprovalRequest | null;
  decisions: ApprovalDecision[];
  /** Marca d'água a aplicar nos exports, ou null */
  watermark: string | null;
  /** Texto curto para badge */
  statusLabel: string;
  /** Conta n/N para pendentes */
  progress: { approved: number; total: number } | null;
  refresh: () => Promise<void>;
  requestApproval: () => Promise<{ ok: boolean; approvalLinks?: { email: string; url: string; role: string }[]; error?: string }>;
  cancel: () => Promise<void>;
}

export function usePricingApproval(opts: {
  offering: string;
  targetType: string; // 'pricing_preset' | 'cotacao'
  targetId: string | null | undefined;
  rentPct: number;
  summary?: Record<string, unknown>;
}): PricingApprovalState {
  const { offering, targetType, targetId, rentPct, summary } = opts;
  const { user } = useAuth();
  const { tiers } = useApprovalConfig(offering);
  const [request, setRequest] = useState<ApprovalRequest | null>(null);
  const [decisions, setDecisions] = useState<ApprovalDecision[]>([]);
  const [loading, setLoading] = useState(true);

  const tier = useMemo(() => pickTier(tiers, rentPct), [tiers, rentPct]);
  const requiresApproval = !!tier && (tier.role_ids?.length ?? 0) > 0;

  const refresh = useCallback(async () => {
    if (!targetId) { setRequest(null); setDecisions([]); setLoading(false); return; }
    setLoading(true);
    const { data: reqs } = await supabase
      .from("approval_requests")
      .select("*")
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .order("created_at", { ascending: false })
      .limit(1);
    const r = (reqs?.[0] ?? null) as ApprovalRequest | null;
    setRequest(r);
    if (r) {
      const { data: decs } = await supabase
        .from("approval_decisions").select("*").eq("request_id", r.id);
      setDecisions((decs ?? []) as ApprovalDecision[]);
    } else {
      setDecisions([]);
    }
    setLoading(false);
  }, [targetType, targetId]);

  useEffect(() => { refresh(); }, [refresh]);

  const requestApproval = useCallback(async () => {
    if (!user) return { ok: false, error: "Não autenticado" };
    if (!targetId) return { ok: false, error: "Salve a precificação antes de solicitar aprovação." };
    if (!requiresApproval) return { ok: false, error: "Esta rentabilidade não requer aprovação." };
    const { data, error } = await supabase.functions.invoke("request-pricing-approval", {
      body: { offering, targetType, targetId, rentPct, summary: summary ?? {} },
    });
    if (error) return { ok: false, error: error.message };
    await refresh();
    return { ok: true, approvalLinks: (data as any)?.approvalLinks ?? [] };
  }, [user, targetId, requiresApproval, offering, targetType, rentPct, summary, refresh]);

  const cancel = useCallback(async () => {
    if (!request) return;
    await supabase.from("approval_requests").update({ status: "canceled" }).eq("id", request.id);
    await refresh();
  }, [request, refresh]);

  const effectiveStatus: ApprovalStatus = !requiresApproval
    ? "not_required"
    : request?.status ?? "not_required";

  const progress = request && requiresApproval ? {
    approved: decisions.filter((d) => d.decision === "approved").length,
    total: decisions.length,
  } : null;

  const watermark =
    requiresApproval && (effectiveStatus === "pending" || effectiveStatus === "rejected" || (effectiveStatus === "not_required" && !request))
      ? (request ? "PENDENTE APROVAÇÃO" : "PENDENTE APROVAÇÃO")
      : null;
  // Quando requer aprovação e ainda não há request, exigimos solicitar; relatório sai com marca.
  // Quando aprovado, sem marca.

  const statusLabel = !requiresApproval
    ? "Liberado"
    : effectiveStatus === "approved"
    ? "Aprovado"
    : effectiveStatus === "rejected"
    ? "Rejeitado"
    : effectiveStatus === "canceled"
    ? "Cancelado"
    : request
    ? `Pendente (${progress?.approved ?? 0}/${progress?.total ?? 0})`
    : "Aprovação requerida";

  return {
    loading, requiresApproval, effectiveStatus, request, decisions,
    watermark, statusLabel, progress, refresh, requestApproval, cancel,
  };
}