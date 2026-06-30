import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

/**
 * Authenticated decision endpoint: an approver logged into the app can approve
 * or reject directly from the "Minhas Aprovações" inbox without using the
 * e-mailed token link. The decision row is matched by id and validated against
 * approver_user_id = auth.uid().
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader) return json({ error: 'missing_authorization' }, 401)

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })
    const { data: userData } = await userClient.auth.getUser()
    const user = userData?.user
    if (!user) return json({ error: 'not_authenticated' }, 401)

    const body = await req.json().catch(() => ({}))
    const decisionId: string = body?.decisionId ?? ''
    const action: 'approve' | 'reject' = body?.action
    const comment: string | null = body?.comment ?? null
    if (!decisionId) return json({ error: 'missing_decision_id' }, 400)
    if (action !== 'approve' && action !== 'reject') return json({ error: 'invalid_action' }, 400)

    const admin = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } })

    const { data: dec } = await admin
      .from('approval_decisions')
      .select('id, request_id, role_id, approver_user_id, decision')
      .eq('id', decisionId)
      .maybeSingle()
    if (!dec) return json({ error: 'decision_not_found' }, 404)
    if (dec.approver_user_id !== user.id) return json({ error: 'forbidden' }, 403)

    const { data: reqRow } = await admin
      .from('approval_requests')
      .select('id, status, tier_id')
      .eq('id', dec.request_id).maybeSingle()
    if (!reqRow) return json({ error: 'request_not_found' }, 404)
    if (reqRow.status !== 'pending') return json({ ok: true, alreadyResolved: true, requestStatus: reqRow.status })
    if (dec.decision !== 'pending') return json({ ok: true, alreadyDecided: true, decision: dec.decision })

    await admin.from('approval_decisions').update({
      decision: action === 'approve' ? 'approved' : 'rejected',
      decided_at: new Date().toISOString(),
      comment,
    }).eq('id', dec.id)

    // Recompute aggregate status (mirrors decide-pricing-approval)
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