import { z } from 'zod'

import { ModeMot, StatutMot, TypeMot } from '../enums'
import { LIMITES, MIMES } from './limites'

export const NatureMedia = z.enum(['photo', 'vocal'])
export type NatureMedia = z.infer<typeof NatureMedia>

/** Demande d'URL d'envoi : l'API vérifie le type, la taille et la durée annoncés. */
export const DemandeTeleversement = z.discriminatedUnion('nature', [
  z.object({
    nature: z.literal('photo'),
    mime: z.enum(MIMES.photo),
    taille: z
      .number()
      .int()
      .positive()
      .max(LIMITES.photoOctets, 'Photo trop lourde (5 Mo au plus).'),
  }),
  z.object({
    nature: z.literal('vocal'),
    mime: z.enum(MIMES.vocal),
    taille: z.number().int().positive().max(LIMITES.vocalOctets, 'Vocal trop lourd.'),
    duree: z
      .number()
      .positive()
      .max(LIMITES.vocalSecondes + 1, 'Un vocal dure 3 minutes au plus.'),
  }),
])
export type DemandeTeleversement = z.infer<typeof DemandeTeleversement>

/** Réponse : l'appli envoie le fichier directement au stockage, avec ces en-têtes exacts. */
export const Televersement = z.object({
  id: z.string(),
  url: z.string(),
  entetes: z.record(z.string(), z.string()),
})
export type Televersement = z.infer<typeof Televersement>

export const VueMedia = z.object({
  id: z.string(),
  nature: NatureMedia,
  mime: z.string(),
  taille: z.number(),
  duree: z.number().nullable(),
})
export type VueMedia = z.infer<typeof VueMedia>

/** URL de lecture signée, valable quelques minutes. */
export const LectureMedia = z.object({
  url: z.string(),
  expire: z.string(),
})
export type LectureMedia = z.infer<typeof LectureMedia>

const champsBrouillon = {
  type: TypeMot,
  titre: z
    .string()
    .trim()
    .max(LIMITES.titre, 'Titre trop long (60 caractères au plus).')
    .nullable(),
  texte: z.string().max(LIMITES.texte, 'Texte trop long (2 000 caractères au plus).').nullable(),
  indice: z
    .string()
    .trim()
    .max(LIMITES.indice, 'Indice trop long (80 caractères au plus).')
    .nullable(),
  manuscrit: z.boolean(),
  photo: z.string().nullable(),
  vocal: z.string().nullable(),
}

/** Un mot sans texte, sans photo et sans vocal n'est jamais enregistré. */
export function estVide(mot: {
  texte?: string | null
  photo?: string | null
  vocal?: string | null
}) {
  return !mot.texte?.trim() && !mot.photo && !mot.vocal
}

export const NouveauBrouillon = z
  .object({
    ...champsBrouillon,
    titre: champsBrouillon.titre.default(null),
    texte: champsBrouillon.texte.default(null),
    indice: champsBrouillon.indice.default(null),
    manuscrit: champsBrouillon.manuscrit.default(true),
    photo: champsBrouillon.photo.default(null),
    vocal: champsBrouillon.vocal.default(null),
  })
  .refine((mot) => !estVide(mot), { message: 'Un mot vide n’est pas enregistré.' })
export type NouveauBrouillon = z.input<typeof NouveauBrouillon>

/** Modification partielle d'un brouillon (enregistrement automatique). */
export const ModificationBrouillon = z.object(champsBrouillon).partial()
export type ModificationBrouillon = z.infer<typeof ModificationBrouillon>

/** Un mot vu par son auteur (la réserve, l'écran d'écriture). */
export const VueMotAuteur = z.object({
  id: z.string(),
  type: TypeMot,
  titre: z.string().nullable(),
  texte: z.string().nullable(),
  indice: z.string().nullable(),
  manuscrit: z.boolean(),
  photo: VueMedia.nullable(),
  vocal: VueMedia.nullable(),
  mode: ModeMot,
  statut: StatutMot,
  creeLe: z.string(),
  modifieLe: z.string(),
})
export type VueMotAuteur = z.infer<typeof VueMotAuteur>

export const Reserve = z.object({ mots: z.array(VueMotAuteur) })
export type Reserve = z.infer<typeof Reserve>

export const Suppression = z.object({ supprime: z.literal(true) })
