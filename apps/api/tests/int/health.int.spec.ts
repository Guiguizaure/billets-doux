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

describe('API', () => {
  it('se connecte à la base de test', async () => {
    expect(payload.db.name).toBe('mongoose')
    const res = await payload.find({ collection: 'admins', limit: 1 })
    expect(res.docs).toBeInstanceOf(Array)
  })
})
