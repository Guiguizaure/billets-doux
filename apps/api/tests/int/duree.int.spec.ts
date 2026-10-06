import { strFromU8, unzipSync } from 'fflate'
import type { Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { decrire, preparerBucket } from '@/lib/stockage'
import { vueMoi } from '@/services/comptes'
import {
  exporter,
  fermerDuo,
  fixerRetrouvailles,
  mettreEnPause,
  nousDeux,
  reprendre,
  souvenirs,
  supprimerCompte,
} from '@/services/duree'
import { inviter, rejoindre } from '@/services/duos'
import { confirmer, demanderTeleversement, lecture } from '@/services/medias'
import { creerBrouillon } from '@/services/mots'
import { enregistrerAppareil, type MessagePush, utiliserTransport } from '@/services/notifications'
import { calendrier, programmer } from '@/services/programmation'
import { calendrierDestinataire, lireMot, ouvrir, reagir, repondre } from '@/services/reception'

import { demarrer, duoForme, MOT_DE_PASSE, nouvelUtilisateur, requete, viderBase } from './helpers'

let payload: Payload
const HOTE = 'localhost:3100'
const envoyes: MessagePush[] = []

// Lina programme le jeudi 15 octobre 2026 à 12 h (Paris) ; Léo découvre ses mots à 8 h.
const PROGRAMMATION = new Date('2026-10-15T10:00:00Z')
const LE_20_A_9H = new Date('2026-10-20T07:00:00Z')

beforeAll(async () => {
  payload = await demarrer()
  await preparerBucket([])
  utiliserTransport({
    envoyer: async (messages) => {
      envoyes.push(...messages)
      return messages.map((_, i) => ({ status: 'ok' as const, id: `t-${Date.now()}-${i}` }))
    },
    recus: async () => ({}),
  })
})

beforeEach(async () => {
  await viderBase(payload)
  envoyes.length = 0
})

afterAll(async () => {
  await payload.destroy()
})

async function envoyerPhoto(userId: string) {
  const octets = new Uint8Array([1, 2, 3, 4, 5])
  const t = await demanderTeleversement(
    await requete(payload),
    userId,
    { nature: 'photo', mime: 'image/jpeg', taille: octets.length },
    HOTE,
  )
  expect((await fetch(t.url, { method: 'PUT', body: octets, headers: t.entetes })).status).toBe(200)
  return confirmer(await requete(payload), userId, t.id)
}

async function ecrire(auteurId: string, texte: string, photo: string | null = null) {
  return creerBrouillon(await requete(payload), auteurId, {
    type: photo ? 'photo' : 'mot',
    titre: null,
    texte,
    indice: null,
    manuscrit: true,
    photo,
    vocal: null,
  })
}

async function programme(
  auteurId: string,
  texte: string,
  jour: string,
  photo: string | null = null,
) {
  const mot = await ecrire(auteurId, texte, photo)
  await programmer(await requete(payload), auteurId, mot.id, { mode: 'date', jour }, PROGRAMMATION)
  return mot.id
}

/** Un duo avec un peu d'histoire : un mot ouvert dans chaque sens, des mots en attente. */
async function duoAvecHistoire() {
  const { a: lina, b: leo } = await duoForme(payload)
  const photo = await envoyerPhoto(lina.id)
  const ouvertPourLeo = await programme(lina.id, 'OUVERT-POUR-LEO', '2026-10-20', photo.id)
  const ouvertPourLina = await programme(leo.id, 'OUVERT-POUR-LINA', '2026-10-20')
  await ouvrir(await requete(payload), leo.id, ouvertPourLeo, { joker: false }, LE_20_A_9H)
  await ouvrir(await requete(payload), lina.id, ouvertPourLina, { joker: false }, LE_20_A_9H)
  await repondre(await requete(payload), leo.id, ouvertPourLeo, { texte: 'REPONSE-DE-LEO' })
  const prevuPourLeo = await programme(
    lina.id,
    'PREVU-POUR-LEO',
    '2026-11-02',
    (await envoyerPhoto(lina.id)).id,
  )
  const brouillonLina = (await ecrire(lina.id, 'BROUILLON-DE-LINA')).id
  const prevuPourLina = await programme(leo.id, 'PREVU-POUR-LINA', '2026-11-03')
  return { lina, leo, ouvertPourLeo, ouvertPourLina, prevuPourLeo, brouillonLina, prevuPourLina }
}

describe('pause', () => {
  it('seule la personne qui a mis la pause peut la lever ; l’autre voit qui l’a mise', async () => {
    const { a: lina, b: leo } = await duoForme(payload)
    await mettreEnPause(await requete(payload), lina.id, PROGRAMMATION)
    await expect(mettreEnPause(await requete(payload), leo.id)).rejects.toMatchObject({
      statut: 409,
    })

    const vueLeo = await vueMoi(await requete(payload), leo.id, 'http://api')
    expect(vueLeo.duo).toMatchObject({
      statut: 'pause',
      pause: { parMoi: false, prenom: 'Lina', depuis: PROGRAMMATION.toISOString() },
    })
    expect((await vueMoi(await requete(payload), lina.id, 'http://api')).duo?.pause?.parMoi).toBe(
      true,
    )

    await expect(reprendre(await requete(payload), leo.id)).rejects.toMatchObject({ statut: 403 })
    await reprendre(await requete(payload), lina.id)
    expect((await vueMoi(await requete(payload), leo.id, 'http://api')).duo).toMatchObject({
      statut: 'actif',
      pause: null,
    })
  })

  it('en pause, on écrit et les cases s’ouvrent toujours', async () => {
    const { a: lina, b: leo } = await duoForme(payload)
    await mettreEnPause(await requete(payload), leo.id)
    const mot = await programme(lina.id, 'Pendant la pause', '2026-10-20')
    const ouvert = await ouvrir(await requete(payload), leo.id, mot, { joker: false }, LE_20_A_9H)
    expect(ouvert.texte).toBe('Pendant la pause')
  })
})

describe('retrouvailles', () => {
  it('un jour commun au duo, dans le futur et à un an au plus', async () => {
    const { a: lina, b: leo } = await duoForme(payload)
    const maintenant = new Date('2026-10-15T10:00:00Z')
    for (const jour of ['2026-10-15', '2026-10-01', '2027-10-16']) {
      await expect(
        fixerRetrouvailles(await requete(payload), lina.id, jour, maintenant),
      ).rejects.toMatchObject({ statut: 400 })
    }
    await fixerRetrouvailles(await requete(payload), lina.id, '2026-10-31', maintenant)
    expect((await vueMoi(await requete(payload), leo.id, 'http://api')).duo?.retrouvailles).toBe(
      '2026-10-31',
    )
    await fixerRetrouvailles(await requete(payload), leo.id, null, maintenant)
    expect((await nousDeux(await requete(payload), lina.id, maintenant)).retrouvailles).toBeNull()
  })
})

describe('fermeture du duo', () => {
  it('rien n’est supprimé : les mots en attente deviennent « jamais envoyés », pour leur auteur seul', async () => {
    const h = await duoAvecHistoire()
    await enregistrerAppareil(payload, h.leo.id, {
      jeton: 'ExponentPushToken[leo]',
      plateforme: 'android',
    })
    expect((await nousDeux(await requete(payload), h.lina.id)).motsPrevus).toBe(1)

    await fermerDuo(await requete(payload), h.lina.id)

    // Léo est prévenu, simplement.
    expect(envoyes.map((m) => [m.to, m.title, m.data])).toEqual([
      ['ExponentPushToken[leo]', 'Le duo est fermé', { lien: '/' }],
    ])
    for (const qui of [h.lina.id, h.leo.id]) {
      expect((await vueMoi(await requete(payload), qui, 'http://api')).duo?.statut).toBe('ferme')
    }

    // Lina relit ses mots jamais envoyés ; Léo ne peut ni les ouvrir, ni les lire, ni voir la photo.
    const relu = await lireMot(await requete(payload), h.lina.id, h.prevuPourLeo)
    expect(relu).toMatchObject({ jamaisEnvoye: true, ouvertLe: null, peutRepondre: false })
    const photo = relu.photo!.id
    await expect(
      ouvrir(
        await requete(payload),
        h.leo.id,
        h.prevuPourLeo,
        { joker: true },
        new Date('2026-11-03T07:00:00Z'),
      ),
    ).rejects.toMatchObject({ statut: 404 })
    await expect(lireMot(await requete(payload), h.leo.id, h.prevuPourLeo)).rejects.toMatchObject({
      statut: 404,
    })
    await expect(lecture(await requete(payload), h.leo.id, photo, HOTE)).rejects.toMatchObject({
      statut: 404,
    })

    // Souvenirs : les mots ouverts pour les deux ; « jamais envoyés » chacun pour soi.
    const sLina = await souvenirs(await requete(payload), h.lina.id, LE_20_A_9H)
    const sLeo = await souvenirs(await requete(payload), h.leo.id, LE_20_A_9H)
    expect(sLina.mots.map((m) => m.extrait).sort()).toEqual(['OUVERT-POUR-LEO', 'OUVERT-POUR-LINA'])
    expect(sLeo.mots.map((m) => m.extrait).sort()).toEqual(['OUVERT-POUR-LEO', 'OUVERT-POUR-LINA'])
    expect(sLina.jamaisEnvoyes.map((m) => m.extrait).sort()).toEqual([
      'BROUILLON-DE-LINA',
      'PREVU-POUR-LEO',
    ])
    expect(sLeo.jamaisEnvoyes.map((m) => m.extrait)).toEqual(['PREVU-POUR-LINA'])
    expect(JSON.stringify(sLeo)).not.toContain('PREVU-POUR-LEO')
    expect(JSON.stringify(sLeo)).not.toContain('BROUILLON-DE-LINA')

    // Un mot d'un duo fermé se relit, on n'y réagit ni n'y répond plus.
    await expect(
      reagir(await requete(payload), h.lina.id, h.ouvertPourLina, 'coeur'),
    ).rejects.toMatchObject({ statut: 409 })
    expect((await lireMot(await requete(payload), h.lina.id, h.ouvertPourLina)).peutRepondre).toBe(
      false,
    )

    // Chacun peut repartir avec un nouveau duo, sans retrouver l'ancien dans son calendrier.
    await inviter(await requete(payload), h.lina.id)
    expect((await vueMoi(await requete(payload), h.lina.id, 'http://api')).duo?.statut).toBe(
      'invitation',
    )
  })

  it('en pause, pas de notification de fermeture', async () => {
    const { a: lina, b: leo } = await duoForme(payload)
    await enregistrerAppareil(payload, leo.id, {
      jeton: 'ExponentPushToken[leo]',
      plateforme: 'android',
    })
    await mettreEnPause(await requete(payload), lina.id)
    await fermerDuo(await requete(payload), lina.id)
    expect(envoyes).toEqual([])
  })

  it('un nouveau duo n’affiche pas les mots de l’ancien dans les calendriers', async () => {
    const h = await duoAvecHistoire()
    await fermerDuo(await requete(payload), h.leo.id)
    // Lina rejoint Marc.
    const marc = await nouvelUtilisateur(payload, 'Marc')
    await inviter(await requete(payload), marc.id)
    const code = (await vueMoi(await requete(payload), marc.id, 'http://api')).duo?.invitation?.code
    await rejoindre(await requete(payload), h.lina.id, code!)
    expect((await calendrier(await requete(payload), h.lina.id, LE_20_A_9H)).mots).toEqual([])
    expect(
      (await calendrierDestinataire(await requete(payload), h.lina.id, LE_20_A_9H)).cases,
    ).toEqual([])
    // Les souvenirs, eux, gardent l'ancien duo.
    expect((await souvenirs(await requete(payload), h.lina.id, LE_20_A_9H)).mots).toHaveLength(2)
  })
})

describe('souvenirs', () => {
  it('« Ce jour-là » : un mot ouvert il y a un mois, et c’était le premier de son type', async () => {
    const h = await duoAvecHistoire()
    const unMoisApres = new Date('2026-11-20T09:00:00Z')
    const s = await souvenirs(await requete(payload), h.leo.id, unMoisApres)
    expect(s.ceJourLa).toEqual({
      motId: expect.any(String),
      phrase: expect.stringMatching(
        /^Il y a un mois, (Lina t’envoyait sa première photo|tu envoyais ton premier mot)\.$/,
      ),
      type: expect.any(String),
    })
    expect(
      (await souvenirs(await requete(payload), h.leo.id, new Date('2026-11-05T09:00:00Z')))
        .ceJourLa,
    ).toBeNull()
    expect(s.depuis).toBe(LE_20_A_9H.toISOString())
  })
})

describe('export', () => {
  it('l’archive contient mes souvenirs lisibles et mes jamais envoyés, rien d’autre', async () => {
    const h = await duoAvecHistoire()
    await fermerDuo(await requete(payload), h.leo.id)
    const { url, mots } = await exporter(await requete(payload), h.leo.id, HOTE)
    expect(mots).toBe(3)
    const reponse = await fetch(url)
    expect(reponse.status).toBe(200)
    expect(reponse.headers.get('content-disposition')).toContain('billets-doux-souvenirs.zip')
    const archive = unzipSync(new Uint8Array(await reponse.arrayBuffer()))
    const html = strFromU8(archive['souvenirs.html']!)
    for (const present of [
      'OUVERT-POUR-LEO',
      'OUVERT-POUR-LINA',
      'REPONSE-DE-LEO',
      'PREVU-POUR-LINA',
      'Jamais envoyés',
    ]) {
      expect(html).toContain(present)
    }
    for (const absent of ['PREVU-POUR-LEO', 'BROUILLON-DE-LINA']) expect(html).not.toContain(absent)
    // La photo du mot ouvert est dans l'archive, pas celle du mot jamais envoyé de Lina.
    const medias = Object.keys(archive).filter((f) => f.startsWith('medias/'))
    expect(medias).toHaveLength(1)
    expect(Array.from(archive[medias[0]!]!)).toEqual([1, 2, 3, 4, 5])
  })
})

describe('suppression du compte', () => {
  it('mot de passe exigé ; tout ce que j’ai écrit disparaît, fichiers compris ; l’autre garde ses mots', async () => {
    const h = await duoAvecHistoire()
    await expect(
      supprimerCompte(await requete(payload), h.lina.id, 'pas-le-bon'),
    ).rejects.toMatchObject({ statut: 403 })

    const { docs: mediasLina } = await payload.find({
      collection: 'medias',
      where: { proprietaire: { equals: h.lina.id } },
      depth: 0,
    })
    expect(mediasLina.length).toBe(2)

    await supprimerCompte(await requete(payload), h.lina.id, MOT_DE_PASSE)

    expect(
      (await payload.count({ collection: 'users', where: { id: { equals: h.lina.id } } }))
        .totalDocs,
    ).toBe(0)
    expect(
      (await payload.count({ collection: 'mots', where: { auteur: { equals: h.lina.id } } }))
        .totalDocs,
    ).toBe(0)
    expect(
      (
        await payload.count({
          collection: 'medias',
          where: { proprietaire: { equals: h.lina.id } },
        })
      ).totalDocs,
    ).toBe(0)
    for (const media of mediasLina) {
      expect(await decrire(media.cle)).toBeNull()
    }
    // La réponse de Léo portait sur un mot de Lina : partie avec lui.
    expect((await payload.count({ collection: 'reponses' })).totalDocs).toBe(0)

    // Léo : duo fermé, garde le mot qu'il avait écrit (ouvert par Lina) et son jamais envoyé.
    expect((await vueMoi(await requete(payload), h.leo.id, 'http://api')).duo?.statut).toBe('ferme')
    const s = await souvenirs(await requete(payload), h.leo.id, LE_20_A_9H)
    expect(s.mots.map((m) => m.extrait)).toEqual(['OUVERT-POUR-LINA'])
    expect(s.jamaisEnvoyes.map((m) => m.extrait)).toEqual(['PREVU-POUR-LINA'])
    expect(
      (await lireMot(await requete(payload), h.leo.id, h.ouvertPourLina)).destinataire.prenom,
    ).toBe('ta personne')
  })
})
