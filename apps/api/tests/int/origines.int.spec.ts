import type { Payload, PayloadRequest } from 'payload'
import { headersWithCors } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { lireOrigines, origineAutorisee, OriginesAutorisees } from '@/lib/origines'

import { demarrer } from './helpers'

const MOTIFS = ['https://billetsdoux.app', 'https://*.billets-doux.pages.dev']

describe('origines autorisées (CORS)', () => {
  it('reconnaît les origines exactes et les préversions, rien d’autre', () => {
    const ok = (o: string) => origineAutorisee(MOTIFS, o)
    expect(ok('https://billetsdoux.app')).toBe(true)
    expect(ok('https://3f2a9c1b.billets-doux.pages.dev')).toBe(true)
    expect(ok('https://etape-9-mise-en-ligne.billets-doux.pages.dev')).toBe(true)
    expect(ok('https://billets-doux.pages.dev')).toBe(false)
    expect(ok('https://pirate.pages.dev')).toBe(false)
    expect(ok('https://x.billets-doux.pages.dev.pirate.com')).toBe(false)
    expect(ok('http://x.billets-doux.pages.dev')).toBe(false)
    expect(ok('https://www.billetsdoux.app')).toBe(false)
    expect(origineAutorisee(MOTIFS, null)).toBe(false)
  })

  it('CSRF : seulement les origines exactes', () => {
    expect(lireOrigines(MOTIFS.join(', ')).csrf).toEqual(['https://billetsdoux.app'])
  })
})

describe('CORS de Payload avec un motif', () => {
  let payload: Payload
  beforeAll(async () => {
    payload = await demarrer()
  })
  afterAll(async () => {
    await payload.destroy()
  })

  /** Les en-têtes que Payload pose pour une requête venant de `origine`. */
  const entetes = (origine: string) => {
    const req = { payload, headers: new Headers({ Origin: origine }) } as unknown as PayloadRequest
    return headersWithCors({ headers: new Headers(), req })
  }

  it('Payload autorise une préversion par le motif, et refuse une origine inconnue', () => {
    // On remplace la liste lue dans le .env de dev par les origines de production.
    const avant = payload.config.cors
    payload.config.cors = lireOrigines(MOTIFS.join(',')).cors
    try {
      expect(
        entetes('https://3f2a9c1b.billets-doux.pages.dev').get('Access-Control-Allow-Origin'),
      ).toBe('https://3f2a9c1b.billets-doux.pages.dev')
      expect(entetes('https://billetsdoux.app').get('Access-Control-Allow-Origin')).toBe(
        'https://billetsdoux.app',
      )
      expect(entetes('https://pirate.pages.dev').get('Access-Control-Allow-Origin')).toBeNull()
    } finally {
      payload.config.cors = avant
    }
  })

  it('la liste passée à buildConfig arrive intacte dans la configuration de Payload', () => {
    // Si Payload la recopiait en simple tableau, les motifs ne marcheraient plus en production.
    expect(payload.config.cors).toBeInstanceOf(OriginesAutorisees)
  })
})
