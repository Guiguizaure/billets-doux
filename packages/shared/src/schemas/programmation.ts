import { z } from 'zod'

import { estJourValide } from '../dates'
import { Rythme } from '../enums'
import { VueMotAuteur } from './mots'
import { VueReponse } from './reception'

export const TITRE_OUVRE_QUAND_MAX = 60

/** Suggestions de titres « Ouvre quand… » (texte libre aussi). */
export const SUGGESTIONS_OUVRE_QUAND = [
  '… tu n’arrives pas à dormir',
  '… je te manque',
  '… ta journée a été nulle',
  '… tu as besoin de courage',
] as const

const Jour = z.string().refine(estJourValide, 'Date invalide.')

/** Comment l'auteur programme un mot (écran 3.5). */
export const Programmation = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('date'), jour: Jour }),
  z.object({ mode: z.literal('semaine_hasard') }),
  z.object({
    mode: z.literal('ouvre_quand'),
    titre: z
      .string()
      .trim()
      .min(1, 'Écris le début de la phrase « Ouvre quand… ».')
      .max(TITRE_OUVRE_QUAND_MAX, 'Titre trop long (60 caractères au plus).'),
  }),
])
export type Programmation = z.infer<typeof Programmation>

/**
 * Ce que l'auteur voit de la programmation d'un mot. Pour « Dans la semaine »,
 * jamais le jour tiré ni l'instant d'ouverture : seulement la fenêtre de 7 jours.
 */
export const VueProgrammation = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('date'), jour: z.string(), unlockAt: z.string() }),
  z.object({ mode: z.literal('semaine_hasard'), debut: z.string(), fin: z.string() }),
  z.object({ mode: z.literal('ouvre_quand'), titre: z.string() }),
])
export type VueProgrammation = z.infer<typeof VueProgrammation>

export const MotProgramme = VueMotAuteur.extend({
  programmation: VueProgrammation,
  /** Ouvert par le destinataire : quand (et, une fois ouvert, le jour n'est plus secret). */
  ouvertLe: z.string().nullable(),
  ouvertAvecJoker: z.boolean().default(false),
  /** La réaction et la réponse du destinataire, une fois le mot ouvert. */
  reponse: VueReponse.nullable().default(null),
})
export type MotProgramme = z.infer<typeof MotProgramme>

/** Le calendrier « Pour Lina » (écran 3.1), vu par l'auteur. */
export const CalendrierAuteur = z.object({
  rythme: Rythme,
  destinataire: z.object({
    prenom: z.string(),
    heureDecouverte: z.string(),
    fuseauHoraire: z.string(),
  }),
  /** Aujourd'hui chez le destinataire : c'est son calendrier à lui. */
  aujourdhui: z.string(),
  /** Premier jour encore programmable (aujourd'hui si son heure n'est pas passée). */
  premierJour: z.string(),
  dernierJour: z.string(),
  mots: z.array(MotProgramme),
  brouillons: z.number(),
})
export type CalendrierAuteur = z.infer<typeof CalendrierAuteur>

export const ChangementRythme = z.object({ rythme: Rythme })
