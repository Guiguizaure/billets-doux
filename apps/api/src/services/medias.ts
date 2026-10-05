import { randomUUID } from 'node:crypto'

import type { DemandeTeleversement, VueMedia } from '@billets-doux/shared'
import type { Media } from '@billets-doux/shared/payload-types'
import type { PayloadRequest } from 'payload'

import { ErreurMetier } from '@/lib/erreurs'
import { idDe } from '@/lib/ids'
import { decrire, supprimer, urlEnvoi, urlLecture } from '@/lib/stockage'

import { duoCourant } from './duoCourant'

const INTROUVABLE = 'Média introuvable.'

export function vueMedia(media: Media): VueMedia {
  return {
    id: media.id,
    nature: media.nature,
    mime: media.mime,
    taille: media.taille,
    duree: media.duree ?? null,
  }
}

/** Réserve une fiche « en attente » et renvoie l'URL signée pour envoyer le fichier. */
export async function demanderTeleversement(
  req: PayloadRequest,
  userId: string,
  demande: DemandeTeleversement,
  hote: string | null,
) {
  const { duo } = await duoCourant(req, userId)
  const extension = demande.nature === 'photo' ? 'jpg' : 'm4a'
  const cle = `duos/${duo.id}/${demande.nature}s/${randomUUID()}.${extension}`
  const media = await req.payload.create({
    collection: 'medias',
    data: {
      proprietaire: userId,
      duo: duo.id,
      nature: demande.nature,
      cle,
      mime: demande.mime,
      taille: demande.taille,
      duree: demande.nature === 'vocal' ? demande.duree : null,
      statut: 'en_attente',
    },
    req,
  })
  const envoi = await urlEnvoi({ cle, mime: demande.mime, taille: demande.taille, hote })
  return { id: media.id, url: envoi.url, entetes: envoi.entetes }
}

/** Le fichier est-il bien arrivé, à la taille et au type annoncés ? */
export async function confirmer(req: PayloadRequest, userId: string, id: string) {
  const media = await mediaDuProprietaire(req, userId, id)
  if (media.statut === 'pret') return vueMedia(media)

  const objet = await decrire(media.cle)
  if (!objet) throw new ErreurMetier(409, 'Le fichier n’est pas encore arrivé. Réessaie.')
  if (objet.taille !== media.taille || objet.mime !== media.mime) {
    await supprimer(media.cle)
    throw new ErreurMetier(422, 'Le fichier reçu ne correspond pas à celui annoncé.')
  }
  const pret = await req.payload.update({
    collection: 'medias',
    id,
    data: { statut: 'pret' },
    req,
  })
  return vueMedia(pret)
}

/**
 * URL de lecture de quelques minutes, seulement pour qui a le droit de voir le média :
 * son propriétaire, ou le destinataire d'un mot déjà ouvert qui le contient (étape 5).
 * Sinon 404, pour ne rien révéler.
 */
export async function lecture(
  req: PayloadRequest,
  userId: string,
  id: string,
  hote: string | null,
) {
  const media = await req.payload
    .findByID({ collection: 'medias', id, depth: 0, req })
    .catch(() => null)
  if (!media || media.statut !== 'pret' || !(await peutLire(req, userId, media))) {
    throw new ErreurMetier(404, INTROUVABLE)
  }
  return urlLecture({ cle: media.cle, hote })
}

async function peutLire(req: PayloadRequest, userId: string, media: Media) {
  if (idDe(media.proprietaire) === userId) return true
  const { totalDocs } = await req.payload.count({
    collection: 'mots',
    where: {
      and: [
        { destinataire: { equals: userId } },
        { statut: { equals: 'ouvert' } },
        { or: [{ photo: { equals: media.id } }, { vocal: { equals: media.id } }] },
      ],
    },
    req,
  })
  return totalDocs > 0
}

export async function mediaDuProprietaire(req: PayloadRequest, userId: string, id: string) {
  const media = await req.payload
    .findByID({ collection: 'medias', id, depth: 0, req })
    .catch(() => null)
  if (!media || idDe(media.proprietaire) !== userId) throw new ErreurMetier(404, INTROUVABLE)
  return media
}
