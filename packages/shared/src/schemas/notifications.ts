import { z } from 'zod'

/** Jeton Expo Push d'un appareil (« ExponentPushToken[…] »). */
export const JetonPush = z
  .string()
  .regex(/^Expo(nent)?PushToken\[[^\]]+\]$/, 'Jeton de notification invalide.')

export const Appareil = z.object({
  jeton: JetonPush,
  plateforme: z.enum(['android', 'ios']),
})
export type Appareil = z.infer<typeof Appareil>

export const RetraitAppareil = z.object({ jeton: JetonPush })

/**
 * Données portées par une notification : seulement l'écran à ouvrir au toucher,
 * jamais le contenu d'un mot.
 */
export const DonneesNotification = z.object({
  lien: z.enum(['/', '/pour-moi', '/pour-toi']).or(z.string().regex(/^\/mot\/[a-f0-9]{24}$/)),
  /** Mots du jour : relance le rituel même si l'appli était déjà ouverte. */
  rituel: z.boolean().optional(),
})
export type DonneesNotification = z.infer<typeof DonneesNotification>

/** « Un mot de Lina t'attend », « 2 mots de Lina t'attendent ». */
export function titreMotsOuvrables(expediteur: string, nombre: number) {
  return nombre > 1
    ? `${nombre} mots de ${expediteur} t’attendent`
    : `Un mot de ${expediteur} t’attend`
}
