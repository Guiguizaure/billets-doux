import { z } from 'zod'

import { TypeMot } from '../enums'
import { estJourValide } from '../dates'

/** Jour des retrouvailles, ou null pour l'effacer. */
export const Retrouvailles = z.object({
  jour: z.string().refine(estJourValide, 'Date invalide.').nullable(),
})
export type Retrouvailles = z.infer<typeof Retrouvailles>

/** Écran 5.1 « Nous deux ». */
export const VueNousDeux = z.object({
  moi: z.object({ prenom: z.string() }),
  partenaire: z.object({ prenom: z.string() }),
  /** Jour où le duo s'est formé. */
  depuis: z.string().nullable(),
  /** Mots ouverts entre nous, dans les deux sens. */
  motsEchanges: z.number(),
  pause: z.object({ parMoi: z.boolean(), prenom: z.string(), depuis: z.string() }).nullable(),
  retrouvailles: z.string().nullable(),
  heureDecouverte: z.string(),
  reglages: z.object({ rappelDoux: z.boolean(), indicesVisibles: z.boolean() }),
  jokersRestants: z.number(),
  /** Mots programmés pour l'autre et pas encore ouverts (avertissement de 5.2). */
  motsPrevus: z.number(),
})
export type VueNousDeux = z.infer<typeof VueNousDeux>

/** Une carte de la mosaïque des souvenirs (4.2). */
export const CarteSouvenir = z.object({
  id: z.string(),
  type: TypeMot,
  /** Début du texte (le mot entier se lit en touchant la carte). */
  extrait: z.string().nullable(),
  manuscrit: z.boolean(),
  photo: z.string().nullable(),
  vocal: z.object({ id: z.string(), duree: z.number() }).nullable(),
  /** « moi » : écrit par moi ; sinon le prénom de l'auteur. */
  de: z.string(),
  deMoi: z.boolean(),
  /** Ouverture (ou création, pour un mot jamais envoyé). */
  le: z.string(),
  titreOuvreQuand: z.string().nullable(),
})
export type CarteSouvenir = z.infer<typeof CarteSouvenir>

export const Souvenirs = z.object({
  /** Premier mot ouvert, pour « 43 mots depuis le 2 septembre ». */
  depuis: z.string().nullable(),
  mots: z.array(CarteSouvenir),
  /** « Ce jour-là » : un mot ouvert il y a une semaine, un mois, six mois ou un an. */
  ceJourLa: z.object({ motId: z.string(), phrase: z.string(), type: TypeMot }).nullable(),
  /** Mes brouillons et mots programmés d'un duo fermé, jamais envoyés. */
  jamaisEnvoyes: z.array(CarteSouvenir),
})
export type Souvenirs = z.infer<typeof Souvenirs>

/** L'archive des souvenirs : une URL signée, valable quelques minutes. */
export const Export = z.object({ url: z.string(), expire: z.string(), mots: z.number() })
export type Export = z.infer<typeof Export>

export const SuppressionCompte = z.object({
  motDePasse: z.string().min(1, 'Indique ton mot de passe.'),
})
export type SuppressionCompte = z.infer<typeof SuppressionCompte>
