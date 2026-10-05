/** Limites validées pour l'étape 3 (appli et API les partagent). */
export const LIMITES = {
  titre: 60,
  texte: 2000,
  indice: 80,
  /** Largeur maximale des photos après redimensionnement, en pixels. */
  photoLargeur: 1600,
  photoOctets: 5 * 1024 * 1024,
  /** Vocal d'un mot : 3 minutes. */
  vocalSecondes: 180,
  /** ~1,5 Mo attendus à 64 kbit/s ; marge pour les débits variables. */
  vocalOctets: 4 * 1024 * 1024,
} as const

/** Types de fichiers acceptés par nature de média. */
export const MIMES = {
  photo: ['image/jpeg'],
  vocal: ['audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac'],
} as const
