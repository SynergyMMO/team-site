const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const TURNSTILE_ACTION = 'route_finder_submit'
const RESEND_SEND_EMAIL_URL = 'https://api.resend.com/emails'
const MAX_ATTACHMENTS = 10

function normalizeValue(value) {
  return String(value || '').trim()
}

function normalizeOrigin(value) {
  return normalizeValue(value).replace(/\/+$/, '')
}

function getAllowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean)
}

function getExpectedHostnames(env) {
  return String(env.TURNSTILE_EXPECTED_HOSTNAME || '')
    .split(',')
    .map(value => normalizeValue(value).toLowerCase())
    .filter(Boolean)
}

function buildCorsHeaders(origin, env) {
  const requestOrigin = normalizeOrigin(origin)
  const allowedOrigins = getAllowedOrigins(env)
  const allowOrigin = allowedOrigins.includes(requestOrigin)
    ? requestOrigin
    : allowedOrigins[0] || '*'

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  }
}

function jsonResponse(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  })
}

async function parseJsonResponse(response) {
  return response.json().catch(() => null)
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatMultilineHtml(value) {
  return escapeHtml(value).replace(/\r?\n/g, '<br />')
}

function buildEmailContent(fields) {
  const rows = [
    ['Region', fields.region || 'Unknown Region'],
    ['Route', fields.route],
    ['Variation', fields.variation || 'None provided'],
    ['Credit', fields.credit],
    ['Discord', fields.discord || 'Not provided'],
    ['Encounter data', fields.encounterData || 'No encounter data provided.'],
    ['Notes', fields.notes || 'No extra notes provided.'],
    ['Form URL', fields.formUrl],
  ]

  const htmlRows = rows.map(([label, value]) => `
    <tr>
      <th align="left" valign="top" style="padding:8px 12px;border:1px solid #d7c7a0;background:#f7f1df;">${escapeHtml(label)}</th>
      <td valign="top" style="padding:8px 12px;border:1px solid #d7c7a0;">${formatMultilineHtml(value)}</td>
    </tr>
  `).join('')

  const html = `
    <div style="font-family:Georgia, serif;color:#221b12;">
      <h1 style="margin-bottom:12px;">Route Finder submission</h1>
      <p style="margin-bottom:16px;">A new community Route Finder submission was sent from the website.</p>
      <table cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;max-width:720px;">
        <tbody>${htmlRows}</tbody>
      </table>
    </div>
  `

  const text = rows
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n\n')

  return { html, text }
}

async function fileToBase64(file) {
  const arrayBuffer = await file.arrayBuffer()
  let binary = ''
  const bytes = new Uint8Array(arrayBuffer)
  const chunkSize = 0x8000

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

async function verifyTurnstile(token, request, env) {
  const formData = new FormData()
  formData.append('secret', env.TURNSTILE_SECRET_KEY)
  formData.append('response', token)

  const remoteIp = request.headers.get('CF-Connecting-IP')
  if (remoteIp) {
    formData.append('remoteip', remoteIp)
  }

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    body: formData,
  })

  const result = await response.json()
  if (!result.success) {
    return {
      success: false,
      error: 'Captcha verification failed.',
      details: result['error-codes'] || [],
    }
  }

  if (result.action && result.action !== TURNSTILE_ACTION) {
    return {
      success: false,
      error: 'Captcha action did not match this form.',
      details: ['action-mismatch'],
    }
  }

  const expectedHostnames = getExpectedHostnames(env)
  const resultHostname = normalizeValue(result.hostname).toLowerCase()
  if (expectedHostnames.length > 0 && !expectedHostnames.includes(resultHostname)) {
    return {
      success: false,
      error: 'Captcha hostname did not match this form.',
      details: ['hostname-mismatch', resultHostname || 'missing-hostname'],
    }
  }

  return { success: true }
}

async function sendWithResend(fields, attachments, env) {
  const subjectPrefix = normalizeValue(env.SUBMISSION_SUBJECT_PREFIX) || 'Route Finder Data Submission'
  const formUrl = normalizeValue(env.SUBMISSION_FORM_URL) || 'https://synergymmo.com/route-finder/'
  const from = normalizeValue(env.RESEND_FROM_EMAIL)
  const to = normalizeValue(env.RESEND_TO_EMAIL)
  const replyTo = normalizeValue(env.RESEND_REPLY_TO_EMAIL)

  const { html, text } = buildEmailContent({
    ...fields,
    formUrl,
  })

  const payload = {
    from,
    to: [to],
    subject: `${subjectPrefix} - ${fields.region || 'Unknown Region'} - ${fields.route}`,
    html,
    text,
    tags: [
      { name: 'form', value: 'route_finder' },
      { name: 'region', value: (fields.region || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 256) },
    ],
  }

  if (replyTo) {
    payload.reply_to = [replyTo]
  }

  const validAttachments = attachments
    .filter(file => file instanceof File && file.size > 0)
    .slice(0, MAX_ATTACHMENTS)

  if (validAttachments.length > 0) {
    payload.attachments = await Promise.all(validAttachments.map(async (file) => ({
      filename: file.name || 'route-finder-upload',
      content: await fileToBase64(file),
    })))
  }

  const response = await fetch(RESEND_SEND_EMAIL_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const body = await parseJsonResponse(response)
  if (!response.ok) {
    return {
      success: false,
      error: body?.message || body?.error || 'Resend rejected the email.',
      status: response.status,
      body,
    }
  }

  return {
    success: true,
    emailId: body?.id || null,
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || ''
    const corsHeaders = buildCorsHeaders(origin, env)

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      })
    }

    if (request.method !== 'POST') {
      return jsonResponse({ success: false, error: 'Method not allowed.' }, 405, corsHeaders)
    }

    if (!origin) {
      return jsonResponse({ success: false, error: 'Missing request origin.' }, 400, corsHeaders)
    }

    if (!getAllowedOrigins(env).includes(normalizeOrigin(origin))) {
      return jsonResponse({ success: false, error: 'Origin not allowed.' }, 403, corsHeaders)
    }

    if (!env.TURNSTILE_SECRET_KEY) {
      return jsonResponse({ success: false, error: 'Turnstile secret is not configured.' }, 500, corsHeaders)
    }

    if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL || !env.RESEND_TO_EMAIL) {
      return jsonResponse({ success: false, error: 'Resend is not fully configured.' }, 500, corsHeaders)
    }

    try {
      const body = await request.formData()
      const token = normalizeValue(body.get('cf-turnstile-response'))
      const fields = {
        region: normalizeValue(body.get('region')),
        route: normalizeValue(body.get('route')),
        variation: normalizeValue(body.get('variation')),
        credit: normalizeValue(body.get('credit')),
        discord: normalizeValue(body.get('discord')),
        encounterData: normalizeValue(body.get('encounter_data')),
        notes: normalizeValue(body.get('notes')),
      }

      if (!token) {
        return jsonResponse({ success: false, error: 'Missing captcha token.' }, 400, corsHeaders)
      }

      if (!fields.route || !fields.credit) {
        return jsonResponse({ success: false, error: 'Missing required submission fields.' }, 400, corsHeaders)
      }

      const attachments = body.getAll('attachment')
      if (attachments.length > MAX_ATTACHMENTS) {
        return jsonResponse({ success: false, error: `You can upload up to ${MAX_ATTACHMENTS} screenshots per submission.` }, 400, corsHeaders)
      }

      const turnstileCheck = await verifyTurnstile(token, request, env)
      if (!turnstileCheck.success) {
        return jsonResponse(turnstileCheck, 400, corsHeaders)
      }

      const emailResult = await sendWithResend(fields, attachments, env)
      if (!emailResult.success) {
        return jsonResponse({
          success: false,
          error: emailResult.error,
          resendStatus: emailResult.status,
          resendBody: emailResult.body,
        }, 502, corsHeaders)
      }

      return jsonResponse({
        success: true,
        emailId: emailResult.emailId,
      }, 200, corsHeaders)
    } catch (error) {
      return jsonResponse({ success: false, error: error.message || 'Unexpected worker error.' }, 500, corsHeaders)
    }
  },
}
