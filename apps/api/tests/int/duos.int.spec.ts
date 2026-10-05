import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { vueMoi } from '@/services/comptes'
import { inviter, rejoindre } from '@/services/duos'

import { demarrer, nouvelUtilisateur, requete, viderBase } from './helpers'

let payload: Payload

beforeAll(async () => {
  payload = await demarrer()
  await viderBase(payload)
})

afterAll(async () => {
  await payload.destroy()
})

const moi = async (id: string) => vueMoi(await requete(payload), id, 'http://192.168.1.7:3100')

async function invitation(id: string) {
  await inviter(await requete(payload), id)
  const vue = await moi(id)
  if (!vue.duo?.invitation) throw new Error('Pas d’invitation')
  return vue.duo.invitation
}

describe('invitation', () => {
  it('crée un duo en attente avec un code « MOT + 4 chiffres » valable 7 jours', async () => {
    const lina = await nouvelUtilisateur(payload, 'Lina')
    const inv = await invitation(lina.id)
    expect(inv.code).toMatch(/^[A-Z]{3,10}\d{4}$/)
    expect(inv.lien).toBe(`http://192.168.1.7:3100/rejoindre/${inv.code}`)
    const jours = (new Date(inv.expireLe).getTime() - Date.now()) / 86_400_000
    expect(jours).toBeGreaterThan(6.9)
    expect(jours).toBeLessThanOrEqual(7)
    const vue = await moi(lina.id)
    expect(vue.duo).toMatchObject({ statut: 'invitation', partenaire: null })
  })

  it('renvoie la même invitation tant qu’elle est valable', async () => {
    const leo = await nouvelUtilisateur(payload, 'Leo')
    const premiere = await invitation(leo.id)
    const seconde = await invitation(leo.id)
    expect(seconde.code).toBe(premiere.code)
  })

  it('renouvelle le code d’une invitation expirée', async () => {
    const ana = await nouvelUtilisateur(payload, 'Ana')
    const ancienne = await invitation(ana.id)
    await expirer(ancienne.code)
    const nouvelle = await invitation(ana.id)
    expect(nouvelle.code).not.toBe(ancienne.code)
    expect(new Date(nouvelle.expireLe).getTime()).toBeGreaterThan(Date.now())
  })
})

describe('rejoindre un duo', () => {
  it('forme le duo : les deux se voient par leur prénom, plus d’invitation affichée', async () => {
    const lina = await nouvelUtilisateur(payload, 'Lina')
    const leo = await nouvelUtilisateur(payload, 'Leo')
    const { code } = await invitation(lina.id)

    await rejoindre(await requete(payload), leo.id, code.toLowerCase())

    const vueLina = await moi(lina.id)
    const vueLeo = await moi(leo.id)
    expect(vueLina.duo).toMatchObject({
      statut: 'actif',
      invitation: null,
      partenaire: { prenom: 'Leo' },
    })
    expect(vueLeo.duo).toMatchObject({
      statut: 'actif',
      invitation: null,
      partenaire: { prenom: 'Lina' },
    })
    expect(vueLeo.duo?.id).toBe(vueLina.duo?.id)

    const duo = await payload.findByID({ collection: 'duos', id: vueLina.duo!.id, depth: 0 })
    expect(duo.membres).toEqual([lina.id, leo.id])
    expect(duo.rythmes?.map((r) => r.rythme)).toEqual(['jour', 'jour'])
  })

  it('accepte le code tel qu’il est affiché (« LUNE · 4821 »)', async () => {
    const a = await nouvelUtilisateur(payload, 'Iris')
    const b = await nouvelUtilisateur(payload, 'Hugo')
    const { code } = await invitation(a.id)
    const affiche = code.replace(/(\d+)$/, ' · $1')
    await rejoindre(await requete(payload), b.id, affiche)
    expect((await moi(b.id)).duo?.statut).toBe('actif')
  })

  it('le duo est exclusif : une troisième personne ne peut plus entrer', async () => {
    const a = await nouvelUtilisateur(payload, 'Nina')
    const b = await nouvelUtilisateur(payload, 'Paul')
    const c = await nouvelUtilisateur(payload, 'Jade')
    const { code } = await invitation(a.id)
    await rejoindre(await requete(payload), b.id, code)

    await expect(rejoindre(await requete(payload), c.id, code)).rejects.toMatchObject({
      statut: 404,
    })
    await expect(inviter(await requete(payload), a.id)).rejects.toMatchObject({ statut: 409 })
    await expect(inviter(await requete(payload), b.id)).rejects.toMatchObject({ statut: 409 })

    const autre = await nouvelUtilisateur(payload, 'Eve')
    const { code: autreCode } = await invitation(autre.id)
    await expect(rejoindre(await requete(payload), b.id, autreCode)).rejects.toMatchObject({
      statut: 409,
    })
  })

  it('refuse son propre code (400)', async () => {
    const a = await nouvelUtilisateur(payload, 'Lou')
    const { code } = await invitation(a.id)
    await expect(rejoindre(await requete(payload), a.id, code)).rejects.toMatchObject({
      statut: 400,
    })
  })

  it('refuse un code expiré (410)', async () => {
    const a = await nouvelUtilisateur(payload, 'Max')
    const b = await nouvelUtilisateur(payload, 'Rose')
    const { code } = await invitation(a.id)
    await expirer(code)
    await expect(rejoindre(await requete(payload), b.id, code)).rejects.toMatchObject({
      statut: 410,
    })
  })

  it('supprime l’invitation que la personne qui rejoint avait lancée', async () => {
    const a = await nouvelUtilisateur(payload, 'Elsa')
    const b = await nouvelUtilisateur(payload, 'Noah')
    const { code } = await invitation(a.id)
    const { code: codeDeB } = await invitation(b.id)
    await rejoindre(await requete(payload), b.id, code)
    const { totalDocs } = await payload.count({
      collection: 'duos',
      where: { code: { equals: codeDeB } },
    })
    expect(totalDocs).toBe(0)
  })

  it('deux personnes qui utilisent le même code en même temps : une seule entre', async () => {
    const a = await nouvelUtilisateur(payload, 'Ines')
    const b = await nouvelUtilisateur(payload, 'Remi')
    const c = await nouvelUtilisateur(payload, 'Lea')
    const { code } = await invitation(a.id)

    const resultats = await Promise.allSettled([
      rejoindre(await requete(payload), b.id, code),
      rejoindre(await requete(payload), c.id, code),
    ])
    expect(resultats.filter((r) => r.status === 'fulfilled')).toHaveLength(1)

    const duo = await payload.findByID({ collection: 'duos', id: (await moi(a.id)).duo!.id })
    expect(duo.membres).toHaveLength(2)
  })

  it('bloque après 5 codes faux en 15 minutes (429)', async () => {
    const a = await nouvelUtilisateur(payload, 'Adam')
    for (let i = 0; i < 5; i++) {
      await expect(rejoindre(await requete(payload), a.id, 'NUAGE0000')).rejects.toMatchObject({
        statut: 404,
      })
    }
    await expect(rejoindre(await requete(payload), a.id, 'NUAGE0000')).rejects.toMatchObject({
      statut: 429,
    })
  })
})

async function expirer(code: string) {
  await payload.update({
    collection: 'duos',
    where: { code: { equals: code } },
    data: { codeExpireLe: new Date(Date.now() - 1000).toISOString() },
  })
}
