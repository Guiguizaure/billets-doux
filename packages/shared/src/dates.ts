import { TZDate } from '@date-fns/tz'
import { format } from 'date-fns'

/**
 * Règles de dates du calendrier. Un « jour » est une date locale du destinataire,
 * au format AAAA-MM-JJ ; c'est son fuseau et son heure de découverte qui font foi.
 * L'arithmétique des jours se fait en UTC pur : elle ne dépend d'aucun changement d'heure.
 */

const FORMAT_JOUR = /^(\d{4})-(\d{2})-(\d{2})$/

export const JOURS_PROGRAMMABLES = 365
export const JOURS_DANS_LA_SEMAINE = 7

function lireJour(jour: string) {
  const m = FORMAT_JOUR.exec(jour)
  if (!m) throw new Error(`Jour invalide : ${jour}`)
  return { annee: Number(m[1]), mois: Number(m[2]), jourDuMois: Number(m[3]) }
}

export function estJourValide(jour: string) {
  const m = FORMAT_JOUR.exec(jour)
  if (!m) return false
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  return format(new TZDate(date, 'UTC'), 'yyyy-MM-dd') === jour
}

/** Le jour local d'un instant dans un fuseau : « 2026-10-20 ». */
export function jourLocal(instant: Date, fuseau: string) {
  return format(new TZDate(instant, fuseau), 'yyyy-MM-dd')
}

/** `jour` + `n` jours (n peut être négatif). */
export function ajouterJours(jour: string, n: number) {
  const { annee, mois, jourDuMois } = lireJour(jour)
  const date = new Date(Date.UTC(annee, mois - 1, jourDuMois + n))
  return date.toISOString().slice(0, 10)
}

/** Nombre de jours de `debut` à `fin` (positif si `fin` est après). */
export function ecartEnJours(debut: string, fin: string) {
  const a = lireJour(debut)
  const b = lireJour(fin)
  return Math.round(
    (Date.UTC(b.annee, b.mois - 1, b.jourDuMois) - Date.UTC(a.annee, a.mois - 1, a.jourDuMois)) /
      86_400_000,
  )
}

/** Jour de la semaine : 0 = dimanche … 6 = samedi. */
export function jourDeSemaine(jour: string) {
  const { annee, mois, jourDuMois } = lireJour(jour)
  return new Date(Date.UTC(annee, mois - 1, jourDuMois)).getUTCDay()
}

/**
 * L'instant où un mot s'ouvre : le jour choisi, à l'heure de découverte du destinataire,
 * dans son fuseau. Gère les changements d'heure (une heure qui n'existe pas ce jour-là
 * glisse à la suivante).
 */
export function instantOuverture(jour: string, heure: string, fuseau: string) {
  const { annee, mois, jourDuMois } = lireJour(jour)
  const [h, min] = heure.split(':').map(Number)
  return new Date(new TZDate(annee, mois - 1, jourDuMois, h ?? 0, min ?? 0, fuseau).getTime())
}

/** Aujourd'hui si l'heure de découverte n'est pas encore passée chez le destinataire, sinon demain. */
export function premierJourProgrammable(maintenant: Date, heure: string, fuseau: string) {
  const aujourdhui = jourLocal(maintenant, fuseau)
  return instantOuverture(aujourdhui, heure, fuseau).getTime() > maintenant.getTime()
    ? aujourdhui
    : ajouterJours(aujourdhui, 1)
}

export function dernierJourProgrammable(maintenant: Date, fuseau: string) {
  return ajouterJours(jourLocal(maintenant, fuseau), JOURS_PROGRAMMABLES)
}

/** La fenêtre « Dans la semaine » : de demain à demain + 6, chez le destinataire. */
export function semaineAuHasard(maintenant: Date, fuseau: string) {
  const debut = ajouterJours(jourLocal(maintenant, fuseau), 1)
  return { debut, fin: ajouterJours(debut, JOURS_DANS_LA_SEMAINE - 1) }
}

/** Tire le jour secret d'un mot « Dans la semaine » (côté serveur uniquement). */
export function tirerJourDansLaSemaine(
  maintenant: Date,
  fuseau: string,
  aleatoire: () => number = Math.random,
) {
  const { debut } = semaineAuHasard(maintenant, fuseau)
  const decalage = Math.min(
    JOURS_DANS_LA_SEMAINE - 1,
    Math.floor(aleatoire() * JOURS_DANS_LA_SEMAINE),
  )
  return ajouterJours(debut, decalage)
}

const JOURS_LONGS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const JOURS_COURTS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']
const MOIS_LONGS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
]
const MOIS_COURTS = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
]

/** Libellés français d'un jour : « mardi 20 », « mar. », « 20 octobre », « oct. ». */
export function libellesJour(jour: string) {
  const { annee, mois, jourDuMois } = lireJour(jour)
  const semaine = jourDeSemaine(jour)
  return {
    jourDuMois,
    annee,
    mois,
    nomJour: JOURS_LONGS[semaine] ?? '',
    nomJourCourt: JOURS_COURTS[semaine] ?? '',
    nomMois: MOIS_LONGS[mois - 1] ?? '',
    nomMoisCourt: MOIS_COURTS[mois - 1] ?? '',
    /** « mardi 20 » */
    court: `${JOURS_LONGS[semaine]} ${jourDuMois}`,
    /** « mardi 20 octobre » */
    long: `${JOURS_LONGS[semaine]} ${jourDuMois} ${MOIS_LONGS[mois - 1]}`,
    /** « 20 octobre » */
    date: `${jourDuMois} ${MOIS_LONGS[mois - 1]}`,
  }
}

/**
 * Grille d'un mois pour le sélecteur de date : semaines commençant le lundi,
 * `null` pour les cases hors du mois.
 */
export function grilleDuMois(annee: number, mois: number) {
  const premier = `${annee}-${String(mois).padStart(2, '0')}-01`
  const decalage = (jourDeSemaine(premier) + 6) % 7
  const nbJours = new Date(Date.UTC(annee, mois, 0)).getUTCDate()
  const cases: (string | null)[] = [
    ...Array.from({ length: decalage }, () => null),
    ...Array.from({ length: nbJours }, (_, i) => ajouterJours(premier, i)),
  ]
  while (cases.length % 7 !== 0) cases.push(null)
  const semaines: (string | null)[][] = []
  for (let i = 0; i < cases.length; i += 7) semaines.push(cases.slice(i, i + 7))
  return semaines
}

/** Lundi de la semaine qui contient `jour`. */
export function lundiDe(jour: string) {
  return ajouterJours(jour, -((jourDeSemaine(jour) + 6) % 7))
}

/** Un mot programmé peut-il s'ouvrir maintenant ? (instant d'ouverture atteint ou dépassé) */
export function estOuvrable(unlockAt: string | null | undefined, maintenant = new Date()) {
  return Boolean(unlockAt) && new Date(unlockAt as string).getTime() <= maintenant.getTime()
}
