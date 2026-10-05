import {
  ChangementRythme,
  ModificationBrouillon,
  NouveauBrouillon,
  Ouverture,
  Programmation,
  Reagir,
  Repondre,
} from '@billets-doux/shared'
import type { Endpoint } from 'payload'

import { ErreurMetier } from '@/lib/erreurs'
import { exigerUtilisateur, json, lireCorps, route } from '@/lib/http'
import { creerBrouillon, modifierBrouillon, reserve, supprimerBrouillon } from '@/services/mots'
import { calendrier, changerRythme, programmer, remettreEnReserve } from '@/services/programmation'
import { calendrierDestinataire, lireMot, ouvrir, reagir, repondre } from '@/services/reception'

const idDeRoute = (params: Record<string, unknown> | undefined) => {
  const id = params?.id
  if (typeof id !== 'string' || !id) throw new ErreurMetier(404, 'Mot introuvable.')
  return id
}

/** Routes de la collection `mots`, servies sous /api/mots/… */
export const listesMots: Endpoint[] = [
  {
    path: '/pour-moi',
    method: 'get',
    handler: route(async (req) =>
      json(req, 200, await calendrierDestinataire(req, exigerUtilisateur(req))),
    ),
  },
  {
    path: '/:id/ouverture',
    method: 'post',
    handler: route(async (req) => {
      const userId = exigerUtilisateur(req)
      const options = await lireCorps(req, Ouverture)
      return json(req, 200, await ouvrir(req, userId, idDeRoute(req.routeParams), options))
    }),
  },
  {
    path: '/:id/lecture',
    method: 'get',
    handler: route(async (req) =>
      json(req, 200, await lireMot(req, exigerUtilisateur(req), idDeRoute(req.routeParams))),
    ),
  },
  {
    path: '/:id/reaction',
    method: 'put',
    handler: route(async (req) => {
      const userId = exigerUtilisateur(req)
      const { reaction } = await lireCorps(req, Reagir)
      return json(req, 200, await reagir(req, userId, idDeRoute(req.routeParams), reaction))
    }),
  },
  {
    path: '/:id/reponse',
    method: 'post',
    handler: route(async (req) => {
      const userId = exigerUtilisateur(req)
      const contenu = await lireCorps(req, Repondre)
      return json(req, 201, await repondre(req, userId, idDeRoute(req.routeParams), contenu))
    }),
  },
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
