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

    // Send approval emails via Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const FROM = 'Smart ITO <noreply@notify.selbetti.com.br>'
    let emailSent = false
    const emailErrors: string[] = []
    if (RESEND_API_KEY) {
      const results = await Promise.all(tokens.map(async (t) => {
        try {
          const html = renderApprovalEmail({
            approverName: t.full_name ?? '',
            role: t.role,
            url: t.url,
            offering,
            rentPct,
            summary: summary ?? {},
          })
          const r = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: FROM,
              to: [t.email],
              subject: `Aprovação de precificação — ${offering} (${rentPct.toFixed(2)}%)`,
              html,
            }),
          })
          if (!r.ok) {
            const txt = await r.text().catch(() => '')
            emailErrors.push(`${t.email}: ${r.status} ${txt}`)
            return false
          }
          return true
        } catch (e) {
          emailErrors.push(`${t.email}: ${(e as Error).message}`)
          return false
        }
      }))
      emailSent = results.some(Boolean)
    } else {
      emailErrors.push('RESEND_API_KEY not configured')
    }

    return json({ ok: true, requestId, approvalLinks: tokens, emailSent, emailErrors })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c] as string))
}

function fmtBRL(n: unknown): string {
  const v = Number(n)
  if (!Number.isFinite(v)) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function renderApprovalEmail(p: {
  approverName: string; role: string; url: string; offering: string; rentPct: number; summary: any
}): string {
  const s = p.summary ?? {}
  const rows: [string, string][] = []
  if (s.cliente) rows.push(['Cliente', esc(s.cliente)])
  if (s.numero_cotacao) rows.push(['Nº da Cotação', esc(s.numero_cotacao)])
  if (s.preco_mensal != null) rows.push(['Preço mensal', esc(fmtBRL(s.preco_mensal))])
  if (s.rentabilidade_valor != null) rows.push(['Rentabilidade líquida', esc(fmtBRL(s.rentabilidade_valor))])
  rows.push(['Rentabilidade', `${p.rentPct.toFixed(2)}%`])
  const tableRows = rows.map(([k, v]) =>
    `<tr><td style="padding:6px 10px;color:#64748b;font-size:13px">${k}</td><td style="padding:6px 10px;font-size:13px;color:#0f172a"><strong>${v}</strong></td></tr>`
  ).join('')
  return `<!doctype html><html><body style="font-family:Helvetica,Arial,sans-serif;background:#ffffff;margin:0;padding:24px;color:#0f172a">
    <div style="max-width:560px;margin:0 auto">
      <h2 style="margin:0 0 8px">Aprovação de precificação</h2>
      <p style="margin:0 0 16px;color:#475569">Olá${p.approverName ? ' ' + esc(p.approverName) : ''}, você foi indicado como <strong>${esc(p.role)}</strong> para aprovar a seguinte precificação (${esc(p.offering)}).</p>
      <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:8px;margin:0 0 20px">${tableRows}</table>
      <p style="margin:0 0 20px"><a href="${esc(p.url)}" style="display:inline-block;background:#0f172a;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-size:14px">Abrir para revisar e decidir</a></p>
      <p style="margin:0;color:#94a3b8;font-size:12px">Ou copie o link: ${esc(p.url)}</p>
    </div></body></html>`
}