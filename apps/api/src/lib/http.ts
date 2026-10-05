import type { PayloadHandler, PayloadRequest } from 'payload'
import { headersWithCors } from 'payload'
import type { z } from 'zod'

import { ErreurMetier } from './erreurs'

/** Réponse JSON avec les en-têtes CORS de Payload. */
export function json(req: PayloadRequest, statut: number, corps: unknown) {
  return Response.json(corps, {
    status: statut,
    headers: headersWithCors({ headers: new Headers(), req }),
  })
}

/** Lit et valide le corps JSON ; les erreurs zod deviennent des erreurs par champ. */
export async function lireCorps<S extends z.ZodType>(
  req: PayloadRequest,
  schema: S,
): Promise<z.infer<S>> {
  let brut: unknown = {}
  try {
    if (req.json) brut = await req.json()
  } catch {
    throw new ErreurMetier(400, 'Requête invalide.')
  }
  const resultat = schema.safeParse(brut ?? {})
  if (resultat.success) return resultat.data

  const champs: Record<string, string> = {}
  for (const probleme of resultat.error.issues) {
    const champ = probleme.path.join('.')
    if (champ && !champs[champ]) champs[champ] = probleme.message
  }
  throw new ErreurMetier(400, resultat.error.issues[0]?.message ?? 'Requête invalide.', champs)
}

/** Identifiant de l'utilisateur de l'appli connecté (les admins n'ont pas accès à ces routes). */
export function exigerUtilisateur(req: PayloadRequest) {
  if (!req.user || req.user.collection !== 'users') {
    throw new ErreurMetier(401, 'Connecte-toi pour continuer.')
  }
  return String(req.user.id)
}

/**
 * Origine publique de l'API, pour fabriquer les liens d'invitation : `PUBLIC_URL` si défini
 * (production), sinon l'hôte appelé (l'IP du Mac sur le réseau local en développement).
 */
export function origine(req: PayloadRequest) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, '')
  const hote = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost:3100'
  const protocole = req.headers.get('x-forwarded-proto') ?? 'http'
  return `${protocole}://${hote}`
}

/** Enveloppe une route : erreurs métier → JSON lisible, le reste → 500 journalisé. */
export function route(gestionnaire: (req: PayloadRequest) => Promise<Response>): PayloadHandler {
  return async (req) => {
    try {
      return await gestionnaire(req)
    } catch (e) {
      if (e instanceof ErreurMetier) {
        return json(req, e.statut, { erreur: e.message, champs: e.champs })
      }
      req.payload.logger.error({ err: e }, 'Erreur dans une route de l’appli')
      return json(req, 500, { erreur: 'Une erreur est survenue. Réessaie dans un instant.' })
    }
  }
}
