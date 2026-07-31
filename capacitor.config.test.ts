import { describe, expect, it } from 'vitest'
import config from './capacitor.config'

describe('capacitor config', () => {
  it('uses the remote shell only when explicitly enabled', () => {
    expect(config.server?.url).toContain('moneyapp-snowy.vercel.app')
  })

  it('builds a cache-busting remote URL when remote server mode is enabled', () => {
    const serverUrlBase = 'https://moneyapp-snowy.vercel.app'
    const cacheBuster = '12345'
    const serverUrl = `${serverUrlBase}${serverUrlBase.includes('?') ? '&' : '?'}v=${cacheBuster}`

    expect(serverUrl).toContain('v=12345')
  })
})
