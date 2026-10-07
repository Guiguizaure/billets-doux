import type { MongooseAdapter } from '@payloadcms/db-mongodb'
import type { Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import {
  deposerFichier,
  listerCles,
  preparerBucket,
  PREFIXE_SAUVEGARDES,
  supprimerPrefixe,
  urlEnvoi,
  urlLecture,
  urlTelechargement,
} from '@/lib/stockage'
import { listerSauvegardes, nomSauvegarde, restaurer, sauvegarder } from '@/services/sauvegarde'

import { demarrer, duoForme, viderBase } from './helpers'

let payload: Payload

beforeAll(async () => {
  payload = await demarrer()
  await preparerBucket([])
})

beforeEach(async () => {
  await viderBase(payload)
  await supprimerPrefixe(PREFIXE_SAUVEGARDES)
})

afterAll(async () => {
  await supprimerPrefixe(PREFIXE_SAUVEGARDES)
  await payload.destroy()
})

const modele = (slug: string) => (payload.db as MongooseAdapter).collections[slug]!
const collection = (slug: string) => modele(slug).collection
/** Le contenu exact d'une collection, types BSON compris (ObjectId, dates). */
const contenu = async (slug: string) => {
  const { EJSON } = modele('users').base.mongo.BSON
  const docs = await collection(slug).find({}).sort({ _id: 1 }).toArray()
  return EJSON.stringify(docs, { relaxed: false })
}

describe('sauvegarde de la base', () => {
  it('sauvegarde puis restaure à l’identique, ObjectId et dates compris', async () => {
    await duoForme(payload)
    const avant = { users: await contenu('users'), duos: await contenu('duos') }

    const { nom, collections } = await sauvegarder(payload, new Date('2026-10-08T03:30:00Z'))
    expect(nom).toBe('2026-10-08T03-30-00Z')
    expect(collections).toMatchObject({ users: 2, duos: 1 })
    expect(collections).not.toHaveProperty('payload-jobs')
    expect((await listerSauvegardes()).completes).toEqual([nom])

    await collection('users').deleteMany({})
    await collection('duos').deleteMany({})
    await collection('users').insertOne({ email: 'intrus@exemple.fr' })

    await restaurer(payload, nom, { remplacer: true })
    expect(await contenu('users')).toBe(avant.users)
    expect(await contenu('duos')).toBe(avant.duos)
  })

  it('refuse de restaurer dans une base qui a des données, sans --remplacer, sans rien écrire', async () => {
    await duoForme(payload)
    const { nom } = await sauvegarder(payload)
    const avant = await contenu('users')

    await expect(restaurer(payload, nom)).rejects.toThrow(/déjà des documents : .*users/)
    expect(await contenu('users')).toBe(avant)
  })

  it('refuse une sauvegarde incomplète (sans manifeste)', async () => {
    await deposerFichier(
      `${PREFIXE_SAUVEGARDES}2026-10-01T03-30-00Z/users.ndjson.gz`,
      new Uint8Array(),
      'application/gzip',
    )
    await expect(restaurer(payload, '2026-10-01T03-30-00Z')).rejects.toThrow(/incomplète/)
  })

  it('garde les 14 dernières sauvegardes complètes', async () => {
    const jour = (n: number) => new Date(Date.UTC(2026, 9, n, 3, 30))
    // Une sauvegarde interrompue, ancienne, et une autre plus récente que tout (en cours).
    await deposerFichier(
      `${PREFIXE_SAUVEGARDES}${nomSauvegarde(jour(1))}/users.ndjson.gz`,
      new Uint8Array(),
      'application/gzip',
    )
    await deposerFichier(
      `${PREFIXE_SAUVEGARDES}${nomSauvegarde(jour(30))}/users.ndjson.gz`,
      new Uint8Array(),
      'application/gzip',
    )

    for (let n = 2; n <= 17; n++) await sauvegarder(payload, jour(n))

    const { toutes, completes } = await listerSauvegardes()
    expect(completes).toHaveLength(14)
    expect(completes.at(-1)).toBe(nomSauvegarde(jour(4)))
    expect(toutes).not.toContain(nomSauvegarde(jour(1)))
    expect(toutes).toContain(nomSauvegarde(jour(30)))
    // Les dossiers supprimés le sont entièrement.
    expect(await listerCles(`${PREFIXE_SAUVEGARDES}${nomSauvegarde(jour(2))}/`)).toEqual([])
  })

  it('aucune URL signée ne mène au dossier des sauvegardes', async () => {
    const cle = `${PREFIXE_SAUVEGARDES}2026-10-08T03-30-00Z/users.ndjson.gz`
    await expect(urlLecture({ cle })).rejects.toThrow(/non signable/)
    await expect(urlTelechargement({ cle, nomFichier: 'x' })).rejects.toThrow(/non signable/)
    await expect(urlEnvoi({ cle, mime: 'image/jpeg', taille: 1 })).rejects.toThrow(/non signable/)
    await expect(urlLecture({ cle: 'medias/../sauvegardes/x' })).rejects.toThrow(/non signable/)
  })
})
