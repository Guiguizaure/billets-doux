import { type DonneesNotification, titreMotsOuvrables } from '@billets-doux/shared'
import { Expo, type ExpoPushMessage } from 'expo-server-sdk'
import type { Payload } from 'payload'

import { idDe } from '@/lib/ids'

/**
 * Tout ce qui peut prévenir quelqu'un. Aucun événement ne transporte le contenu d'un mot :
 * seulement le prénom de l'autre et le nombre de mots.
 */
export type Evenement =
  | { type: 'mots_ouvrables'; expediteur: string; nombre: number }
  | { type: 'reponse'; de: string; motId: string }
  | { type: 'rappel_doux'; destinataire: string }

export type MessagePush = {
  to: string
  title: string
  data: DonneesNotification
  channelId: string
  sound: 'default'
  priority: 'high' | 'default'
}

export type Ticket =
  { status: 'ok'; id: string } | { status: 'error'; message: string; details?: { error?: string } }

export type Recu = { status: 'ok' } | { status: 'error'; details?: { error?: string } }

/** Le service d'envoi : Expo Push aujourd'hui, interchangeable sans toucher au reste. */
export type Transport = {
  envoyer: (messages: MessagePush[]) => Promise<Ticket[]>
  recus: (tickets: string[]) => Promise<Record<string, Recu>>
}

/** Canal Android créé par l'appli (« Mots du jour »). */
export const CANAL = 'mots'

export function transportExpo(): Transport {
  const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN || undefined })
  return {
    envoyer: async (messages) => {
      const tickets: Ticket[] = []
      for (const lot of expo.chunkPushNotifications(messages as ExpoPushMessage[])) {
        tickets.push(...((await expo.sendPushNotificationsAsync(lot)) as Ticket[]))
      }
      return tickets
    },
    recus: async (ids) => {
      const recus: Record<string, Recu> = {}
      for (const lot of expo.chunkPushNotificationReceiptIds(ids)) {
        Object.assign(recus, await expo.getPushNotificationReceiptsAsync(lot))
      }
      return recus
    },
  }
}

let transport: Transport = transportExpo()

/** Pour les tests : un transport factice qui note les messages. */
export function utiliserTransport(autre: Transport) {
  transport = autre
}
export const transportCourant = () => transport

/** Le texte et l'écran à ouvrir de chaque événement. */
export function message(evenement: Evenement): { titre: string; donnees: DonneesNotification } {
  switch (evenement.type) {
    case 'mots_ouvrables':
      return {
        titre: titreMotsOuvrables(evenement.expediteur, evenement.nombre),
        donnees: { lien: '/pour-moi', rituel: true },
      }
    case 'reponse':
      return {
        titre: `${evenement.de} t’a répondu`,
        donnees: { lien: `/mot/${evenement.motId}` },
      }
    case 'rappel_doux':
      return {
        titre: `Le calendrier de ${evenement.destinataire} se vide un peu`,
        donnees: { lien: '/pour-toi' },
      }
  }
}

/**
 * La seule porte de sortie des notifications. Ne fait rien si le duo est en pause ou fermé,
 * ou si la personne n'a aucun appareil. Ne lève jamais : une notification manquée ne doit pas
 * casser l'action qui l'a déclenchée. Renvoie le nombre de messages confiés au service.
 */
export async function notify(
  payload: Payload,
  userId: string,
  evenement: Evenement,
): Promise<number> {
  try {
    const user = await payload.findByID({ collection: 'users', id: userId, depth: 1 })
    const duo = typeof user.duo === 'object' ? user.duo : null
    if (!duo || duo.statut !== 'actif') return 0

    const appareils = (user.appareils ?? []).filter((a) => Expo.isExpoPushToken(a.jeton))
    if (appareils.length === 0) return 0

    const { titre, donnees } = message(evenement)
    const messages: MessagePush[] = appareils.map((a) => ({
      to: a.jeton,
      title: titre,
      data: donnees,
      channelId: CANAL,
      sound: 'default',
      priority: evenement.type === 'rappel_doux' ? 'default' : 'high',
    }))
    const tickets = await transport.envoyer(messages)

    let confies = 0
    for (const [i, ticket] of tickets.entries()) {
      const jeton = messages[i]?.to
      if (!jeton) continue
      if (ticket.status === 'ok') {
        confies += 1
        await payload.create({
          collection: 'envois-push',
          data: { ticket: ticket.id, jeton, utilisateur: userId },
        })
      } else if (ticket.details?.error === 'DeviceNotRegistered') {
        await retirerAppareil(payload, userId, jeton)
      } else {
        payload.logger.warn(`Notification refusée par Expo : ${ticket.message}`)
      }
    }
    return confies
  } catch (e) {
    payload.logger.error({ err: e, msg: 'Notification non envoyée' })
    return 0
  }
}

/**
 * Cet appareil reçoit désormais les notifications de ce compte, et de lui seul
 * (un téléphone passé d'un compte à l'autre ne reçoit plus celles de l'ancien).
 */
export async function enregistrerAppareil(
  payload: Payload,
  userId: string,
  appareil: { jeton: string; plateforme: 'android' | 'ios' },
  maintenant = new Date(),
) {
  const { docs: autres } = await payload.find({
    collection: 'users',
    where: {
      and: [{ 'appareils.jeton': { equals: appareil.jeton } }, { id: { not_equals: userId } }],
    },
    depth: 0,
    limit: 10,
  })
  for (const autre of autres) await retirerAppareil(payload, autre.id, appareil.jeton)

  const user = await payload.findByID({ collection: 'users', id: userId, depth: 0 })
  const appareils = (user.appareils ?? []).filter((a) => a.jeton !== appareil.jeton)
  await payload.update({
    collection: 'users',
    id: userId,
    data: { appareils: [...appareils, { ...appareil, vuLe: maintenant.toISOString() }] },
    depth: 0,
  })
}

export async function retirerAppareil(payload: Payload, userId: string, jeton: string) {
  const user = await payload.findByID({ collection: 'users', id: userId, depth: 0 })
  const appareils = user.appareils ?? []
  if (!appareils.some((a) => a.jeton === jeton)) return
  await payload.update({
    collection: 'users',
    id: userId,
    data: { appareils: appareils.filter((a) => a.jeton !== jeton) },
    depth: 0,
  })
}

/** Les reçus d'Expo, un quart d'heure après l'envoi : les appareils désinstallés sont oubliés. */
export async function releverRecus(payload: Payload, maintenant = new Date()) {
  const limite = new Date(maintenant.getTime() - 15 * 60_000).toISOString()
  const { docs } = await payload.find({
    collection: 'envois-push',
    where: { createdAt: { less_than_equal: limite } },
    depth: 0,
    limit: 1000,
  })
  if (docs.length === 0) return 0
  const recus = await transport.recus(docs.map((d) => d.ticket))
  for (const envoi of docs) {
    const recu = recus[envoi.ticket]
    if (recu?.status === 'error' && recu.details?.error === 'DeviceNotRegistered') {
      const userId = idDe(envoi.utilisateur)
      if (userId) await retirerAppareil(payload, userId, envoi.jeton)
    }
  }
  await payload.delete({
    collection: 'envois-push',
    where: { id: { in: docs.map((d) => d.id) } },
  })
  return docs.length
}
