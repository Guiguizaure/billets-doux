import { z } from 'zod'

/** Statut d'un duo. */
export const DuoStatut = z.enum(['invitation', 'actif', 'pause', 'ferme'])
export type DuoStatut = z.infer<typeof DuoStatut>

/** Rythme du calendrier d'un auteur : détermine les cases affichées. */
export const Rythme = z.enum(['jour', 'semaine', 'mois'])
export type Rythme = z.infer<typeof Rythme>

/** Contenus d'un mot ; un mot peut en combiner plusieurs. */
export const TypeMot = z.enum(['mot', 'poeme', 'photo', 'vocal'])
export type TypeMot = z.infer<typeof TypeMot>

/** Manière dont un mot est programmé. */
export const ModeMot = z.enum(['date', 'semaine_hasard', 'ouvre_quand', 'brouillon'])
export type ModeMot = z.infer<typeof ModeMot>

/** Cycle de vie d'un mot. */
export const StatutMot = z.enum(['brouillon', 'programme', 'ouvert'])
export type StatutMot = z.infer<typeof StatutMot>

/** Réactions possibles à un mot ouvert. */
export const Reaction = z.enum(['coeur', 'lune', 'etoile', 'etincelle'])
export type Reaction = z.infer<typeof Reaction>
