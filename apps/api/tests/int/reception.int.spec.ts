import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { preparerBucket } from '@/lib/stockage'
import { confirmer, demanderTeleversement, lecture } from '@/services/medias'
import { creerBrouillon, supprimerBrouillon } from '@/services/mots'
import { calendrier, programmer } from '@/services/programmation'
import { calendrierDestinataire, lireMot, ouvrir, reagir, repondre } from '@/services/reception'

import { demarrer, duoForme, nouvelUtilisateur, requete, viderBase } from './helpers'

let payload: Payload
const HOTE = 'localhost:3100'

// L'auteur (Lina) programme le jeudi 15 octobre 2026 à 12 h (Paris) ; Léo découvre ses mots à 8 h.
const PROGRAMMATION = new Date('2026-10-15T10:00:00Z')
const LE_20_A_7H = new Date('2026-10-20T05:00:00Z') // 7 h à Paris : encore scellé
const LE_20_A_9H = new Date('2026-10-20T07:00:00Z') // 9 h à Paris : à ouvrir

beforeAll(async () => {
  payload = await demarrer()
  await viderBase(payload)
  await preparerBucket([])
})

afterAll(async () => {
  await payload.destroy()
})

async function envoyer(
  userId: string,
  nature: 'photo' | 'vocal',
  octets: Uint8Array<ArrayBuffer>,
  duree = 5,
) {
  const t = await demanderTeleversement(
    await requete(payload),
    userId,
    nature === 'photo'
      ? { nature, mime: 'image/jpeg', taille: octets.length }
      : { nature, mime: 'audio/mp4', taille: octets.length, duree },
    HOTE,
  )
  expect((await fetch(t.url, { method: 'PUT', body: octets, headers: t.entetes })).status).toBe(200)
  return confirmer(await requete(payload), userId, t.id)
}

/** Lina écrit un mot complet (texte, titre, indice, photo) et le programme pour Léo. */
async function motScelle(
  programmation: Parameters<typeof programmer>[3] = { mode: 'date', jour: '2026-10-20' },
) {
  const { a: lina, b: leo } = await duoForme(payload)
  const photo = await envoyer(lina.id, 'photo', new Uint8Array([9, 8, 7, 6]))
  const brouillon = await creerBrouillon(await requete(payload), lina.id, {
    type: 'photo',
    titre: 'TITRE-PRIVE-DE-LINA',
    texte: 'TEXTE-SECRET : la crique, le jour où tu as perdu ta tong',
    indice: 'Tu te souviens de ce coin de plage ?',
    manuscrit: true,
    photo: photo.id,
    vocal: null,
  })
  await programmer(await requete(payload), lina.id, brouillon.id, programmation, PROGRAMMATION)
  const cle = (await payload.findByID({ collection: 'medias', id: photo.id })).cle
  return { lina, leo, motId: brouillon.id, photoId: photo.id, cle }
}

describe('verrouillage côté serveur', () => {
  it('avant l’heure, le destinataire ne reçoit que date, type, indice et heure d’ouverture', async () => {
    const { leo, motId, photoId, cle } = await motScelle()
    const cal = await calendrierDestinataire(await requete(payload), leo.id, LE_20_A_7H)

    expect(cal.cases).toEqual([
      {
        id: motId,
        jour: '2026-10-20',
        unlockAt: '2026-10-20T06:00:00.000Z',
        type: 'photo',
        etat: 'scelle',
        indice: 'Tu te souviens de ce coin de plage ?',
        ouvertLe: null,
        ouvertAvecJoker: false,
        reaction: null,
      },
    ])
    const brut = JSON.stringify(cal)
    for (const interdit of ['TEXTE-SECRET', 'TITRE-PRIVE-DE-LINA', photoId, cle, 'tong']) {
      expect(brut).not.toContain(interdit)
    }
  })

  it('jamais d’URL de média avant l’ouverture, ni par la lecture du mot', async () => {
    const { leo, motId, photoId } = await motScelle()
    await expect(lecture(await requete(payload), leo.id, photoId, HOTE)).rejects.toMatchObject({
      statut: 404,
    })
    await expect(lireMot(await requete(payload), leo.id, motId)).rejects.toMatchObject({
      statut: 404,
    })
  })

  it('l’indice disparaît si le destinataire ne veut pas d’indices', async () => {
    const { leo } = await motScelle()
    await payload.update({
      collection: 'users',
      id: leo.id,
      data: { reglages: { indicesVisibles: false } },
    })
    const cal = await calendrierDestinataire(await requete(payload), leo.id, LE_20_A_7H)
    expect(cal.cases[0]?.indice).toBeNull()
  })

  it('ouverture refusée avant l’heure (403) ; à l’heure, le mot entier et sa photo deviennent lisibles', async () => {
    const { leo, motId, photoId } = await motScelle()
    await expect(
      ouvrir(await requete(payload), leo.id, motId, { joker: false }, LE_20_A_7H),
    ).rejects.toMatchObject({ statut: 403 })

    expect(
      (await calendrierDestinataire(await requete(payload), leo.id, LE_20_A_9H)).cases[0]?.etat,
    ).toBe('a_ouvrir')
    const ouvert = await ouvrir(await requete(payload), leo.id, motId, { joker: false }, LE_20_A_9H)
    expect(ouvert).toMatchObject({
      texte: 'TEXTE-SECRET : la crique, le jour où tu as perdu ta tong',
      jour: '2026-10-20',
      ouvertAvecJoker: false,
      vuParAuteur: false,
      auteur: { prenom: 'Lina' },
    })
    expect(JSON.stringify(ouvert)).not.toContain('TITRE-PRIVE-DE-LINA')

    const { url } = await lecture(await requete(payload), leo.id, photoId, HOTE)
    expect(new Uint8Array(await (await fetch(url)).arrayBuffer())).toEqual(
      new Uint8Array([9, 8, 7, 6]),
    )

    // Rouvrir ne change rien.
    const encore = await ouvrir(await requete(payload), leo.id, motId, { joker: false }, LE_20_A_9H)
    expect(encore.ouvertLe).toBe(ouvert.ouvertLe)
  })

  it('l’auteur ne peut pas ouvrir son propre mot, ni un inconnu (404)', async () => {
    const { lina, motId } = await motScelle()
    const inconnu = await nouvelUtilisateur(payload, 'Intrus')
    for (const qui of [lina.id, inconnu.id]) {
      await expect(
        ouvrir(await requete(payload), qui, motId, { joker: true }, LE_20_A_9H),
      ).rejects.toMatchObject({ statut: 404 })
    }
  })
})

describe('joker', () => {
  it('ouvre un mot avant son jour, une fois par mois', async () => {
    const { lina, leo, motId } = await motScelle()
    const second = await creerBrouillon(await requete(payload), lina.id, {
      type: 'mot',
      titre: null,
      texte: 'Encore un',
      indice: null,
      manuscrit: true,
      photo: null,
      vocal: null,
    })
    await programmer(
      await requete(payload),
      lina.id,
      second.id,
      { mode: 'date', jour: '2026-10-25' },
      PROGRAMMATION,
    )

    const avant = new Date('2026-10-16T09:00:00Z')
    expect(
      (await calendrierDestinataire(await requete(payload), leo.id, avant)).jokersRestants,
    ).toBe(1)
    const ouvert = await ouvrir(await requete(payload), leo.id, motId, { joker: true }, avant)
    expect(ouvert.ouvertAvecJoker).toBe(true)
    expect(
      (await calendrierDestinataire(await requete(payload), leo.id, avant)).jokersRestants,
    ).toBe(0)
    await expect(
      ouvrir(await requete(payload), leo.id, second.id, { joker: true }, avant),
    ).rejects.toMatchObject({ statut: 409 })

    // L'auteur voit que le mot a été ouvert en avance.
    const vueAuteur = (await calendrier(await requete(payload), lina.id, avant)).mots.find(
      (m) => m.id === motId,
    )
    expect(vueAuteur?.ouvertAvecJoker).toBe(true)
  })

  it('renouvelé le 1er du mois, dans le fuseau du destinataire', async () => {
    const { lina, leo, motId } = await motScelle({ mode: 'date', jour: '2026-11-20' })
    const second = await creerBrouillon(await requete(payload), lina.id, {
      type: 'mot',
      titre: null,
      texte: 'Novembre',
      indice: null,
      manuscrit: true,
      photo: null,
      vocal: null,
    })
    await programmer(
      await requete(payload),
      lina.id,
      second.id,
      { mode: 'date', jour: '2026-11-25' },
      PROGRAMMATION,
    )

    // Fuseau de Léo : Paris (UTC+1 après le 25 octobre).
    const octobre = new Date('2026-10-31T22:30:00Z') // 31 octobre, 23 h 30 à Paris
    const encoreOctobre = new Date('2026-10-31T22:50:00Z') // 23 h 50 à Paris
    const novembre = new Date('2026-10-31T23:30:00Z') // 1er novembre, 0 h 30 à Paris
    await ouvrir(await requete(payload), leo.id, motId, { joker: true }, octobre)
    await expect(
      ouvrir(await requete(payload), leo.id, second.id, { joker: true }, encoreOctobre),
    ).rejects.toMatchObject({ statut: 409 })
    expect(
      (await calendrierDestinataire(await requete(payload), leo.id, novembre)).jokersRestants,
    ).toBe(1)
    const ouvert = await ouvrir(
      await requete(payload),
      leo.id,
      second.id,
      { joker: true },
      novembre,
    )
    expect(ouvert.ouvertAvecJoker).toBe(true)
  })
})

describe('« Dans la semaine » côté destinataire', () => {
  it('avant son heure : rien d’autre que le nombre de surprises, pas de joker possible', async () => {
    const { leo, motId } = await motScelle({ mode: 'semaine_hasard' })
    const secret = await payload.findByID({ collection: 'mots', id: motId, depth: 0 })
    const veille = new Date(new Date(secret.unlockAt!).getTime() - 60_000)

    // De l'envoi à la minute qui précède l'ouverture, heure par heure : la réponse est
    // toujours la même, seul « aujourd'hui » avance. Elle ne dit donc rien du jour tiré.
    const instants: Date[] = []
    for (let t = PROGRAMMATION.getTime(); t < veille.getTime(); t += 3_600_000) {
      instants.push(new Date(t))
    }
    instants.push(veille)
    for (const instant of instants) {
      const { aujourdhui, ...reste } = await calendrierDestinataire(
        await requete(payload),
        leo.id,
        instant,
      )
      expect(aujourdhui).toBeTruthy()
      expect(reste).toEqual({
        expediteur: { prenom: 'Lina' },
        jokersRestants: 1,
        cases: [],
        surprises: 1,
        lettres: [],
      })
    }
    const brut = JSON.stringify(
      await calendrierDestinataire(await requete(payload), leo.id, veille),
    )
    for (const interdit of [motId, secret.unlockAt!, 'TEXTE-SECRET', 'plage']) {
      expect(brut).not.toContain(interdit)
    }
    for (const joker of [false, true]) {
      await expect(
        ouvrir(await requete(payload), leo.id, motId, { joker }, veille),
      ).rejects.toMatchObject({ statut: 404 })
    }
  })

  it('à son heure : la case apparaît, « à ouvrir », à son jour', async () => {
    const { leo, motId } = await motScelle({ mode: 'semaine_hasard' })
    const secret = await payload.findByID({ collection: 'mots', id: motId, depth: 0 })
    const cal = await calendrierDestinataire(
      await requete(payload),
      leo.id,
      new Date(secret.unlockAt!),
    )
    expect(cal.surprises).toBe(0)
    expect(cal.cases).toMatchObject([{ id: motId, jour: secret.jourOuverture, etat: 'a_ouvrir' }])
  })
})

describe('lettres « Ouvre quand… »', () => {
  it('le titre se lit avant, la lettre s’ouvre à tout moment, une seule fois, sans joker', async () => {
    const { leo, motId } = await motScelle({
      mode: 'ouvre_quand',
      titre: '… tu n’arrives pas à dormir',
    })
    const cal = await calendrierDestinataire(await requete(payload), leo.id, PROGRAMMATION)
    expect(cal.lettres).toEqual([
      {
        id: motId,
        titre: '… tu n’arrives pas à dormir',
        type: 'photo',
        etat: 'scelle',
        ouvertLe: null,
      },
    ])
    expect(JSON.stringify(cal)).not.toContain('TEXTE-SECRET')

    const ouvert = await ouvrir(
      await requete(payload),
      leo.id,
      motId,
      { joker: false },
      PROGRAMMATION,
    )
    expect(ouvert).toMatchObject({ jour: null, titreOuvreQuand: '… tu n’arrives pas à dormir' })
    expect(
      (await calendrierDestinataire(await requete(payload), leo.id, PROGRAMMATION)).jokersRestants,
    ).toBe(1)
  })
})

describe('réagir et répondre', () => {
  async function motOuvert() {
    const ctx = await motScelle()
    await ouvrir(await requete(payload), ctx.leo.id, ctx.motId, { joker: false }, LE_20_A_9H)
    return ctx
  }

  it('pas de réaction sur un mot encore scellé (409)', async () => {
    const { leo, motId } = await motScelle()
    await expect(reagir(await requete(payload), leo.id, motId, 'coeur')).rejects.toMatchObject({
      statut: 409,
    })
  })

  it('la réaction se change et se retire ; l’auteur la voit', async () => {
    const { lina, leo, motId } = await motOuvert()
    await reagir(await requete(payload), leo.id, motId, 'coeur')
    expect((await reagir(await requete(payload), leo.id, motId, 'lune')).reaction).toBe('lune')
    expect(
      (await calendrierDestinataire(await requete(payload), leo.id, LE_20_A_9H)).cases[0]?.reaction,
    ).toBe('lune')
    const vueAuteur = (await calendrier(await requete(payload), lina.id, LE_20_A_9H)).mots[0]
    expect(vueAuteur?.reponse?.reaction).toBe('lune')
    expect((await reagir(await requete(payload), leo.id, motId, null)).reaction).toBeNull()
    // L'auteur ne réagit pas à son propre mot.
    await expect(reagir(await requete(payload), lina.id, motId, 'coeur')).rejects.toMatchObject({
      statut: 404,
    })
  })

  it('une seule réponse écrite, que l’auteur relit avec le mot', async () => {
    const { lina, leo, motId } = await motOuvert()
    await reagir(await requete(payload), leo.id, motId, 'etoile')
    const reponse = await repondre(await requete(payload), leo.id, motId, {
      texte: 'Tu sens la mer toi aussi ?',
    })
    expect(reponse).toMatchObject({ reaction: 'etoile', texte: 'Tu sens la mer toi aussi ?' })
    await expect(
      repondre(await requete(payload), leo.id, motId, { texte: 'Encore ?' }),
    ).rejects.toMatchObject({ statut: 409 })
    const relu = await lireMot(await requete(payload), lina.id, motId)
    expect(relu).toMatchObject({
      vuParAuteur: true,
      reponse: { texte: 'Tu sens la mer toi aussi ?' },
    })
  })

  it('réponse vocale de 30 s au plus ; l’auteur l’écoute, personne d’autre', async () => {
    const { lina, leo, motId } = await motOuvert()
    const trop = await envoyer(leo.id, 'vocal', new Uint8Array(100), 31)
    await expect(
      repondre(await requete(payload), leo.id, motId, { vocal: trop.id }),
    ).rejects.toMatchObject({ statut: 400 })

    const vocal = await envoyer(leo.id, 'vocal', new Uint8Array(120), 12)
    expect(
      (await repondre(await requete(payload), leo.id, motId, { vocal: vocal.id })).vocal?.duree,
    ).toBe(12)
    await expect(lecture(await requete(payload), lina.id, vocal.id, HOTE)).resolves.toBeTruthy()
    const intrus = await nouvelUtilisateur(payload, 'Intrus')
    await expect(lecture(await requete(payload), intrus.id, vocal.id, HOTE)).rejects.toMatchObject({
      statut: 404,
    })
  })

  it('supprimer le mot supprime aussi la réponse et son vocal', async () => {
    const { lina, leo, motId } = await motScelle()
    // Un mot ouvert ne peut plus être supprimé par l'appli : on simule la fermeture du duo (étape 7).
    await ouvrir(await requete(payload), leo.id, motId, { joker: false }, LE_20_A_9H)
    const vocal = await envoyer(leo.id, 'vocal', new Uint8Array(50), 3)
    await repondre(await requete(payload), leo.id, motId, { vocal: vocal.id })
    await payload.delete({ collection: 'mots', id: motId })
    expect(
      (await payload.count({ collection: 'reponses', where: { mot: { equals: motId } } }))
        .totalDocs,
    ).toBe(0)
    expect(
      (await payload.count({ collection: 'medias', where: { id: { equals: vocal.id } } }))
        .totalDocs,
    ).toBe(0)
    await expect(supprimerBrouillon(await requete(payload), lina.id, motId)).rejects.toMatchObject({
      statut: 404,
    })
  })
})
