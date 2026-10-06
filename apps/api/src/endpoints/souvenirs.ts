import type { Endpoint } from 'payload'

import { exigerUtilisateur, json, route } from '@/lib/http'
import { exporter, souvenirs } from '@/services/duree'

/** Souvenirs (4.2) et export de l'archive : /api/souvenirs… */
export const souvenirsEndpoints: Endpoint[] = [
  {
    path: '/souvenirs',
    method: 'get',
    handler: route(async (req) => json(req, 200, await souvenirs(req, exigerUtilisateur(req)))),
  },
  {
    path: '/souvenirs/export',
    method: 'post',
    handler: route(async (req) => {
      const userId = exigerUtilisateur(req)
      // L'URL de téléchargement doit être signée pour l'hôte que l'appareil sait joindre.
      return json(req, 200, await exporter(req, userId, req.headers.get('host')))
    }),
  },
]
