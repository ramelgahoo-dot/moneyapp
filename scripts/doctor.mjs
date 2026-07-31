#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const requiredEnv = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_APP_URL',
]

const optionalGroups = [
  {
    name: 'Plaid banking',
    vars: ['PLAID_CLIENT_ID', 'PLAID_SECRET', 'PLAID_ENV'],
  },
]

function fail(message) {
  console.error(`\n[doctor] ${message}`)
  process.exit(1)
}

function warn(message) {
  console.warn(`[doctor] warning: ${message}`)
}

function info(message) {
  console.log(`[doctor] ${message}`)
}

function loadEnvFile(fileName) {
  const filePath = path.resolve(process.cwd(), fileName)
  if (!fs.existsSync(filePath)) return

  const raw = fs.readFileSync(filePath, 'utf8')
  const lines = raw.split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const eqIdx = trimmed.indexOf('=')
    if (eqIdx <= 0) continue

    const key = trimmed.slice(0, eqIdx).trim()
    let value = trimmed.slice(eqIdx + 1).trim()

    const hasDoubleQuotes = value.startsWith('"') && value.endsWith('"')
    const hasSingleQuotes = value.startsWith("'") && value.endsWith("'")
    if ((hasDoubleQuotes || hasSingleQuotes) && value.length >= 2) {
      value = value.slice(1, -1)
    }

    if (!(key in process.env)) {
      process.env[key] = value
    }
  }
}

function assertNodeVersion() {
  const [major, minor] = process.versions.node.split('.').map(Number)
  if (major < 20 || (major === 20 && minor < 10)) {
    fail(`Node ${process.versions.node} detected. Use Node 20.10+ (recommended: Node 22 LTS).`)
  }
}

function assertPackageLockExists() {
  const lockPath = path.resolve(process.cwd(), 'package-lock.json')
  if (!fs.existsSync(lockPath)) {
    warn('package-lock.json not found. Run npm install to ensure deterministic installs.')
  }
}

function assertRequiredEnv() {
  const missing = requiredEnv.filter((key) => !process.env[key]?.trim())
  if (missing.length) {
    fail(
      `Missing required env var(s): ${missing.join(', ')}. ` +
      'Copy .env.example to .env.local and fill all required values.'
    )
  }
}

function assertUrlLikeEnv() {
  const urlKeys = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_APP_URL']

  for (const key of urlKeys) {
    const value = process.env[key]
    if (!value) continue
    try {
      new URL(value)
    } catch {
      fail(`${key} is not a valid URL: ${value}`)
    }
  }
}

function reportOptionalEnv() {
  for (const group of optionalGroups) {
    const missing = group.vars.filter((key) => !process.env[key]?.trim())

    if (missing.length === group.vars.length) {
      warn(`${group.name} is not configured (${missing.join(', ')} missing). Related features will be unavailable.`)
      continue
    }

    if (missing.length > 0) {
      fail(
        `${group.name} is partially configured. Missing: ${missing.join(', ')}. ` +
        'Set all vars in that group or clear all of them.'
      )
    }
  }
}

function main() {
  loadEnvFile('.env.local')
  loadEnvFile('.env')
  assertNodeVersion()
  assertPackageLockExists()
  assertRequiredEnv()
  assertUrlLikeEnv()
  reportOptionalEnv()
  info('environment looks good')
}

main()
