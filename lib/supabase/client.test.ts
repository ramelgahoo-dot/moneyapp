import { describe, expect, it } from 'vitest'
import { createClient } from './client'

describe('createClient', () => {
  it('returns a safe client on the server without crashing', () => {
    const client = createClient()

    expect(client).toBeDefined()
    expect(typeof client.from).toBe('function')
  })
})
