import { describe, expect, it, vi } from 'vitest'

import { creerCacheUrls } from './cacheUrls'

describe('cache des URL signées', () => {
  it('une seule demande tant que l’URL est valide, deux appels simultanés compris', async () => {
    const t0 = Date.parse('2026-10-07T08:00:00Z')
    const charger = vi.fn(async (id: string) => ({
      url: `https://stockage/${id}?v=${charger.mock.calls.length}`,
      expire: new Date(t0 + 5 * 60_000).toISOString(),
    }))
    const cache = creerCacheUrls(charger)
    const [a, b] = await Promise.all([cache.url('photo', t0), cache.url('photo', t0)])
    expect(a).toBe(b)
    expect(await cache.url('photo', t0 + 4 * 60_000)).toBe(a)
    expect(charger).toHaveBeenCalledTimes(1)
    expect(cache.immediate('photo', t0 + 60_000)).toBe(a)
  })

  it('redemande une URL qui expire dans moins de 30 s', async () => {
    const t0 = Date.parse('2026-10-07T08:00:00Z')
    let n = 0
    const cache = creerCacheUrls(async () => ({
      url: `u${++n}`,
      expire: new Date(t0 + 60_000).toISOString(),
    }))
    expect(await cache.url('vocal', t0)).toBe('u1')
    expect(cache.immediate('vocal', t0 + 45_000)).toBeNull()
    expect(await cache.url('vocal', t0 + 45_000)).toBe('u2')
  })
})
