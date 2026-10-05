import { z } from 'zod'

export const HealthResponse = z.object({
  ok: z.boolean(),
  db: z.boolean(),
})
export type HealthResponse = z.infer<typeof HealthResponse>

/** Interroge `GET /api/health` et valide la réponse. */
export async function getHealth(baseUrl: string, fetchImpl: typeof fetch = fetch) {
  const res = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/api/health`)
  if (!res.ok && res.status !== 503) throw new Error(`API injoignable (HTTP ${res.status})`)
  return HealthResponse.parse(await res.json())
}
