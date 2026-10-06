import { RejoindreDuo, Retrouvailles } from '@billets-doux/shared'
import type { Endpoint } from 'payload'

import { exigerUtilisateur, json, lireCorps, origine, route } from '@/lib/http'
import { vueMoi } from '@/services/comptes'
import { fermerDuo, fixerRetrouvailles, mettreEnPause, nousDeux, reprendre } from '@/services/duree'
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

/** Écran 5.1 « Nous deux ». */
export const nousDeuxEndpoint: Endpoint = {
  path: '/nous-deux',
  method: 'get',
  handler: route(async (req) => json(req, 200, await nousDeux(req, exigerUtilisateur(req)))),
}

/** Une action sur le duo, qui renvoie la vue « moi » à jour. */
const actionDuo = (
  path: string,
  action: (req: Parameters<typeof mettreEnPause>[0], userId: string) => Promise<void>,
  method: 'post' | 'put' = 'post',
): Endpoint => ({
  path,
  method,
  handler: route(async (req) => {
    const userId = exigerUtilisateur(req)
    await action(req, userId)
    return json(req, 200, await vueMoi(req, userId, origine(req)))
  }),
})

export const pauseEndpoint = actionDuo('/pause', (req, userId) => mettreEnPause(req, userId))
export const repriseEndpoint = actionDuo('/reprise', reprendre)
export const fermetureEndpoint = actionDuo('/fermeture', fermerDuo)
export const retrouvaillesEndpoint = actionDuo(
  '/retrouvailles',
  async (req, userId) => {
    const { jour } = await lireCorps(req, Retrouvailles)
    await fixerRetrouvailles(req, userId, jour)
  },
  'put',
)
