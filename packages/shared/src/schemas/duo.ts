import { z } from 'zod'

import { DuoStatut } from '../enums'

/**
 * Code d'invitation : un mot puis quatre chiffres (« LUNE · 4821 »).
 * Stocké et comparé sous forme normalisée : « LUNE4821 ».
 */
export const FORMAT_CODE = /^[A-Z]{3,10}\d{4}$/

/** Majuscules, sans accents, sans espaces ni ponctuation : « lune · 4821 » → « LUNE4821 ». */
export function normaliserCode(saisie: string) {
  return saisie
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

/** « LUNE4821 » → « LUNE · 4821 », avec des espaces insécables pour ne jamais couper le code. */
export function formaterCode(code: string) {
  const m = /^([A-Z]+)(\d+)$/.exec(code)
  return m ? `${m[1]}\u00a0·\u00a0${m[2]}` : code
}

export const RejoindreDuo = z.object({
  code: z
    .string()
    .transform(normaliserCode)
    .pipe(z.string().regex(FORMAT_CODE, 'Ce code ne ressemble pas à un code d’invitation.')),
})
export type RejoindreDuo = z.infer<typeof RejoindreDuo>

/** Ce que l'appli voit du duo : jamais plus que le prénom de l'autre. */
export const VueDuo = z.object({
  id: z.string(),
  statut: DuoStatut,
  /** Présent seulement pour la personne qui invite, tant que le duo attend. */
  invitation: z
    .object({
      code: z.string(),
      expireLe: z.string(),
      lien: z.string(),
    })
    .nullable(),
  partenaire: z.object({ prenom: z.string() }).nullable(),
})
export type VueDuo = z.infer<typeof VueDuo>
