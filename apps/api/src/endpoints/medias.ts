import { DemandeTeleversement } from '@billets-doux/shared'
import type { Endpoint, PayloadRequest } from 'payload'

import { ErreurMetier } from '@/lib/erreurs'
import { exigerUtilisateur, json, lireCorps, route } from '@/lib/http'
import { confirmer, demanderTeleversement, lecture } from '@/services/medias'

const idDeRoute = (params: Record<string, unknown> | undefined) => {
  const id = params?.id
  if (typeof id !== 'string' || !id) throw new ErreurMetier(404, 'Média introuvable.')
  return id
}

/** Hôte appelé (l'IP du Mac en dev) : les URL signées doivent viser la même adresse. */
const hote = (req: PayloadRequest) => req.headers.get('x-forwarded-host') ?? req.headers.get('host')

/** Routes de la collection `medias`, servies sous /api/medias/… */
export const listesMedias: Endpoint[] = [
  {
    path: '/televersement',
    method: 'post',
    handler: route(async (req) => {
      const userId = exigerUtilisateur(req)
      const demande = await lireCorps(req, DemandeTeleversement)
      return json(req, 201, await demanderTeleversement(req, userId, demande, hote(req)))
    }),
  },
  {
    path: '/:id/confirmer',
    method: 'post',
    handler: route(async (req) =>
      json(req, 200, await confirmer(req, exigerUtilisateur(req), idDeRoute(req.routeParams))),
    ),
  },
  {
    path: '/:id/lecture',
    method: 'get',
    handler: route(async (req) =>
      json(
        req,
        200,
        await lecture(req, exigerUtilisateur(req), idDeRoute(req.routeParams), hote(req)),
      ),
    ),
  },
]
