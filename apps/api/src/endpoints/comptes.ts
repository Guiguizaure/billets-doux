import { Connexion, Inscription, MiseAJourCompte } from '@billets-doux/shared'
import type { Endpoint } from 'payload'

import { exigerUtilisateur, json, lireCorps, origine, route } from '@/lib/http'
import { connecter, inscrire, mettreAJour, rafraichir, vueMoi } from '@/services/comptes'

export const comptesEndpoints: Endpoint[] = [
  {
    path: '/comptes/inscription',
    method: 'post',
    handler: route(async (req) =>
      json(req, 201, await inscrire(req.payload, await lireCorps(req, Inscription))),
    ),
  },
  {
    path: '/comptes/connexion',
    method: 'post',
    handler: route(async (req) =>
      json(req, 200, await connecter(req.payload, await lireCorps(req, Connexion))),
    ),
  },
  {
    path: '/comptes/rafraichir',
    method: 'post',
    handler: route(async (req) => {
      exigerUtilisateur(req)
      return json(req, 200, await rafraichir(req))
    }),
  },
  {
    path: '/comptes/moi',
    method: 'get',
    handler: route(async (req) =>
      json(req, 200, await vueMoi(req, exigerUtilisateur(req), origine(req))),
    ),
  },
  {
    path: '/comptes/moi',
    method: 'patch',
    handler: route(async (req) => {
      const userId = exigerUtilisateur(req)
      await mettreAJour(req, userId, await lireCorps(req, MiseAJourCompte))
      return json(req, 200, await vueMoi(req, userId, origine(req)))
    }),
  },
]
