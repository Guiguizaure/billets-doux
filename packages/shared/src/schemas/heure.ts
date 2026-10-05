import { z } from 'zod'

/** Heure locale au format 24 h « HH:MM ». */
export const HeureDecouverte = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Heure invalide (format attendu : HH:MM).')
export type HeureDecouverte = z.infer<typeof HeureDecouverte>

/** Heures proposées à l'écran 1.3 ; l'heure libre viendra avec les réglages. */
export const HEURES_PROPOSEES = ['07:30', '08:00', '12:00', '21:00'] as const

export const HEURE_PAR_DEFAUT = '08:00'

/** « 07:30 » → « 7 h 30 », « 08:00 » → « 8 h ». */
export function formaterHeure(heure: string) {
  const [h, m] = heure.split(':')
  return m === '00' ? `${Number(h)} h` : `${Number(h)} h ${m}`
}
