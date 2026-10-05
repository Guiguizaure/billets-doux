import { RejoindreDuo } from '@billets-doux/shared'
import type { Endpoint } from 'payload'

import { exigerUtilisateur, json, lireCorps, origine, route } from '@/lib/http'
import { vueMoi } from '@/services/comptes'
import { inviter, rejoindre } from '@/services/duos'

/** Routes de la collection `duos` : servies sous /api/duos/… */
export const inviterEndpoint: Endpoint = {
  path: '/inviter',
  method: 'post',
  handler: route(async (req) => {
    const userId = exigerUtilisateur(req)
    await inviter(req, userId)
    return json(req, 200, await vueMoi(req, userId, origine(req)))
  }),
}

export const rejoindreEndpoint: Endpoint = {
  path: '/rejoindre',
  method: 'post',
  handler: route(async (req) => {
    const userId = exigerUtilisateur(req)
    const { code } = await lireCorps(req, RejoindreDuo)
    await rejoindre(req, userId, code)
    return json(req, 200, await vueMoi(req, userId, origine(req)))
  }),
}
