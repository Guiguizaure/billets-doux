import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'

let payload: Payload

describe('API', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  afterAll(async () => {
    await payload.destroy()
  })

  it('se connecte à Mongo', async () => {
    const res = await payload.find({ collection: 'admins', limit: 1 })
    expect(res.docs).toBeInstanceOf(Array)
  })

  it('refuse la lecture des utilisateurs sans être admin', async () => {
    await expect(
      payload.find({ collection: 'users', overrideAccess: false, user: undefined }),
    ).rejects.toThrow()
  })
})
