import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    let token = ''
    let action: 'approve' | 'reject' | 'info' = 'info'
    let comment: string | null = null
    if (req.method === 'GET') {
      const u = new URL(req.url)
      token = u.searchParams.get('token') ?? ''
      action = (u.searchParams.get('action') as any) ?? 'info'
    } else {
      const body = await req.json().catch(() => ({}))
      token = body?.token ?? ''
      action = body?.action ?? 'info'
      comment = body?.comment ?? null
    }
    if (!token) return json({ error: 'missing_token' }, 400)
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } })

    const token_hash = await sha256Hex(token)
    const { data: dec } = await admin
      .from('approval_decisions')
      .select('id, request_id, role_id, approver_email, decision, comment, decided_at')
      .eq('token_hash', token_hash)
      .maybeSingle()
    if (!dec) return json({ error: 'invalid_token' }, 404)

    const { data: reqRow } = await admin
      .from('approval_requests')
      .select('id, status, offering, target_type, target_id, rentabilidade_pct, requester_id, tier_id, summary')
      .eq('id', dec.request_id).maybeSingle()
    if (!reqRow) return json({ error: 'request_not_found' }, 404)

    if (action === 'info') {
      return json({ ok: true, decision: dec, request: reqRow })
    }
    if (reqRow.status !== 'pending') {
      return json({ ok: true, alreadyResolved: true, requestStatus: reqRow.status, decision: dec.decision })
    }
    if (dec.decision !== 'pending') {
      return json({ ok: true, alreadyDecided: true, decision: dec.decision })
    }
    if (action !== 'approve' && action !== 'reject') return json({ error: 'invalid_action' }, 400)

    await admin.from('approval_decisions').update({
      decision: action === 'approve' ? 'approved' : 'rejected',
      decided_at: new Date().toISOString(),
      comment,
    }).eq('id', dec.id)

    // Recompute aggregate status
    const { data: tier } = await admin.from('approval_tiers').select('mode').eq('id', reqRow.tier_id).maybeSingle()
    const mode = (tier?.mode ?? 'all') as 'all' | 'any'
    const { data: allDec } = await admin.from('approval_decisions').select('decision, role_id').eq('request_id', reqRow.id)
    const decisions = allDec ?? []
    let newStatus: 'pending' | 'approved' | 'rejected' = 'pending'
    if (decisions.some((d: any) => d.decision === 'rejected')) {
      newStatus = 'rejected'
    } else if (mode === 'any') {
      if (decisions.some((d: any) => d.decision === 'approved')) newStatus = 'approved'
    } else {
      // 'all': every required role must have at least one approved decision
      const { data: tierRoles } = await admin.from('approval_tier_roles').select('role_id').eq('tier_id', reqRow.tier_id)
      const requiredRoles = new Set((tierRoles ?? []).map((r: any) => r.role_id))
      const approvedRoles = new Set(decisions.filter((d: any) => d.decision === 'approved').map((d: any) => d.role_id))
      const allApproved = [...requiredRoles].every((r) => approvedRoles.has(r))
      if (allApproved && requiredRoles.size > 0) newStatus = 'approved'
    }
    if (newStatus !== 'pending') {
      await admin.from('approval_requests')
        .update({ status: newStatus, decided_at: new Date().toISOString() })
        .eq('id', reqRow.id)
    }
    return json({ ok: true, newStatus, requestId: reqRow.id })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})