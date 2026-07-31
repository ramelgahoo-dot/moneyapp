#!/usr/bin/env node

import process from 'node:process'

function parseArgs(argv) {
  const args = new Map()

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i]
    if (!token.startsWith('--')) continue

    const key = token.slice(2)
    const next = argv[i + 1]
    const value = next && !next.startsWith('--') ? next : 'true'
    args.set(key, value)
  }

  return args
}

function normalizeBaseUrl(raw) {
  const value = String(raw || '').trim().replace(/\/$/, '')
  if (!value) {
    throw new Error('Missing deployment URL. Pass --url or set TARGET_URL.')
  }

  const parsed = new URL(value)
  return parsed.toString().replace(/\/$/, '')
}

async function request(path, baseUrl, timeoutMs) {
  const url = `${baseUrl}${path}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const started = Date.now()

  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'cache-control': 'no-cache',
      },
    })

    const latencyMs = Date.now() - started
    clearTimeout(timer)

    return {
      ok: true,
      url,
      status: res.status,
      latencyMs,
      contentType: res.headers.get('content-type') || '',
    }
  } catch (error) {
    clearTimeout(timer)
    return {
      ok: false,
      url,
      status: 0,
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : 'Unknown request error',
      contentType: '',
    }
  }
}

function isStatusAllowed(actual, allowed) {
  return allowed.includes(actual)
}

async function main() {
  const args = parseArgs(process.argv)
  const timeoutMs = Number(args.get('timeout') || process.env.SMOKE_TIMEOUT_MS || 15000)
  const baseUrl = normalizeBaseUrl(args.get('url') || process.env.TARGET_URL)

  const checks = [
    { path: '/login', allowedStatuses: [200] },
    { path: '/dashboard', allowedStatuses: [200, 302, 303, 307, 308] },
    { path: '/api/health', allowedStatuses: [200] },
    { path: '/api/billing/status', allowedStatuses: [200, 401] },
  ]

  const failures = []

  console.log(`[smoke] target: ${baseUrl}`)
  console.log(`[smoke] timeout: ${timeoutMs}ms`)

  for (const check of checks) {
    const result = await request(check.path, baseUrl, timeoutMs)

    if (!result.ok) {
      failures.push(`${check.path} request failed: ${result.error || 'unknown error'}`)
      console.log(`[smoke] FAIL ${check.path} network error in ${result.latencyMs}ms`)
      continue
    }

    const statusOk = isStatusAllowed(result.status, check.allowedStatuses)
    if (!statusOk) {
      failures.push(
        `${check.path} returned ${result.status}, expected one of: ${check.allowedStatuses.join(', ')}`
      )
      console.log(`[smoke] FAIL ${check.path} -> ${result.status} in ${result.latencyMs}ms`)
      continue
    }

    if (check.path === '/api/health' && !result.contentType.toLowerCase().includes('application/json')) {
      failures.push('/api/health did not return JSON content type')
      console.log(`[smoke] FAIL /api/health content-type ${result.contentType || 'missing'}`)
      continue
    }

    console.log(`[smoke] PASS ${check.path} -> ${result.status} in ${result.latencyMs}ms`)
  }

  if (failures.length > 0) {
    console.error('\n[smoke] Deployment smoke test failed:')
    for (const failure of failures) {
      console.error(`- ${failure}`)
    }
    process.exit(1)
  }

  console.log('\n[smoke] Deployment smoke test passed')
}

main().catch((error) => {
  console.error(`[smoke] Fatal error: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
