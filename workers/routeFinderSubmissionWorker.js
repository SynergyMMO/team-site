const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const TURNSTILE_ACTION = 'route_finder_submit'

function buildCorsHeaders(origin, env) {
  const allowedOrigins = String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)

  const allowOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || '*'

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

  if (env.TURNSTILE_EXPECTED_HOSTNAME && result.hostname !== env.TURNSTILE_EXPECTED_HOSTNAME) {
    return {
      success: false,
      error: 'Captcha hostname did not match this form.',
      details: ['hostname-mismatch'],
    }
  }

  return { success: true }
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

    if (!env.TURNSTILE_SECRET_KEY) {
      return jsonResponse({ success: false, error: 'Turnstile secret is not configured.' }, 500, corsHeaders)
    }

    if (!env.FORMSUBMIT_ENDPOINT) {
      return jsonResponse({ success: false, error: 'Submission endpoint is not configured.' }, 500, corsHeaders)
    }

    try {
      const body = await request.formData()
      const token = String(body.get('cf-turnstile-response') || '')

      if (!token) {
        return jsonResponse({ success: false, error: 'Missing captcha token.' }, 400, corsHeaders)
      }

      const turnstileCheck = await verifyTurnstile(token, request, env)
      if (!turnstileCheck.success) {
        return jsonResponse(turnstileCheck, 400, corsHeaders)
      }

      const outbound = new FormData()
      outbound.append('region', String(body.get('region') || '').trim())
      outbound.append('route', String(body.get('route') || '').trim())
      outbound.append('variation', String(body.get('variation') || '').trim() || 'None provided')
      outbound.append('credit', String(body.get('credit') || '').trim())
      outbound.append('discord', String(body.get('discord') || '').trim() || 'Not provided')
      outbound.append('encounter_data', String(body.get('encounter_data') || '').trim() || 'No encounter data provided.')
      outbound.append('notes', String(body.get('notes') || '').trim() || 'No extra notes provided.')
      outbound.append('_subject', `${env.SUBMISSION_SUBJECT_PREFIX || 'Route Finder Data Submission'} - ${String(body.get('region') || '').trim()} - ${String(body.get('route') || '').trim() || 'Unknown Route'}`)
      outbound.append('_template', 'table')
      outbound.append('_captcha', 'false')

      const attachment = body.get('attachment')
      if (attachment instanceof File && attachment.size > 0) {
        outbound.append('attachment', attachment, attachment.name)
      }

      const upstreamResponse = await fetch(env.FORMSUBMIT_ENDPOINT, {
        method: 'POST',
        body: outbound,
      })

      if (!upstreamResponse.ok) {
        return jsonResponse({ success: false, error: 'Upstream form delivery failed.' }, 502, corsHeaders)
      }

      return jsonResponse({ success: true }, 200, corsHeaders)
    } catch (error) {
      return jsonResponse({ success: false, error: error.message || 'Unexpected worker error.' }, 500, corsHeaders)
    }
  },
}
