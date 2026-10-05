import type { HealthResponse } from '@billets-doux/shared'
import type { MongooseAdapter } from '@payloadcms/db-mongodb'
import { headersWithCors, type Endpoint } from 'payload'

/** `GET /api/health` : l'API répond et la base est joignable. */
export const health: Endpoint = {
  path: '/health',
  method: 'get',
  handler: async (req) => {
    let db = false
    try {
      await (req.payload.db as MongooseAdapter).connection.db?.admin().ping()
      db = true
    } catch {
      db = false
    }
    const body: HealthResponse = { ok: db, db }
    return Response.json(body, {
      status: db ? 200 : 503,
      headers: headersWithCors({ headers: new Headers(), req }),
    })
  },
}
