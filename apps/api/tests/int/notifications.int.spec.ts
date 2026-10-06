import type { Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { creerBrouillon } from '@/services/mots'
import {
  enregistrerAppareil,
  type MessagePush,
  type Recu,
  releverRecus,
  retirerAppareil,
  utiliserTransport,
} from '@/services/notifications'
import { programmer, recalculerOuvertures } from '@/services/programmation'
import { ouvrir, repondre } from '@/services/reception'
import { notifierMotsOuvrables, rappelerAuteurs } from '@/services/taches'

import { demarrer, duoForme, requete, viderBase } from './helpers'

let payload: Payload

/** Transport factice : note les messages au lieu de les confier à Expo. */
const envoyes: MessagePush[] = []
const jetonsMorts = new Set<string>()
let recus: Record<string, Recu> = {}
let compteur = 0

const JETON_LEO = 'ExponentPushToken[telephone-de-leo]'
const JETON_LINA = 'ExponentPushToken[telephone-de-lina]'

// Lina programme le jeudi 15 octobre 2026 à 12 h (Paris) ; Léo découvre ses mots à 8 h.
const PROGRAMMATION = new Date('2026-10-15T10:00:00Z')
const LE_20_A_7H59 = new Date('2026-10-20T05:59:00Z')
const LE_20_A_8H = new Date('2026-10-20T06:00:30Z')

beforeAll(async () => {
  payload = await demarrer()
  utiliserTransport({
    envoyer: async (messages) => {
      envoyes.push(...messages)
      return messages.map((m) =>
        jetonsMorts.has(m.to)
          ? {
              status: 'error' as const,
              message: 'appareil inconnu',
              details: { error: 'DeviceNotRegistered' },
            }
          : { status: 'ok' as const, id: `ticket-${++compteur}` },
      )
    },
    recus: async () => recus,
  })
})

beforeEach(async () => {
  await viderBase(payload)
  envoyes.length = 0
  jetonsMorts.clear()
  recus = {}
})

afterAll(async () => {
  await payload.destroy()
})

async function duoAvecTelephones() {
  const { a: lina, b: leo } = await duoForme(payload)
  await enregistrerAppareil(payload, leo.id, { jeton: JETON_LEO, plateforme: 'android' })
  await enregistrerAppareil(payload, lina.id, { jeton: JETON_LINA, plateforme: 'android' })
  return { lina, leo }
}

async function motPour(
  linaId: string,
  programmation: Parameters<typeof programmer>[3],
  texte = 'TEXTE-SECRET du mot',
  quand = PROGRAMMATION,
) {
  const mot = await creerBrouillon(await requete(payload), linaId, {
    type: 'mot',
    titre: 'TITRE-PRIVE',
    texte,
    indice: 'INDICE',
    manuscrit: true,
    photo: null,
    vocal: null,
  })
  await programmer(await requete(payload), linaId, mot.id, programmation, quand)
  return mot.id
}

const appareilsDe = async (id: string) =>
  (await payload.findByID({ collection: 'users', id, depth: 0 })).appareils?.map((a) => a.jeton)

describe('appareils', () => {
  it('un jeton par appareil, sans doublon, et jamais sur deux comptes', async () => {
    const { lina, leo } = await duoAvecTelephones()
    await enregistrerAppareil(payload, leo.id, { jeton: JETON_LEO, plateforme: 'android' })
    expect(await appareilsDe(leo.id)).toEqual([JETON_LEO])

    // Le téléphone de Léo passe sur le compte de Lina : Léo ne reçoit plus rien dessus.
    await enregistrerAppareil(payload, lina.id, { jeton: JETON_LEO, plateforme: 'android' })
    expect(await appareilsDe(leo.id)).toEqual([])
    expect(await appareilsDe(lina.id)).toEqual([JETON_LINA, JETON_LEO])

    await retirerAppareil(payload, lina.id, JETON_LEO)
    expect(await appareilsDe(lina.id)).toEqual([JETON_LINA])
  })
})

describe('mots arrivés à leur heure', () => {
  it('une notification par destinataire, sans aucun contenu du mot, une seule fois', async () => {
    const { lina } = await duoAvecTelephones()
    await motPour(lina.id, { mode: 'date', jour: '2026-10-20' })
    await motPour(lina.id, { mode: 'date', jour: '2026-10-20' }, 'AUTRE-TEXTE')
    await motPour(lina.id, { mode: 'date', jour: '2026-10-21' })

    expect(await notifierMotsOuvrables(payload, LE_20_A_7H59)).toBe(0)
    expect(envoyes).toEqual([])

    expect(await notifierMotsOuvrables(payload, LE_20_A_8H)).toBe(2)
    expect(envoyes).toEqual([
      {
        to: JETON_LEO,
        title: '2 mots de Lina t’attendent',
        data: { lien: '/pour-moi', rituel: true },
        channelId: 'mots',
        sound: 'default',
        priority: 'high',
      },
    ])
    const brut = JSON.stringify(envoyes)
    for (const interdit of ['TEXTE-SECRET', 'AUTRE-TEXTE', 'TITRE-PRIVE', 'INDICE', '2026-10-20']) {
      expect(brut).not.toContain(interdit)
    }

    // Le passage suivant ne renvoie rien ; le lendemain, un seul mot.
    expect(await notifierMotsOuvrables(payload, new Date('2026-10-20T06:01:30Z'))).toBe(0)
    await notifierMotsOuvrables(payload, new Date('2026-10-21T06:00:30Z'))
    expect(envoyes.map((m) => m.title)).toEqual([
      '2 mots de Lina t’attendent',
      'Un mot de Lina t’attend',
    ])
  })

  it('deux passages simultanés n’annoncent chaque mot qu’une fois', async () => {
    const { lina } = await duoAvecTelephones()
    await motPour(lina.id, { mode: 'date', jour: '2026-10-20' })
    const resultats = await Promise.all([
      notifierMotsOuvrables(payload, LE_20_A_8H),
      notifierMotsOuvrables(payload, LE_20_A_8H),
    ])
    expect(resultats.reduce((a, b) => a + b, 0)).toBe(1)
    expect(envoyes).toHaveLength(1)
  })

  it('« Dans la semaine » est annoncé à son heure ; rien pour une lettre ni un mot ouvert au joker', async () => {
    const { lina, leo } = await duoAvecTelephones()
    const surprise = await motPour(lina.id, { mode: 'semaine_hasard' })
    await motPour(lina.id, { mode: 'ouvre_quand', titre: '… tu doutes' })
    const joker = await motPour(lina.id, { mode: 'date', jour: '2026-10-25' })
    await ouvrir(await requete(payload), leo.id, joker, { joker: true }, PROGRAMMATION)

    const { unlockAt } = await payload.findByID({ collection: 'mots', id: surprise, depth: 0 })
    expect(await notifierMotsOuvrables(payload, new Date(unlockAt!))).toBe(1)
    await notifierMotsOuvrables(payload, new Date('2026-10-26T06:00:00Z'))
    expect(envoyes.map((m) => m.title)).toEqual(['Un mot de Lina t’attend'])
  })

  it('duo en pause : plus aucune notification, mais le mot est marqué (pas de rafale à la reprise)', async () => {
    const { lina, leo } = await duoAvecTelephones()
    const mot = await motPour(lina.id, { mode: 'date', jour: '2026-10-20' })
    const { duo } = await payload.findByID({ collection: 'users', id: leo.id, depth: 0 })
    await payload.update({ collection: 'duos', id: String(duo), data: { statut: 'pause' } })

    expect(await notifierMotsOuvrables(payload, LE_20_A_8H)).toBe(1)
    expect(envoyes).toEqual([])
    expect((await payload.findByID({ collection: 'mots', id: mot })).notifiedAt).toBeTruthy()
  })

  it('un mot ouvrable depuis plus d’un jour (serveur arrêté) est marqué sans notification', async () => {
    const { lina } = await duoAvecTelephones()
    await motPour(lina.id, { mode: 'date', jour: '2026-10-20' })
    await notifierMotsOuvrables(payload, new Date('2026-10-22T06:00:00Z'))
    expect(envoyes).toEqual([])
  })

  it('reprogrammé après l’annonce, le mot est de nouveau annoncé à sa nouvelle heure', async () => {
    const { lina } = await duoAvecTelephones()
    const mot = await motPour(lina.id, { mode: 'date', jour: '2026-10-20' })
    await notifierMotsOuvrables(payload, LE_20_A_8H)
    await programmer(
      await requete(payload),
      lina.id,
      mot,
      { mode: 'date', jour: '2026-10-23' },
      new Date('2026-10-20T09:00:00Z'),
    )
    await notifierMotsOuvrables(payload, new Date('2026-10-23T06:00:30Z'))
    expect(envoyes).toHaveLength(2)
  })
})

describe('changement d’heure du destinataire', () => {
  it('heure déjà passée : pas de deuxième annonce ; heure plus tardive : nouvelle annonce', async () => {
    const { lina, leo } = await duoAvecTelephones()
    await motPour(lina.id, { mode: 'date', jour: '2026-10-20' })
    await notifierMotsOuvrables(payload, LE_20_A_8H)
    expect(envoyes).toHaveLength(1)

    // Le recalcul (déclenché par le changement d'heure) avec l'instant simulé.
    const leoDoc = await payload.findByID({ collection: 'users', id: leo.id, depth: 0 })
    const changerHeure = async (heureDecouverte: string, maintenant: Date) =>
      recalculerOuvertures(await requete(payload), { ...leoDoc, heureDecouverte }, maintenant)

    // À 10 h, Léo passe à 7 h 30 : le mot reste ouvrable, il a déjà été annoncé.
    await changerHeure('07:30', new Date('2026-10-20T08:00:00Z'))
    await notifierMotsOuvrables(payload, new Date('2026-10-20T08:00:30Z'))
    expect(envoyes).toHaveLength(1)

    // À 10 h 05, il passe à 21 h : le mot redevient scellé, annoncé à 21 h.
    await changerHeure('21:00', new Date('2026-10-20T08:05:00Z'))
    await notifierMotsOuvrables(payload, new Date('2026-10-20T19:00:30Z'))
    expect(envoyes).toHaveLength(2)
  })
})

describe('réponse', () => {
  it('l’auteur apprend qu’on lui a répondu, sans le texte, et la notification mène au mot', async () => {
    const { lina, leo } = await duoAvecTelephones()
    const mot = await motPour(lina.id, { mode: 'date', jour: '2026-10-20' })
    await ouvrir(await requete(payload), leo.id, mot, { joker: false }, LE_20_A_8H)
    await repondre(await requete(payload), leo.id, mot, { texte: 'RÉPONSE-SECRÈTE' })

    expect(envoyes).toEqual([
      expect.objectContaining({
        to: JETON_LINA,
        title: 'Leo t’a répondu',
        data: { lien: `/mot/${mot}` },
      }),
    ])
    expect(JSON.stringify(envoyes)).not.toContain('RÉPONSE-SECRÈTE')
  })
})

describe('rappel doux', () => {
  // Jeudi 15 octobre à Paris (UTC+2).
  const A_17H59 = new Date('2026-10-15T15:59:00Z')
  const A_18H05 = new Date('2026-10-15T16:05:00Z')
  const A_21H05 = new Date('2026-10-15T19:05:00Z')

  it('moins de 2 mots dans les 7 jours : un rappel entre 18 h et 21 h, au plus une fois par semaine', async () => {
    const { lina } = await duoAvecTelephones()
    await motPour(lina.id, { mode: 'date', jour: '2026-10-17' })

    expect(await rappelerAuteurs(payload, A_17H59)).toBe(0)
    expect(await rappelerAuteurs(payload, A_21H05)).toBe(0)
    // Lina a 1 mot dans la semaine, Léo aucun : chacun est rappelé, pour l'autre.
    expect(await rappelerAuteurs(payload, A_18H05)).toBe(2)
    expect(envoyes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          to: JETON_LINA,
          title: 'Le calendrier de Leo se vide un peu',
          data: { lien: '/pour-toi' },
          priority: 'default',
        }),
        expect.objectContaining({ to: JETON_LEO, title: 'Le calendrier de Lina se vide un peu' }),
      ]),
    )
    // Le lendemain : déjà rappelés cette semaine. Huit jours après : de nouveau.
    expect(await rappelerAuteurs(payload, new Date('2026-10-16T16:05:00Z'))).toBe(0)
    expect(await rappelerAuteurs(payload, new Date('2026-10-23T16:05:00Z'))).toBe(2)
  })

  it('pas de rappel avec 2 mots dans les 7 jours, ni si le réglage est coupé', async () => {
    const { lina, leo } = await duoAvecTelephones()
    await motPour(lina.id, { mode: 'date', jour: '2026-10-17' })
    await motPour(lina.id, { mode: 'semaine_hasard' })
    // Léo n'a rien programmé pour Lina, mais il a coupé le rappel.
    await payload.update({
      collection: 'users',
      id: leo.id,
      data: { reglages: { rappelDoux: false } },
    })
    expect(await rappelerAuteurs(payload, A_18H05)).toBe(0)
    expect(envoyes).toEqual([])
  })
})

describe('appareils désinstallés', () => {
  it('un refus immédiat ou un reçu « DeviceNotRegistered » retire le jeton', async () => {
    const { lina, leo } = await duoAvecTelephones()
    jetonsMorts.add(JETON_LEO)
    await motPour(lina.id, { mode: 'date', jour: '2026-10-20' })
    await notifierMotsOuvrables(payload, LE_20_A_8H)
    expect(await appareilsDe(leo.id)).toEqual([])

    // Lina reçoit bien la réponse ; le reçu, un quart d'heure plus tard, dit l'appareil perdu.
    await enregistrerAppareil(payload, leo.id, { jeton: JETON_LEO, plateforme: 'android' })
    jetonsMorts.clear()
    const mot = await motPour(lina.id, { mode: 'date', jour: '2026-10-21' })
    await ouvrir(await requete(payload), leo.id, mot, { joker: true }, LE_20_A_8H)
    await repondre(await requete(payload), leo.id, mot, { texte: 'Merci' })
    const { docs } = await payload.find({ collection: 'envois-push', depth: 0 })
    expect(docs).toHaveLength(1)
    recus = { [docs[0]!.ticket]: { status: 'error', details: { error: 'DeviceNotRegistered' } } }

    expect(await releverRecus(payload, new Date())).toBe(0)
    expect(await releverRecus(payload, new Date(Date.now() + 16 * 60_000))).toBe(1)
    expect(await appareilsDe(lina.id)).toEqual([])
    expect((await payload.count({ collection: 'envois-push' })).totalDocs).toBe(0)
  })
})
