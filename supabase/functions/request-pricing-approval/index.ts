import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function rand(len = 32): string {
  const arr = new Uint8Array(len)
  crypto.getRandomValues(arr)
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const auth = req.headers.get('Authorization')
    if (!auth) return json({ error: 'unauthorized' }, 401)

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } })
    const { data: userData, error: userErr } = await userClient.auth.getUser()
    if (userErr || !userData?.user) return json({ error: 'unauthorized' }, 401)
    const userId = userData.user.id

    const body = await req.json().catch(() => ({}))
    const { offering, targetType, targetId, rentPct, summary } = body ?? {}
    if (!offering || !targetType || !targetId || typeof rentPct !== 'number') {
      return json({ error: 'invalid_body' }, 400)
    }

    const admin = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } })

    // Pick tier for the offering and rentability
    const { data: tiersData } = await admin
      .from('approval_tiers')
      .select('id, min_pct, max_pct, mode, sort_order, ativo')
      .eq('offering', offering)
      .eq('ativo', true)
      .order('sort_order', { ascending: true })
    const tier = (tiersData ?? []).find((t: any) => {
      const minOk = t.min_pct == null || rentPct >= Number(t.min_pct)
      const maxOk = t.max_pct == null || rentPct < Number(t.max_pct)
      return minOk && maxOk
    }) as any
    if (!tier) return json({ ok: true, requiresApproval: false })

    // Get role members for this tier
    const { data: roleRows } = await admin
      .from('approval_tier_roles').select('role_id').eq('tier_id', tier.id)
    const roleIds = (roleRows ?? []).map((r: any) => r.role_id)
    if (roleIds.length === 0) return json({ ok: true, requiresApproval: false })
    const { data: members } = await admin
      .from('approval_role_members').select('id, role_id, user_id, email, full_name')
      .in('role_id', roleIds)
    if (!members || members.length === 0) {
      return json({ error: 'no_approvers_configured' }, 400)
    }

    // Cancel any prior pending request for the same target
    await admin.from('approval_requests')
      .update({ status: 'canceled' })
      .eq('target_type', targetType).eq('target_id', targetId).eq('status', 'pending')

    // Create request
    const { data: created, error: insErr } = await admin
      .from('approval_requests')
      .insert({
        offering, target_type: targetType, target_id: targetId,
        rentabilidade_pct: rentPct, tier_id: tier.id, status: 'pending',
        requester_id: userId, summary: summary ?? {},
      })
      .select('id').single()
    if (insErr || !created) return json({ error: insErr?.message ?? 'insert_failed' }, 500)
    const requestId = created.id

    // One decision per (request, role, approver). If a role has multiple members, all become eligible (any of them can decide for that role).
    const tokens: { email: string; url: string; role: string; full_name: string | null }[] = []
    const origin = req.headers.get('origin') ?? ''
    const decisionsToInsert: any[] = []
    const roleLabels = new Map<string, string>()
    {
      const { data: roles } = await admin.from('approval_roles').select('id, label').in('id', roleIds)
      ;(roles ?? []).forEach((r: any) => roleLabels.set(r.id, r.label))
    }
    for (const m of members as any[]) {
      const token = rand(32)
      const token_hash = await sha256Hex(token)
      decisionsToInsert.push({
        request_id: requestId, role_id: m.role_id, approver_user_id: m.user_id,
        approver_email: m.email, token_hash, decision: 'pending',
      })
      tokens.push({
        email: m.email,
        full_name: m.full_name,
        role: roleLabels.get(m.role_id) ?? 'Aprovador',
        url: `${origin}/aprovacao/${token}`,
      })
    }
    const { error: decErr } = await admin.from('approval_decisions').insert(decisionsToInsert)
    if (decErr) return json({ error: decErr.message }, 500)

    // Best-effort email send via send-transactional-email (no-op if not deployed)
    let emailSent = false
    try {
      const senderRes = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE}` },
        body: JSON.stringify({
          template: 'pricing-approval-request',
          batch: tokens.map((t) => ({
            to: t.email,
            data: { approverName: t.full_name ?? '', role: t.role, url: t.url, summary: summary ?? {} },
          })),
        }),
      })
      emailSent = senderRes.ok
    } catch {
      emailSent = false
    }

    return json({ ok: true, requestId, approvalLinks: tokens, emailSent })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}