const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const TURNSTILE_ACTION = 'route_finder_submit'
const RESEND_SEND_EMAIL_URL = 'https://api.resend.com/emails'
const ENCOUNTER_PERCENTS_KEY = 'encounter_percents'
const MAX_ATTACHMENTS = 3
const MAX_TOTAL_ATTACHMENT_BYTES = 5 * 1024 * 1024
const DEFAULT_SHORT_WINDOW_LIMIT = 1
const DEFAULT_SHORT_WINDOW_SECONDS = 10 * 60
const DEFAULT_DAILY_LIMIT = 5
const DEFAULT_DAILY_WINDOW_SECONDS = 24 * 60 * 60
const REGION_NAMES = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova']

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
  const allowOrigin = requestOrigin && allowedOrigins.includes(requestOrigin)
    ? requestOrigin
    : allowedOrigins[0] || '*'

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Encounter-Editor-Token',
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

function getEnvInt(env, key, fallback) {
  const value = Number.parseInt(normalizeValue(env[key]), 10)
  return Number.isFinite(value) && value > 0 ? value : fallback
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

function getAttachmentStats(attachments) {
  const validAttachments = attachments.filter(file => file instanceof File && file.size > 0)
  const totalBytes = validAttachments.reduce((sum, file) => sum + file.size, 0)
  return { validAttachments, totalBytes }
}

function getCurrentUnixSeconds() {
  return Math.floor(Date.now() / 1000)
}

async function incrementRateBucket(kv, key, windowSeconds, limit, nowSeconds) {
  const existing = await kv.get(key, 'json').catch(() => null)
  const activeEntry = existing && Number(existing.resetAt) > nowSeconds
    ? existing
    : { count: 0, resetAt: nowSeconds + windowSeconds }

  const nextEntry = {
    count: Number(activeEntry.count || 0) + 1,
    resetAt: Number(activeEntry.resetAt || (nowSeconds + windowSeconds)),
  }

  await kv.put(key, JSON.stringify(nextEntry), {
    expirationTtl: Math.max(1, nextEntry.resetAt - nowSeconds),
  })

  return {
    allowed: nextEntry.count <= limit,
    count: nextEntry.count,
    remaining: Math.max(0, limit - nextEntry.count),
    resetAt: nextEntry.resetAt,
  }
}

async function enforceRateLimit(request, env) {
  if (!env.RATE_LIMIT_KV) {
    return {
      success: false,
      status: 500,
      error: 'Rate limiting is not configured.',
    }
  }

  const ip = normalizeValue(request.headers.get('CF-Connecting-IP'))
  if (!ip) {
    return {
      success: false,
      status: 400,
      error: 'Missing client IP address.',
    }
  }

  const nowSeconds = getCurrentUnixSeconds()
  const shortWindowLimit = getEnvInt(env, 'RATE_LIMIT_SHORT_WINDOW_MAX', DEFAULT_SHORT_WINDOW_LIMIT)
  const shortWindowSeconds = getEnvInt(env, 'RATE_LIMIT_SHORT_WINDOW_SECONDS', DEFAULT_SHORT_WINDOW_SECONDS)
  const dailyLimit = getEnvInt(env, 'RATE_LIMIT_DAILY_MAX', DEFAULT_DAILY_LIMIT)
  const dailyWindowSeconds = getEnvInt(env, 'RATE_LIMIT_DAILY_WINDOW_SECONDS', DEFAULT_DAILY_WINDOW_SECONDS)
  const shortWindowKey = `rate:${ip}:short`
  const dailyBucketDate = new Date().toISOString().slice(0, 10)
  const dailyKey = `rate:${ip}:day:${dailyBucketDate}`

  const shortWindow = await incrementRateBucket(
    env.RATE_LIMIT_KV,
    shortWindowKey,
    shortWindowSeconds,
    shortWindowLimit,
    nowSeconds,
  )

  if (!shortWindow.allowed) {
    const shortWindowMinutes = Math.max(1, Math.ceil(shortWindowSeconds / 60))
    return {
      success: false,
      status: 429,
      error: `This IP can only send ${shortWindowLimit} submission(s) every ${shortWindowMinutes} minute(s). Please wait ${Math.max(1, Math.ceil((shortWindow.resetAt - nowSeconds) / 60))} minute(s) and try again.`,
    }
  }

  const dailyWindow = await incrementRateBucket(
    env.RATE_LIMIT_KV,
    dailyKey,
    dailyWindowSeconds,
    dailyLimit,
    nowSeconds,
  )

  if (!dailyWindow.allowed) {
    return {
      success: false,
      status: 429,
      error: `This IP has reached the daily submission limit of ${dailyLimit}. Please try again tomorrow.`,
    }
  }

  return { success: true }
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

  const { validAttachments } = getAttachmentStats(attachments)
  const limitedAttachments = validAttachments.slice(0, MAX_ATTACHMENTS)

  if (limitedAttachments.length > 0) {
    payload.attachments = await Promise.all(limitedAttachments.map(async (file) => ({
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

function ensureEncounterRegions(data) {
  const nextData = data && typeof data === 'object' && !Array.isArray(data) ? data : {}

  REGION_NAMES.forEach((region) => {
    if (!nextData[region] || typeof nextData[region] !== 'object' || Array.isArray(nextData[region])) {
      nextData[region] = {}
    }
  })

  return nextData
}

async function loadEncounterPercents(env) {
  if (!env.synergy_showcase) {
    throw new Error('synergy_showcase binding is not configured.')
  }

  const stored = await env.synergy_showcase.get(ENCOUNTER_PERCENTS_KEY, 'json')
  return ensureEncounterRegions(stored)
}

async function saveEncounterPercents(env, data) {
  if (!env.synergy_showcase) {
    throw new Error('synergy_showcase binding is not configured.')
  }

  const normalized = ensureEncounterRegions(data)
  await env.synergy_showcase.put(ENCOUNTER_PERCENTS_KEY, JSON.stringify(normalized))
  return normalized
}

function validateRegion(region) {
  if (!REGION_NAMES.includes(region)) {
    throw new Error(`Unknown region: ${region}`)
  }
}

function routeDisplayName(routeKey, entry = {}) {
  return String(entry.route || routeKey || '').trim()
}

function normalizeVariation(value) {
  return String(value || '').trim().toLowerCase()
}

function routeKeyBase(name, variation) {
  const cleanName = String(name || '').trim()
  const cleanVariation = String(variation || '').trim()
  return cleanVariation ? `${cleanName} - ${cleanVariation}` : cleanName
}

function findRouteVariant(regionData, name, variation, ignoreKey = null) {
  const targetName = String(name || '').trim().toLowerCase()
  const targetVariation = normalizeVariation(variation)

  return Object.entries(regionData).find(([key, entry]) => {
    if (key === ignoreKey) return false
    return routeDisplayName(key, entry).toLowerCase() === targetName
      && normalizeVariation(entry?.variation) === targetVariation
  })
}

function uniqueRouteKey(regionData, name, variation, ignoreKey = null) {
  const existingVariant = findRouteVariant(regionData, name, variation, ignoreKey)
  if (existingVariant) {
    throw new Error('A route with that variation already exists')
  }

  const preferredKey = routeKeyBase(name, variation)
  if (!regionData[preferredKey] || preferredKey === ignoreKey) return preferredKey

  let index = 2
  let nextKey = `${preferredKey} (${index})`
  while (regionData[nextKey] && nextKey !== ignoreKey) {
    index += 1
    nextKey = `${preferredKey} (${index})`
  }
  return nextKey
}

function normalizeEncounterRoute(body, routeName = '') {
  const data = Array.isArray(body?.data)
    ? body.data
        .map((entry) => ({
          pokemon: String(entry?.pokemon || '').trim(),
          encounters: Math.max(0, Math.trunc(Number(entry?.encounters) || 0)),
        }))
        .filter((entry) => entry.pokemon)
    : []
  const total = data.reduce((sum, entry) => sum + entry.encounters, 0)

  return {
    route: String(body?.route || routeName || '').trim(),
    credit: String(body?.credit || '').trim(),
    variation: String(body?.variation || '').trim(),
    total,
    data,
  }
}

function getEditorToken(request) {
  const bearer = normalizeValue(request.headers.get('Authorization'))
  if (bearer.toLowerCase().startsWith('bearer ')) {
    return bearer.slice(7).trim()
  }

  return normalizeValue(request.headers.get('X-Encounter-Editor-Token'))
}

function isAllowedOrigin(origin, env) {
  if (!origin) return true
  return getAllowedOrigins(env).includes(normalizeOrigin(origin))
}

function ensureEditorAuthorized(request, env) {
  const expectedToken = normalizeValue(env.ENCOUNTER_EDITOR_TOKEN)
  if (!expectedToken) {
    throw new Error('Encounter editor token is not configured.')
  }

  if (getEditorToken(request) !== expectedToken) {
    const error = new Error('Unauthorized.')
    error.status = 401
    throw error
  }
}

async function handleEncounterPercentsRequest(request, env, corsHeaders, pathname) {
  const segments = pathname.split('/').filter(Boolean)

  if (request.method === 'GET' && segments.length === 1) {
    const data = await loadEncounterPercents(env)
    return jsonResponse(data, 200, corsHeaders)
  }

  if (request.method === 'PUT' && segments.length === 1) {
    ensureEditorAuthorized(request, env)
    const body = await request.json().catch(() => null)
    const data = await saveEncounterPercents(env, body?.data || body || {})
    return jsonResponse({ success: true, data }, 200, corsHeaders)
  }

  if (segments[1] !== 'regions') {
    return jsonResponse({ success: false, error: 'Encounter percents route not found.' }, 404, corsHeaders)
  }

  ensureEditorAuthorized(request, env)

  const region = decodeURIComponent(segments[2] || '')
  validateRegion(region)

  if (segments[3] !== 'routes') {
    return jsonResponse({ success: false, error: 'Encounter percents route not found.' }, 404, corsHeaders)
  }

  const data = await loadEncounterPercents(env)
  const regionData = data[region]

  if (request.method === 'POST' && segments.length === 4) {
    const body = await request.json().catch(() => null)
    const name = String(body?.name || '').trim()
    const variation = String(body?.variation || '').trim()
    if (!name) {
      return jsonResponse({ success: false, error: 'Route name is required' }, 400, corsHeaders)
    }

    const routeKey = uniqueRouteKey(regionData, name, variation)
    regionData[routeKey] = normalizeEncounterRoute({
      route: name,
      credit: body?.credit || '',
      variation,
      data: body?.data || [],
    }, name)
    await saveEncounterPercents(env, data)
    return jsonResponse({ success: true, route: routeKey, entry: regionData[routeKey] }, 200, corsHeaders)
  }

  const routeName = decodeURIComponent(segments[4] || '')
  if (!routeName || !regionData[routeName]) {
    return jsonResponse({ success: false, error: 'Route not found' }, 404, corsHeaders)
  }

  if (request.method === 'PUT' && segments.length === 5) {
    const body = await request.json().catch(() => null)
    regionData[routeName] = normalizeEncounterRoute(body, routeDisplayName(routeName, regionData[routeName]))
    await saveEncounterPercents(env, data)
    return jsonResponse({ success: true, route: routeName, entry: regionData[routeName] }, 200, corsHeaders)
  }

  if (request.method === 'PUT' && segments[5] === 'rename') {
    const body = await request.json().catch(() => null)
    const nextName = String(body?.name || '').trim()
    const nextVariation = String(body?.variation ?? '').trim()
    if (!nextName) {
      return jsonResponse({ success: false, error: 'Route name is required' }, 400, corsHeaders)
    }

    const entry = {
      ...regionData[routeName],
      route: nextName,
      variation: nextVariation,
    }
    const nextKey = uniqueRouteKey(regionData, nextName, nextVariation, routeName)
    delete regionData[routeName]
    regionData[nextKey] = entry
    await saveEncounterPercents(env, data)
    return jsonResponse({ success: true, route: nextKey, entry }, 200, corsHeaders)
  }

  if (request.method === 'DELETE' && segments.length === 5) {
    delete regionData[routeName]
    await saveEncounterPercents(env, data)
    return jsonResponse({ success: true }, 200, corsHeaders)
  }

  return jsonResponse({ success: false, error: 'Method not allowed.' }, 405, corsHeaders)
}

async function handleSubmissionRequest(request, env, corsHeaders, origin) {
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

  const rateLimitCheck = await enforceRateLimit(request, env)
  if (!rateLimitCheck.success) {
    return jsonResponse({ success: false, error: rateLimitCheck.error }, rateLimitCheck.status, corsHeaders)
  }

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

  const { totalBytes } = getAttachmentStats(attachments)
  if (totalBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
    return jsonResponse({
      success: false,
      error: 'The total screenshot upload size must be 5 MB or less.',
    }, 400, corsHeaders)
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

    if (!isAllowedOrigin(origin, env)) {
      return jsonResponse({ success: false, error: 'Origin not allowed.' }, 403, corsHeaders)
    }

    try {
      const pathname = new URL(request.url).pathname.replace(/\/+$/, '') || '/'

      if (pathname === '/encounter-percents' || pathname.startsWith('/encounter-percents/')) {
        return await handleEncounterPercentsRequest(request, env, corsHeaders, pathname)
      }

      return await handleSubmissionRequest(request, env, corsHeaders, origin)
    } catch (error) {
      return jsonResponse(
        { success: false, error: error.message || 'Unexpected worker error.' },
        error.status || 500,
        corsHeaders,
      )
    }
  },
}
