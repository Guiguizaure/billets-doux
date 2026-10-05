/** « 0:32 », « 2:05 » à partir d'une durée en secondes. */
export function formaterDuree(secondes: number) {
  const total = Math.max(0, Math.round(secondes))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const MOIS = [
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

/**
 * Date d'un brouillon, comme dans la réserve du Figma : « aujourd'hui », « hier »,
 * le nom du jour dans la semaine écoulée, sinon « le 3 octobre ». En heure locale.
 */
export function quandNote(iso: string, maintenant = new Date()) {
  const date = new Date(iso)
  const debut = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const ecart = Math.round((debut(maintenant) - debut(date)) / 86_400_000)
  if (ecart <= 0) return 'aujourd’hui'
  if (ecart === 1) return 'hier'
  if (ecart < 7) return JOURS[date.getDay()] ?? ''
  return `le ${date.getDate()} ${MOIS[date.getMonth()]}`
}

/**
 * Compte à rebours d'une case scellée, d'aujourd'hui (chez le destinataire) au jour du mot :
 * « aujourd'hui », « demain », « dans 4 jours » ; `court` pour les cases (« dans 4 j »).
 */
export function compteARebours(jours: number, court = false) {
  if (jours <= 0) return 'aujourd’hui'
  if (jours === 1) return 'demain'
  return court ? `dans ${jours} j` : `dans ${jours} jours`
}
