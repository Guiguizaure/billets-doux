import { z } from 'zod'

import { VueDuo } from './duo'
import { HeureDecouverte } from './heure'

const Email = z.string().trim().toLowerCase().email('Adresse e-mail invalide.')

export const Inscription = z.object({
  prenom: z
    .string()
    .trim()
    .min(1, 'Indique ton prénom.')
    .max(40, 'Ton prénom doit faire 40 caractères au plus.'),
  email: Email,
  motDePasse: z
    .string()
    .min(8, 'Le mot de passe doit faire au moins 8 caractères.')
    .max(128, 'Le mot de passe doit faire 128 caractères au plus.'),
  fuseauHoraire: z.string().min(1),
})
export type Inscription = z.infer<typeof Inscription>

export const Connexion = z.object({
  email: Email,
  motDePasse: z.string().min(1, 'Indique ton mot de passe.'),
})
export type Connexion = z.infer<typeof Connexion>

/** Réponse d'inscription, de connexion et de rafraîchissement. */
export const Session = z.object({
  jeton: z.string(),
  /** Expiration du jeton, en secondes depuis l'epoch. */
  expire: z.number(),
})
export type Session = z.infer<typeof Session>

/** Les onglets qui ont chacun leur bulle de tutoriel, à la première visite. */
export const OngletTutoriel = z.enum(['pourMoi', 'pourToi', 'souvenirs', 'nousDeux'])
export type OngletTutoriel = z.infer<typeof OngletTutoriel>

export const MiseAJourCompte = z.object({
  heureDecouverte: HeureDecouverte.optional(),
  /** Mis à jour tout seul quand le fuseau du téléphone change (voyage, déménagement). */
  fuseauHoraire: z.string().min(1).optional(),
  reglages: z
    .object({ rappelDoux: z.boolean().optional(), indicesVisibles: z.boolean().optional() })
    .optional(),
  /** Tutoriel : cartes vues, une bulle d'onglet fermée, plus aucune bulle, ou tout revoir. */
  tutoriel: z
    .object({
      cartesVues: z.literal(true).optional(),
      bulleVue: OngletTutoriel.optional(),
      passer: z.literal(true).optional(),
      revoir: z.literal(true).optional(),
    })
    .optional(),
})
export type MiseAJourCompte = z.infer<typeof MiseAJourCompte>

export const Moi = z.object({
  utilisateur: z.object({
    id: z.string(),
    prenom: z.string(),
    email: z.string(),
    fuseauHoraire: z.string(),
    heureDecouverte: z.string(),
    /** L'heure a été confirmée (écran 1.3) : on ne le remontre plus. */
    heureConfirmee: z.boolean(),
    /** Compte du duo de démo (portfolio) : actions irréversibles désactivées. */
    demo: z.boolean().default(false),
    reglages: z
      .object({ rappelDoux: z.boolean(), indicesVisibles: z.boolean() })
      .default({ rappelDoux: true, indicesVisibles: true }),
    tutoriel: z
      .object({ cartesVues: z.boolean(), bullesVues: z.array(OngletTutoriel) })
      .default({ cartesVues: false, bullesVues: [] }),
  }),
  duo: VueDuo.nullable(),
})
export type Moi = z.infer<typeof Moi>
