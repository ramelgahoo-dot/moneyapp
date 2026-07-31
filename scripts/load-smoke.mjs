#!/usr/bin/env node

const args = new Map()
for (let i = 2; i < process.argv.length; i += 1) {
  const token = process.argv[i]
  if (!token.startsWith('--')) continue
  const key = token.slice(2)
  const value = process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : 'true'
  args.set(key, value)
}

const baseUrl = (args.get('url') || process.env.TARGET_URL || 'https://moneyapp-snowy.vercel.app').replace(/\/$/, '')
const users = Number(args.get('users') || process.env.LOAD_USERS || 8)
const rounds = Number(args.get('rounds') || process.env.LOAD_ROUNDS || 8)
const timeoutMs = Number(args.get('timeout') || process.env.LOAD_TIMEOUT_MS || 12000)

if (!Number.isFinite(users) || users <= 0 || !Number.isFinite(rounds) || rounds <= 0) {
  console.error('Invalid users/rounds values')
  process.exit(1)
}

const paths = [
  '/',
  '/dashboard',
  '/cars',
  '/income',
  '/expenses',
  '/investments',
  '/reports',
  '/api/health',
]

const samples = []
let failures = 0
let total = 0

function percentile(sorted, p) {
  if (sorted.length === 0) return 0
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[idx]
}

async function hit(url) {
  const start = Date.now()
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    const ms = Date.now() - start
    clearTimeout(t)
    return { ok: res.ok, status: res.status, ms }
  } catch {
    const ms = Date.now() - start
    clearTimeout(t)
    return { ok: false, status: 0, ms }
  }
}

async function runWorker(workerId) {
  for (let i = 0; i < rounds; i += 1) {
    const path = paths[(workerId + i) % paths.length]
    const result = await hit(`${baseUrl}${path}`)
    total += 1
    samples.push(result.ms)
    if (!result.ok) failures += 1
  }
}

console.log(`Running load smoke test against ${baseUrl}`)
console.log(`Workers: ${users} | Rounds per worker: ${rounds} | Total requests: ${users * rounds}`)

const startedAt = Date.now()
await Promise.all(Array.from({ length: users }, (_, i) => runWorker(i)))
const duration = (Date.now() - startedAt) / 1000

samples.sort((a, b) => a - b)
const avg = samples.reduce((s, n) => s + n, 0) / (samples.length || 1)
const p50 = percentile(samples, 50)
const p95 = percentile(samples, 95)
const p99 = percentile(samples, 99)
const max = samples[samples.length - 1] || 0
const rps = total / (duration || 1)
const errorRate = total > 0 ? (failures / total) * 100 : 0

console.log('--- Results ---')
console.log(`Duration: ${duration.toFixed(2)}s`)
console.log(`Throughput: ${rps.toFixed(2)} req/s`)
console.log(`Avg: ${avg.toFixed(1)}ms | p50: ${p50}ms | p95: ${p95}ms | p99: ${p99}ms | max: ${max}ms`)
console.log(`Failures: ${failures}/${total} (${errorRate.toFixed(2)}%)`)

if (errorRate > 2 || p95 > 2500) {
  console.log('Status: ATTENTION (investigate performance/reliability before scaling)')
  process.exitCode = 2
} else {
  console.log('Status: PASS (healthy for current load profile)')
}
