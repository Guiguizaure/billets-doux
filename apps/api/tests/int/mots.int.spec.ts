import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { decrire, preparerBucket } from '@/lib/stockage'
import { confirmer, demanderTeleversement, lecture } from '@/services/medias'
import { creerBrouillon, modifierBrouillon, reserve, supprimerBrouillon } from '@/services/mots'

import { demarrer, duoForme, nouvelUtilisateur, requete, viderBase } from './helpers'

let payload: Payload
const HOTE = 'localhost:3100'

beforeAll(async () => {
  payload = await demarrer()
  await viderBase(payload)
  await preparerBucket([])
})

afterAll(async () => {
  await payload.destroy()
})

const brouillon = (champs: Record<string, unknown>) => ({
  type: 'mot' as const,
  titre: null,
  texte: null,
  indice: null,
  manuscrit: true,
  photo: null,
  vocal: null,
  ...champs,
})

/** Envoie de vrais octets au stockage, comme le fera l'appli, puis confirme. */
async function envoyerPhoto(userId: string, octets = new Uint8Array(1234).fill(7)) {
  const t = await demanderTeleversement(
    await requete(payload),
    userId,
    { nature: 'photo', mime: 'image/jpeg', taille: octets.length },
    HOTE,
  )
  const envoi = await fetch(t.url, { method: 'PUT', body: octets, headers: t.entetes })
  expect(envoi.status).toBe(200)
  return confirmer(await requete(payload), userId, t.id)
}

const cleDe = async (mediaId: string) =>
  (await payload.findByID({ collection: 'medias', id: mediaId })).cle

describe('médias', () => {
  it('faut un duo pour envoyer un fichier', async () => {
    const seul = await nouvelUtilisateur(payload, 'Solo')
    await expect(
      demanderTeleversement(
        await requete(payload),
        seul.id,
        { nature: 'photo', mime: 'image/jpeg', taille: 10 },
        HOTE,
      ),
    ).rejects.toMatchObject({ statut: 409 })
  })

  it('envoi direct au stockage, confirmation, puis lecture par URL signée', async () => {
    const { a } = await duoForme(payload)
    const octets = new Uint8Array([1, 2, 3, 4, 5])
    const media = await envoyerPhoto(a.id, octets)
    expect(media).toMatchObject({ nature: 'photo', mime: 'image/jpeg', taille: 5, duree: null })

    const { url } = await lecture(await requete(payload), a.id, media.id, HOTE)
    const lu = await fetch(url)
    expect(lu.status).toBe(200)
    expect(new Uint8Array(await lu.arrayBuffer())).toEqual(octets)
  })

  it('le stockage refuse un fichier d’une autre taille que celle signée', async () => {
    const { a } = await duoForme(payload)
    const t = await demanderTeleversement(
      await requete(payload),
      a.id,
      { nature: 'photo', mime: 'image/jpeg', taille: 10 },
      HOTE,
    )
    const envoi = await fetch(t.url, {
      method: 'PUT',
      body: new Uint8Array(500),
      headers: t.entetes,
    })
    expect(envoi.status).toBeGreaterThanOrEqual(400)
    await expect(confirmer(await requete(payload), a.id, t.id)).rejects.toMatchObject({
      statut: 409,
    })
  })

  it('personne d’autre ne lit un média : ni l’autre membre du duo, ni un inconnu (404)', async () => {
    const { a, b } = await duoForme(payload)
    const inconnu = await nouvelUtilisateur(payload, 'Intrus')
    const media = await envoyerPhoto(a.id)
    for (const qui of [b.id, inconnu.id]) {
      await expect(lecture(await requete(payload), qui, media.id, HOTE)).rejects.toMatchObject({
        statut: 404,
      })
      await expect(confirmer(await requete(payload), qui, media.id)).rejects.toMatchObject({
        statut: 404,
      })
    }
  })
})

describe('brouillons (la réserve)', () => {
  it('un brouillon est destiné à l’autre membre, mais seul l’auteur le voit', async () => {
    const { a, b } = await duoForme(payload)
    const mot = await creerBrouillon(
      await requete(payload),
      a.id,
      brouillon({ type: 'poeme', texte: 'Il pleut sur la ville', indice: 'la météo' }),
    )
    expect(mot).toMatchObject({ type: 'poeme', statut: 'brouillon', mode: 'brouillon' })
    const enBase = await payload.findByID({ collection: 'mots', id: mot.id, depth: 0 })
    expect(enBase.destinataire).toBe(b.id)

    expect((await reserve(await requete(payload), a.id)).mots.map((m) => m.id)).toContain(mot.id)
    expect((await reserve(await requete(payload), b.id)).mots).toHaveLength(0)
  })

  it('refuse un mot vide, à la création comme à la modification (400)', async () => {
    const { a } = await duoForme(payload)
    await expect(
      creerBrouillon(await requete(payload), a.id, brouillon({ texte: '   ' })),
    ).rejects.toMatchObject({ statut: 400 })
    const mot = await creerBrouillon(await requete(payload), a.id, brouillon({ texte: 'Coucou' }))
    await expect(
      modifierBrouillon(await requete(payload), a.id, mot.id, { texte: '' }),
    ).rejects.toMatchObject({ statut: 400 })
  })

  it('seul l’auteur modifie ou supprime son brouillon (404 pour les autres)', async () => {
    const { a, b } = await duoForme(payload)
    const mot = await creerBrouillon(await requete(payload), a.id, brouillon({ texte: 'À moi' }))
    await expect(
      modifierBrouillon(await requete(payload), b.id, mot.id, { texte: 'Piraté' }),
    ).rejects.toMatchObject({ statut: 404 })
    await expect(supprimerBrouillon(await requete(payload), b.id, mot.id)).rejects.toMatchObject({
      statut: 404,
    })
  })

  it('n’accepte que ses propres médias, et un média ne sert qu’à un mot', async () => {
    const { a, b } = await duoForme(payload)
    const photoDeA = await envoyerPhoto(a.id)
    await expect(
      creerBrouillon(
        await requete(payload),
        b.id,
        brouillon({ type: 'photo', photo: photoDeA.id }),
      ),
    ).rejects.toMatchObject({ statut: 404 })

    await creerBrouillon(
      await requete(payload),
      a.id,
      brouillon({ type: 'photo', photo: photoDeA.id }),
    )
    await expect(
      creerBrouillon(
        await requete(payload),
        a.id,
        brouillon({ type: 'photo', photo: photoDeA.id }),
      ),
    ).rejects.toMatchObject({ statut: 400 })
  })

  it('une photo remplacée est supprimée, fichier compris', async () => {
    const { a } = await duoForme(payload)
    const premiere = await envoyerPhoto(a.id)
    const mot = await creerBrouillon(
      await requete(payload),
      a.id,
      brouillon({ type: 'photo', photo: premiere.id }),
    )
    const cle = await cleDe(premiere.id)
    const seconde = await envoyerPhoto(a.id)
    const modifie = await modifierBrouillon(await requete(payload), a.id, mot.id, {
      photo: seconde.id,
    })
    expect(modifie.photo?.id).toBe(seconde.id)
    expect(await decrire(cle)).toBeNull()
    expect(
      await payload.count({ collection: 'medias', where: { id: { equals: premiere.id } } }),
    ).toMatchObject({ totalDocs: 0 })
  })

  it('supprimer un brouillon supprime aussi ses médias et leurs fichiers', async () => {
    const { a } = await duoForme(payload)
    const photo = await envoyerPhoto(a.id)
    const cle = await cleDe(photo.id)
    const mot = await creerBrouillon(
      await requete(payload),
      a.id,
      brouillon({ type: 'photo', photo: photo.id, texte: 'Regarde le ciel' }),
    )
    await supprimerBrouillon(await requete(payload), a.id, mot.id)
    expect(
      await payload.count({ collection: 'mots', where: { id: { equals: mot.id } } }),
    ).toMatchObject({ totalDocs: 0 })
    expect(await decrire(cle)).toBeNull()
  })
})
