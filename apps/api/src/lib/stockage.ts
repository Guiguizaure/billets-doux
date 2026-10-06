import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutBucketCorsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

/**
 * Seul module qui parle au stockage des médias : SeaweedFS en développement,
 * Cloudflare R2 en production (API S3 dans les deux cas). Le bucket est privé :
 * l'appli n'y accède que par des URL signées de courte durée (règle 3 du brief).
 * Sans import d'alias : utilisé aussi par scripts/preparer-stockage.ts.
 */

const DUREE_ENVOI_S = 10 * 60
const DUREE_LECTURE_S = 5 * 60

function config() {
  const lire = (nom: string) => {
    const valeur = process.env[nom]
    if (!valeur) throw new Error(`Variable d’environnement manquante : ${nom}`)
    return valeur
  }
  return {
    endpoint: lire('S3_ENDPOINT'),
    endpointPublic: process.env.S3_PUBLIC_ENDPOINT || null,
    region: process.env.S3_REGION || 'auto',
    bucket: lire('S3_BUCKET'),
    accessKeyId: lire('S3_ACCESS_KEY_ID'),
    secretAccessKey: lire('S3_SECRET_ACCESS_KEY'),
  }
}

const clients = new Map<string, S3Client>()

function client(endpoint: string) {
  let existant = clients.get(endpoint)
  if (!existant) {
    const c = config()
    existant = new S3Client({
      endpoint,
      region: c.region,
      forcePathStyle: true,
      credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey },
      // Les sommes de contrôle ajoutées d'office par le SDK cassent les URL signées
      // sur les services compatibles S3 (SeaweedFS, R2) : seulement si l'API les exige.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    })
    clients.set(endpoint, existant)
  }
  return existant
}

/**
 * Adresse du stockage vue par l'appareil qui fera l'envoi ou la lecture : la signature
 * inclut l'hôte. `S3_PUBLIC_ENDPOINT` en production ; en développement, le stockage local
 * est joint par la même adresse que l'API (l'IP du Mac pour le téléphone).
 */
export function endpointPublic(hoteRequete?: string | null) {
  const c = config()
  if (c.endpointPublic) return c.endpointPublic
  const url = new URL(c.endpoint)
  if (hoteRequete && ['localhost', '127.0.0.1'].includes(url.hostname)) {
    url.hostname = hoteRequete.replace(/:\d+$/, '')
  }
  return url.origin
}

/** URL d'envoi : le type et la taille exacts font partie de la signature. */
export async function urlEnvoi(options: {
  cle: string
  mime: string
  taille: number
  hote?: string | null
}) {
  const { bucket } = config()
  const url = await getSignedUrl(
    client(endpointPublic(options.hote)),
    new PutObjectCommand({
      Bucket: bucket,
      Key: options.cle,
      ContentType: options.mime,
      ContentLength: options.taille,
    }),
    { expiresIn: DUREE_ENVOI_S, signableHeaders: new Set(['content-type', 'content-length']) },
  )
  return { url, entetes: { 'Content-Type': options.mime } }
}

/** URL de lecture valable quelques minutes. */
export async function urlLecture(options: { cle: string; hote?: string | null }) {
  const { bucket } = config()
  const url = await getSignedUrl(
    client(endpointPublic(options.hote)),
    new GetObjectCommand({ Bucket: bucket, Key: options.cle }),
    { expiresIn: DUREE_LECTURE_S },
  )
  return { url, expire: new Date(Date.now() + DUREE_LECTURE_S * 1000).toISOString() }
}

/** Taille et type de l'objet stocké, ou null s'il n'existe pas. */
export async function decrire(cle: string) {
  const c = config()
  try {
    const tete = await client(c.endpoint).send(
      new HeadObjectCommand({ Bucket: c.bucket, Key: cle }),
    )
    return { taille: tete.ContentLength ?? 0, mime: tete.ContentType ?? '' }
  } catch (e) {
    if ((e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) {
      return null
    }
    throw e
  }
}

export async function supprimer(cle: string) {
  const c = config()
  await client(c.endpoint).send(new DeleteObjectCommand({ Bucket: c.bucket, Key: cle }))
}

/** Le contenu d'un fichier (pour l'export des souvenirs). */
export async function lireFichier(cle: string) {
  const c = config()
  const reponse = await client(c.endpoint).send(
    new GetObjectCommand({ Bucket: c.bucket, Key: cle }),
  )
  if (!reponse.Body) throw new Error(`Fichier vide : ${cle}`)
  return reponse.Body.transformToByteArray()
}

/** Dépose un fichier fabriqué par l'API (archive d'export). */
export async function deposerFichier(cle: string, octets: Uint8Array, mime: string) {
  const c = config()
  await client(c.endpoint).send(
    new PutObjectCommand({ Bucket: c.bucket, Key: cle, Body: octets, ContentType: mime }),
  )
}

/** URL signée qui télécharge le fichier sous `nomFichier` (au lieu de l'afficher). */
export async function urlTelechargement(options: {
  cle: string
  nomFichier: string
  hote?: string | null
}) {
  const { bucket } = config()
  const url = await getSignedUrl(
    client(endpointPublic(options.hote)),
    new GetObjectCommand({
      Bucket: bucket,
      Key: options.cle,
      ResponseContentDisposition: `attachment; filename="${options.nomFichier}"`,
    }),
    { expiresIn: DUREE_LECTURE_S * 2 },
  )
  return { url, expire: new Date(Date.now() + DUREE_LECTURE_S * 2000).toISOString() }
}

/** Supprime tous les fichiers sous un préfixe (« exports/<compte>/ »). */
export async function supprimerPrefixe(prefixe: string) {
  const c = config()
  const { Contents } = await client(c.endpoint).send(
    new ListObjectsV2Command({ Bucket: c.bucket, Prefix: prefixe }),
  )
  for (const objet of Contents ?? []) {
    if (objet.Key) await supprimer(objet.Key)
  }
}

/** Crée le bucket s'il manque et autorise les envois depuis la version web (CORS). */
export async function preparerBucket(origines: string[]) {
  const c = config()
  const s3 = client(c.endpoint)
  try {
    await s3.send(new HeadBucketCommand({ Bucket: c.bucket }))
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: c.bucket }))
  }
  if (origines.length > 0) {
    await s3.send(
      new PutBucketCorsCommand({
        Bucket: c.bucket,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedOrigins: origines,
              AllowedMethods: ['GET', 'PUT', 'HEAD'],
              AllowedHeaders: ['*'],
              ExposeHeaders: ['ETag'],
              MaxAgeSeconds: 3600,
            },
          ],
        },
      }),
    )
  }
  return c.bucket
}
