import type { MongooseAdapter } from '@payloadcms/db-mongodb'
import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { demarrer } from './helpers'

let payload: Payload

beforeAll(async () => {
  payload = await demarrer()
})

afterAll(async () => {
  await payload.destroy()
})

describe('index de la base', () => {
  it('les requêtes fréquentes sur les mots ont leur index composé', async () => {
    const mots = (payload.db as unknown as MongooseAdapter).collections.mots!
    await mots.syncIndexes()
    const presents = (await mots.collection.indexes()).map((i) => Object.keys(i.key).join(','))
    for (const attendu of [
      'destinataire,duo,statut',
      'auteur,duo,statut',
      'destinataire,statut',
      'auteur,statut',
      'statut,unlockAt',
    ]) {
      expect(presents).toContain(attendu)
    }
  })
})
