import {
  estVide,
  type ModificationBrouillon,
  type NouveauBrouillon,
  type Reserve,
  type VueMotAuteur,
} from '@billets-doux/shared'
import type { Media, Mot } from '@billets-doux/shared/payload-types'
import type { PayloadRequest } from 'payload'

import { ErreurMetier } from '@/lib/erreurs'
import { idDe } from '@/lib/ids'

import { duoCourant } from './duoCourant'
import { mediaDuProprietaire, vueMedia } from './medias'

const INTROUVABLE = 'Mot introuvable.'

/** La réserve « quand j'y pense » : les brouillons de l'auteur, du plus récent au plus ancien. */
export async function reserve(req: PayloadRequest, userId: string): Promise<Reserve> {
  const { docs } = await req.payload.find({
    collection: 'mots',
    where: { and: [{ auteur: { equals: userId } }, { statut: { equals: 'brouillon' } }] },
    sort: '-updatedAt',
    depth: 1,
    limit: 500,
    req,
  })
  return { mots: docs.map(vueMot) }
}

export async function creerBrouillon(
  req: PayloadRequest,
  userId: string,
  donnees: Required<NouveauBrouillon>,
): Promise<VueMotAuteur> {
  const { duo, partenaireId } = await duoCourant(req, userId)
  if (estVide(donnees)) throw new ErreurMetier(400, 'Un mot vide n’est pas enregistré.')
  await verifierMedias(req, userId, donnees, null)
  const mot = await req.payload.create({
    collection: 'mots',
    data: {
      duo: duo.id,
      auteur: userId,
      destinataire: partenaireId,
      type: donnees.type,
      titre: donnees.titre,
      texte: donnees.texte,
      indice: donnees.indice,
      manuscrit: donnees.manuscrit,
      photo: donnees.photo,
      vocal: donnees.vocal,
      mode: 'brouillon',
      statut: 'brouillon',
    },
    req,
  })
  return relire(req, mot.id)
}

/** Enregistrement automatique : seuls les champs envoyés changent. */
export async function modifierBrouillon(
  req: PayloadRequest,
  userId: string,
  id: string,
  modification: ModificationBrouillon,
): Promise<VueMotAuteur> {
  const mot = await brouillonDeLAuteur(req, userId, id)
  const avant = { photo: idDe(mot.photo), vocal: idDe(mot.vocal) }
  const apres = {
    texte: modification.texte !== undefined ? modification.texte : (mot.texte ?? null),
    photo: modification.photo !== undefined ? modification.photo : avant.photo,
    vocal: modification.vocal !== undefined ? modification.vocal : avant.vocal,
  }
  if (estVide(apres)) throw new ErreurMetier(400, 'Un mot vide n’est pas enregistré.')
  await verifierMedias(req, userId, apres, id)

  await req.payload.update({ collection: 'mots', id, data: modification, req })

  // Une photo ou un vocal remplacé (ou retiré) est supprimé, fichier compris.
  for (const nature of ['photo', 'vocal'] as const) {
    const ancien = avant[nature]
    if (ancien && ancien !== apres[nature]) {
      await req.payload.delete({ collection: 'medias', id: ancien, req })
    }
  }
  return relire(req, id)
}

export async function supprimerBrouillon(req: PayloadRequest, userId: string, id: string) {
  await brouillonDeLAuteur(req, userId, id)
  // Le hook afterDelete de la collection supprime aussi la photo et le vocal.
  await req.payload.delete({ collection: 'mots', id, req })
}

async function brouillonDeLAuteur(req: PayloadRequest, userId: string, id: string) {
  const mot = await req.payload
    .findByID({ collection: 'mots', id, depth: 0, req })
    .catch(() => null)
  if (!mot || idDe(mot.auteur) !== userId) throw new ErreurMetier(404, INTROUVABLE)
  if (mot.statut !== 'brouillon') {
    throw new ErreurMetier(409, 'Ce mot n’est plus un brouillon.')
  }
  return mot
}

/**
 * Une photo et un vocal joints doivent appartenir à l'auteur, être arrivés dans le stockage,
 * être de la bonne nature et ne servir à aucun autre mot.
 */
async function verifierMedias(
  req: PayloadRequest,
  userId: string,
  mot: { photo?: string | null; vocal?: string | null },
  motId: string | null,
) {
  for (const nature of ['photo', 'vocal'] as const) {
    const id = mot[nature]
    if (!id) continue
    const media = await mediaDuProprietaire(req, userId, id)
    if (media.nature !== nature || media.statut !== 'pret') {
      throw new ErreurMetier(400, nature === 'photo' ? 'Photo invalide.' : 'Vocal invalide.')
    }
    const { totalDocs } = await req.payload.count({
      collection: 'mots',
      where: {
        and: [
          { or: [{ photo: { equals: id } }, { vocal: { equals: id } }] },
          ...(motId ? [{ id: { not_equals: motId } }] : []),
        ],
      },
      req,
    })
    if (totalDocs > 0) throw new ErreurMetier(400, 'Ce média appartient déjà à un autre mot.')
  }
}

async function relire(req: PayloadRequest, id: string) {
  return vueMot(await req.payload.findByID({ collection: 'mots', id, depth: 1, req }))
}

function vueMot(mot: Mot): VueMotAuteur {
  const media = (valeur: Mot['photo']) =>
    valeur && typeof valeur === 'object' ? vueMedia(valeur as Media) : null
  return {
    id: mot.id,
    type: mot.type,
    titre: mot.titre ?? null,
    texte: mot.texte ?? null,
    indice: mot.indice ?? null,
    manuscrit: mot.manuscrit ?? true,
    photo: media(mot.photo),
    vocal: media(mot.vocal),
    mode: mot.mode,
    statut: mot.statut,
    creeLe: mot.createdAt,
    modifieLe: mot.updatedAt,
  }
}
