import {
  ChangementRythme,
  ModificationBrouillon,
  NouveauBrouillon,
  Programmation,
} from '@billets-doux/shared'
import type { Endpoint } from 'payload'

import { ErreurMetier } from '@/lib/erreurs'
import { exigerUtilisateur, json, lireCorps, route } from '@/lib/http'
import { creerBrouillon, modifierBrouillon, reserve, supprimerBrouillon } from '@/services/mots'
import { calendrier, changerRythme, programmer, remettreEnReserve } from '@/services/programmation'

const idDeRoute = (params: Record<string, unknown> | undefined) => {
  const id = params?.id
  if (typeof id !== 'string' || !id) throw new ErreurMetier(404, 'Mot introuvable.')
  return id
}

/** Routes de la collection `mots`, servies sous /api/mots/… */
export const listesMots: Endpoint[] = [
  {
    path: '/calendrier',
    method: 'get',
    handler: route(async (req) => json(req, 200, await calendrier(req, exigerUtilisateur(req)))),
  },
  {
    path: '/calendrier/rythme',
    method: 'patch',
    handler: route(async (req) => {
      const userId = exigerUtilisateur(req)
      const { rythme } = await lireCorps(req, ChangementRythme)
      await changerRythme(req, userId, rythme)
      return json(req, 200, await calendrier(req, userId))
    }),
  },
  {
    path: '/:id/programmation',
    method: 'post',
    handler: route(async (req) => {
      const userId = exigerUtilisateur(req)
      const programmation = await lireCorps(req, Programmation)
      return json(
        req,
        200,
        await programmer(req, userId, idDeRoute(req.routeParams), programmation),
      )
    }),
  },
  {
    path: '/:id/programmation',
    method: 'delete',
    handler: route(async (req) =>
      json(
        req,
        200,
        await remettreEnReserve(req, exigerUtilisateur(req), idDeRoute(req.routeParams)),
      ),
    ),
  },
  {
    path: '/reserve',
    method: 'get',
    handler: route(async (req) => json(req, 200, await reserve(req, exigerUtilisateur(req)))),
  },
  {
    path: '/brouillons',
    method: 'post',
    handler: route(async (req) => {
      const userId = exigerUtilisateur(req)
      const donnees = await lireCorps(req, NouveauBrouillon)
      return json(req, 201, await creerBrouillon(req, userId, donnees))
    }),
  },
  {
    path: '/brouillons/:id',
    method: 'patch',
    handler: route(async (req) => {
      const userId = exigerUtilisateur(req)
      const modification = await lireCorps(req, ModificationBrouillon)
      return json(
        req,
        200,
        await modifierBrouillon(req, userId, idDeRoute(req.routeParams), modification),
      )
    }),
  },
  {
    path: '/brouillons/:id',
    method: 'delete',
    handler: route(async (req) => {
      await supprimerBrouillon(req, exigerUtilisateur(req), idDeRoute(req.routeParams))
      return json(req, 200, { supprime: true })
    }),
  },
]
