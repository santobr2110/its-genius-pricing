export type ApprovalStatus = "not_required" | "pending" | "approved" | "rejected" | "canceled";
export type DecisionStatus = "pending" | "approved" | "rejected";

export interface ApprovalRole {
  id: string;
  slug: string;
  label: string;
}

export interface ApprovalRoleMember {
  id: string;
  role_id: string;
  user_id: string;
  email: string;
  full_name: string | null;
}

export interface ApprovalTier {
  id: string;
  offering: string;
  label: string;
  min_pct: number | null;
  max_pct: number | null;
  mode: "all" | "any";
  ativo: boolean;
  sort_order: number;
  role_ids: string[];
}

export interface ApprovalDecision {
  id: string;
  request_id: string;
  role_id: string;
  approver_user_id: string;
  approver_email: string;
  decision: DecisionStatus;
  decided_at: string | null;
  comment: string | null;
}

export interface ApprovalRequest {
  id: string;
  target_type: string;
  target_id: string;
  offering: string;
  rentabilidade_pct: number;
  tier_id: string | null;
  status: ApprovalStatus;
  requester_id: string;
  summary: Record<string, unknown> | null;
  created_at: string;
  decided_at: string | null;
}

/**
 * Determines which tier applies for a given profitability. Returns null when
 * no tier applies (i.e. above all configured tiers — no approval required).
 * Tier matches when `min_pct <= rent < max_pct` (open upper bound). Null
 * `min_pct` means "no lower bound"; null `max_pct` means "no upper bound".
 */
export function pickTier(tiers: ApprovalTier[], rentPct: number): ApprovalTier | null {
  const active = tiers.filter((t) => t.ativo);
  for (const t of active.sort((a, b) => a.sort_order - b.sort_order)) {
    const minOk = t.min_pct == null || rentPct >= Number(t.min_pct);
    const maxOk = t.max_pct == null || rentPct < Number(t.max_pct);
    if (minOk && maxOk) return t;
  }
  return null;
}

export function describeStatus(s: ApprovalStatus): string {
  switch (s) {
    case "approved": return "Aprovado";
    case "pending": return "Pendente";
    case "rejected": return "Rejeitado";
    case "canceled": return "Cancelado";
    case "not_required": return "Liberado";
  }
}