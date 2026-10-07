import { gunzipSync, gzipSync } from 'node:zlib'

import type { MongooseAdapter } from '@payloadcms/db-mongodb'
import type { Payload } from 'payload'

import {
  decrire,
  deposerFichier,
  lireFichier,
  listerCles,
  listerDossiers,
  PREFIXE_SAUVEGARDES,
  supprimerPrefixe,
} from '@/lib/stockage'

/**
 * Sauvegarde de la base, chaque nuit, dans le dossier privé `sauvegardes/` du bucket : la
 * formule gratuite d'Atlas n'en fait pas. Une sauvegarde = un dossier daté, un fichier par
 * collection (JSON étendu, une ligne par document, compressé : les ObjectId et les dates
 * reviennent à l'identique), puis `manifeste.json`, écrit en dernier. Sans manifeste, une
 * sauvegarde est incomplète : elle n'est ni comptée ni restaurée.
 * Les médias ne sont pas copiés : ils sont déjà dans le bucket, et une suppression de compte
 * doit les effacer pour de bon.
 */

export const SAUVEGARDES_GARDEES = 14

/** Collections internes de Payload, recréées au besoin : pas sauvegardées. */
const IGNOREES = new Set([
  'payload-jobs',
  'payload-locked-documents',
  'payload-preferences',
  'payload-migrations',
])

type Manifeste = { date: string; collections: Record<string, number> }

/** « 2026-10-08T03-30-00Z » : trié par ordre alphabétique = trié par date. */
export const nomSauvegarde = (date: Date) =>
  date
    .toISOString()
    .replace(/\.\d+Z$/, 'Z')
    .replace(/:/g, '-')

const dossier = (nom: string) => `${PREFIXE_SAUVEGARDES}${nom}/`

function mongo(payload: Payload) {
  const { collections } = payload.db as MongooseAdapter
  const premier = Object.values(collections)[0]
  if (!premier) throw new Error('aucune collection : Payload n’est pas initialisé.')
  // Le JSON étendu du pilote Mongo, par l'instance Mongoose des modèles.
  return { collections, EJSON: premier.base.mongo.BSON.EJSON }
}

export const collectionsSauvegardees = (payload: Payload) =>
  payload.config.collections.map((c) => c.slug).filter((slug) => !IGNOREES.has(slug))

/** Sauvegarde toute la base, puis ne garde que les 14 dernières sauvegardes complètes. */
export async function sauvegarder(payload: Payload, maintenant = new Date()) {
  const { collections, EJSON } = mongo(payload)
  const nom = nomSauvegarde(maintenant)
  const comptes: Record<string, number> = {}
  for (const slug of collectionsSauvegardees(payload)) {
    const modele = collections[slug]
    if (!modele) continue
    const documents = await modele.collection.find({}).toArray()
    const lignes = documents.map((d) => EJSON.stringify(d, { relaxed: false })).join('\n')
    await deposerFichier(
      `${dossier(nom)}${slug}.ndjson.gz`,
      gzipSync(Buffer.from(lignes, 'utf8')),
      'application/gzip',
    )
    comptes[slug] = documents.length
  }
  const manifeste: Manifeste = { date: maintenant.toISOString(), collections: comptes }
  await deposerFichier(
    `${dossier(nom)}manifeste.json`,
    Buffer.from(JSON.stringify(manifeste, null, 2), 'utf8'),
    'application/json',
  )
  const supprimees = await elaguer()
  return { nom, collections: comptes, supprimees }
}

/**
 * Les sauvegardes, de la plus récente à la plus ancienne : `toutes` (dossiers non vides, même
 * interrompus) et `completes` (avec manifeste). Un dossier vidé peut rester listé par certains
 * stockages (SeaweedFS) : il ne compte pas.
 */
export async function listerSauvegardes() {
  const noms = (await listerDossiers(PREFIXE_SAUVEGARDES))
    .map((d) => d.slice(PREFIXE_SAUVEGARDES.length, -1))
    .sort()
    .reverse()
  const toutes: string[] = []
  const completes: string[] = []
  for (const nom of noms) {
    const cles = await listerCles(dossier(nom))
    if (cles.length === 0) continue
    toutes.push(nom)
    if (cles.includes(`${dossier(nom)}manifeste.json`)) completes.push(nom)
  }
  return { toutes, completes }
}

/**
 * Garde les 14 dernières sauvegardes complètes. Tout dossier plus ancien que la 14e est
 * supprimé, y compris une sauvegarde interrompue ; une sauvegarde en cours (plus récente) reste.
 */
export async function elaguer(garder = SAUVEGARDES_GARDEES) {
  const { toutes, completes } = await listerSauvegardes()
  const limite = completes[garder - 1]
  if (!limite) return []
  const aSupprimer = toutes.filter((nom) => nom < limite)
  for (const nom of aSupprimer) await supprimerPrefixe(dossier(nom))
  return aSupprimer
}

export async function lireManifeste(nom: string): Promise<Manifeste> {
  if (!(await decrire(`${dossier(nom)}manifeste.json`))) {
    throw new Error(`la sauvegarde « ${nom} » n'existe pas ou est incomplète (pas de manifeste).`)
  }
  const octets = await lireFichier(`${dossier(nom)}manifeste.json`)
  return JSON.parse(Buffer.from(octets).toString('utf8')) as Manifeste
}

/**
 * Remet la base dans l'état de la sauvegarde `nom`. Refuse d'écrire dans des collections qui
 * ont déjà des documents, sauf avec `remplacer` (elles sont alors vidées avant). Rien n'est
 * écrit tant que tout n'est pas vérifié.
 */
export async function restaurer(payload: Payload, nom: string, { remplacer = false } = {}) {
  const { collections, EJSON } = mongo(payload)
  const manifeste = await lireManifeste(nom)
  const slugs = Object.keys(manifeste.collections)

  const inconnues = slugs.filter((slug) => !collections[slug])
  if (inconnues.length > 0) {
    throw new Error(`collections inconnues de cette version de l'API : ${inconnues.join(', ')}.`)
  }
  if (!remplacer) {
    const occupees: string[] = []
    for (const slug of slugs) {
      if ((await collections[slug]!.collection.estimatedDocumentCount()) > 0) occupees.push(slug)
    }
    if (occupees.length > 0) {
      throw new Error(
        `ces collections ont déjà des documents : ${occupees.join(', ')}. ` +
          'Ajoute --remplacer pour les vider avant de restaurer.',
      )
    }
  }

  // Tout est lu et décodé avant la première écriture.
  const contenus = new Map<string, Record<string, unknown>[]>()
  for (const slug of slugs) {
    const octets = await lireFichier(`${dossier(nom)}${slug}.ndjson.gz`)
    const texte = gunzipSync(Buffer.from(octets)).toString('utf8')
    const documents = texte
      ? texte.split('\n').map((ligne) => EJSON.parse(ligne, { relaxed: false }))
      : []
    if (documents.length !== manifeste.collections[slug]) {
      throw new Error(
        `« ${slug} » : ${documents.length} documents au lieu de ${manifeste.collections[slug]}.`,
      )
    }
    contenus.set(slug, documents as Record<string, unknown>[])
  }

  const restaures: Record<string, number> = {}
  for (const [slug, documents] of contenus) {
    const collection = collections[slug]!.collection
    if (remplacer) await collection.deleteMany({})
    if (documents.length > 0) await collection.insertMany(documents)
    restaures[slug] = documents.length
  }
  return restaures
}
