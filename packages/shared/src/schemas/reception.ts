import { z } from 'zod'

import { Reaction, TypeMot } from '../enums'
import { LIMITES } from './limites'
import { VueMedia } from './mots'

/**
 * Une case du calendrier du destinataire. Tant qu'elle est scellée, elle ne livre que
 * sa date, son type, son indice (si le destinataire les affiche) et de quoi faire le compte
 * à rebours : jamais le texte, le titre ni un média (règle « verrouillage côté serveur »).
 */
export const CaseRecue = z.object({
  id: z.string(),
  jour: z.string(),
  unlockAt: z.string(),
  type: TypeMot,
  etat: z.enum(['scelle', 'a_ouvrir', 'ouvert']),
  indice: z.string().nullable(),
  ouvertLe: z.string().nullable(),
  ouvertAvecJoker: z.boolean(),
  reaction: Reaction.nullable(),
})
export type CaseRecue = z.infer<typeof CaseRecue>

/** Une lettre « Ouvre quand… » reçue : son titre est fait pour être lu avant. */
export const LettreRecue = z.object({
  id: z.string(),
  titre: z.string(),
  type: TypeMot,
  etat: z.enum(['scelle', 'ouvert']),
  ouvertLe: z.string().nullable(),
})
export type LettreRecue = z.infer<typeof LettreRecue>

/** Le calendrier « Pour moi » (écran 2.1). */
export const CalendrierDestinataire = z.object({
  expediteur: z.object({ prenom: z.string() }),
  /** Aujourd'hui chez le destinataire. */
  aujourdhui: z.string(),
  jokersRestants: z.number(),
  /** Mots à date, et mots « Dans la semaine » seulement une fois leur heure arrivée. */
  cases: z.array(CaseRecue),
  /** Mots « Dans la semaine » encore secrets : rien d'autre que leur nombre. */
  surprises: z.number(),
  lettres: z.array(LettreRecue),
})
export type CalendrierDestinataire = z.infer<typeof CalendrierDestinataire>

export const VueReponse = z.object({
  reaction: Reaction.nullable(),
  texte: z.string().nullable(),
  vocal: VueMedia.nullable(),
  envoyeeLe: z.string().nullable(),
})
export type VueReponse = z.infer<typeof VueReponse>

/** Un mot ouvert, lu par son destinataire (ou relu par son auteur). */
export const MotOuvert = z.object({
  id: z.string(),
  type: TypeMot,
  texte: z.string().nullable(),
  manuscrit: z.boolean(),
  photo: VueMedia.nullable(),
  vocal: VueMedia.nullable(),
  /** Jour d'ouverture (null pour une lettre « Ouvre quand… »). */
  jour: z.string().nullable(),
  titreOuvreQuand: z.string().nullable(),
  ouvertLe: z.string(),
  ouvertAvecJoker: z.boolean(),
  auteur: z.object({ prenom: z.string() }),
  destinataire: z.object({ prenom: z.string() }),
  /** Vrai quand c'est l'auteur qui relit son propre mot. */
  vuParAuteur: z.boolean(),
  reponse: VueReponse.nullable(),
})
export type MotOuvert = z.infer<typeof MotOuvert>

export const Ouverture = z.object({ joker: z.boolean().default(false) })

export const Reagir = z.object({ reaction: Reaction.nullable() })

export const Repondre = z.union([
  z.object({
    texte: z
      .string()
      .trim()
      .min(1, 'Écris quelques mots.')
      .max(LIMITES.reponseTexte, 'Un mot court : 140 signes au plus.'),
  }),
  z.object({ vocal: z.string().min(1) }),
])
export type Repondre = z.infer<typeof Repondre>
