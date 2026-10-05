import { describe, expect, it } from 'vitest'

import { getHealth } from './health'

const fakeFetch = (status: number, body: unknown) =>
  (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch

describe('getHealth', () => {
  it('renvoie la réponse validée', async () => {
    await expect(getHealth('http://api/', fakeFetch(200, { ok: true, db: true }))).resolves.toEqual(
      {
        ok: true,
        db: true,
      },
    )
  })

  it('accepte un 503 quand la base est indisponible', async () => {
    await expect(
      getHealth('http://api', fakeFetch(503, { ok: false, db: false })),
    ).resolves.toEqual({ ok: false, db: false })
  })

  it('rejette une réponse mal formée', async () => {
    await expect(getHealth('http://api', fakeFetch(200, { ok: 'oui' }))).rejects.toThrow()
  })
})
