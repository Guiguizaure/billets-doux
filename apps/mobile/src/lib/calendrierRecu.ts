import {
  ajouterJours,
  type CalendrierDestinataire,
  type CaseRecue,
  compteARebours,
  ecartEnJours,
  libellesJour,
  lundiDe,
  type TypeMot,
} from '@billets-doux/shared'

/** Une puce de période de l'écran 2.1 : « Cette semaine », « Octobre », « Novembre »… */
export type PeriodeRecue = { cle: string; libelle: string; debut: string; fin: string }

/** État d'une case du calendrier du destinataire (écran 2.1). */
export type EtatCaseRecue = 'lu' | 'a_ouvrir' | 'scelle' | 'vide'

export type CaseJour = {
  jour: string
  /** « jeu. » */
  titre: string
  /** « 15 » */
  chiffre: string
  etat: EtatCaseRecue
  mots: CaseRecue[]
  /** « lu », « à ouvrir », « demain », « dans 3 j », « vide ». */
  info: string
  libelleAccessible: string
}

/** Sans les icônes de typesDeMot.ts : ce module reste testable hors de l'appli. */
const NOMS: Record<TypeMot, string> = { mot: 'mot', poeme: 'poème', photo: 'photo', vocal: 'vocal' }

const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const premierDuMois = (annee: number, mois: number) =>
  `${annee}-${String(mois).padStart(2, '0')}-01`

const moisSuivant = (annee: number, mois: number) =>
  mois === 12 ? { annee: annee + 1, mois: 1 } : { annee, mois: mois + 1 }

/**
 * Les puces : cette semaine, le mois en cours, le suivant, puis chaque mois jusqu'à celui
 * de la dernière case (un an au plus).
 */
export function periodesRecues(cal: CalendrierDestinataire): PeriodeRecue[] {
  const lundi = lundiDe(cal.aujourdhui)
  const periodes: PeriodeRecue[] = [
    { cle: 'semaine', libelle: 'Cette semaine', debut: lundi, fin: ajouterJours(lundi, 6) },
  ]
  const dernier =
    cal.cases
      .map((c) => c.jour)
      .sort()
      .at(-1) ?? cal.aujourdhui
  let { annee, mois } = libellesJour(cal.aujourdhui)
  for (let i = 0; i < 13; i++) {
    const debut = premierDuMois(annee, mois)
    if (i >= 2 && debut > dernier) break
    const suivant = moisSuivant(annee, mois)
    periodes.push({
      cle: debut,
      libelle: majuscule(libellesJour(debut).nomMois),
      debut,
      fin: ajouterJours(premierDuMois(suivant.annee, suivant.mois), -1),
    })
    ;({ annee, mois } = suivant)
  }
  return periodes
}

/** Les cases d'une période, un jour par case, comme un calendrier de l'Avent. */
export function construireCasesRecues(
  cal: CalendrierDestinataire,
  periode: PeriodeRecue,
): CaseJour[] {
  const total = ecartEnJours(periode.debut, periode.fin) + 1
  return Array.from({ length: total }, (_, i) => {
    const jour = ajouterJours(periode.debut, i)
    const l = libellesJour(jour)
    const mots = cal.cases.filter((c) => c.jour === jour)
    const aOuvrir = mots.filter((m) => m.etat === 'a_ouvrir')
    const scelles = mots.filter((m) => m.etat === 'scelle')

    let etat: EtatCaseRecue
    let info: string
    if (aOuvrir.length > 0) {
      etat = 'a_ouvrir'
      info = 'à ouvrir'
    } else if (scelles.length > 0) {
      etat = 'scelle'
      info = compteARebours(ecartEnJours(cal.aujourdhui, jour), true)
    } else if (mots.length > 0) {
      etat = 'lu'
      info = 'lu'
    } else {
      etat = 'vide'
      info = 'vide'
    }

    const types = mots.map((m) => NOMS[m.type]).join(' et ')
    const quoi =
      etat === 'a_ouvrir'
        ? `${types}, à ouvrir`
        : etat === 'scelle'
          ? `${types}, scellé, ${compteARebours(ecartEnJours(cal.aujourdhui, jour))}`
          : etat === 'lu'
            ? `${types}, lu`
            : 'rien de prévu'
    return {
      jour,
      titre: l.nomJourCourt,
      chiffre: String(l.jourDuMois),
      etat,
      mots,
      info,
      libelleAccessible: `${majuscule(l.long)}, ${quoi}`,
    }
  })
}

/** La période affichée à l'ouverture de l'écran : le mois en cours (Figma). */
export const periodeParDefaut = (periodes: PeriodeRecue[]) => periodes[1] ?? periodes[0]

/** Ce que résume le haut de l'écran 2.1. */
export function resumerRecu(cal: CalendrierDestinataire) {
  const aOuvrir = cal.cases.filter((c) => c.etat === 'a_ouvrir')
  const prochaine = cal.cases
    .filter((c) => c.etat === 'scelle')
    .map((c) => c.jour)
    .sort()[0]
  const preparees = cal.cases.filter((c) => c.etat !== 'ouvert').length + cal.surprises

  const morceaux: string[] = []
  if (preparees > 0)
    morceaux.push(
      `${preparees} case${preparees > 1 ? 's' : ''} préparée${preparees > 1 ? 's' : ''}`,
    )
  if (aOuvrir.length > 0) {
    morceaux.push(`${aOuvrir.length} à ouvrir aujourd’hui`)
  } else if (prochaine) {
    morceaux.push(`la prochaine s’ouvre ${compteARebours(ecartEnJours(cal.aujourdhui, prochaine))}`)
  }
  return {
    ligne: morceaux.length > 0 ? morceaux.join(' · ') : 'Rien de prévu pour l’instant.',
    /** Mots à ouvrir maintenant, dans l'ordre : ils s'ouvrent l'un après l'autre. */
    aOuvrir: aOuvrir.sort((a, b) => a.unlockAt.localeCompare(b.unlockAt)).map((c) => c.id),
  }
}

/** La ligne des surprises « Dans la semaine » : le nombre, jamais le jour. */
export function ligneSurprises(nombre: number) {
  if (nombre <= 0) return null
  return nombre === 1
    ? 'Une surprise t’attend quelque part cette semaine'
    : `${nombre} surprises t’attendent quelque part cette semaine`
}

const ATTEND: Record<TypeMot, string> = {
  mot: 'Un mot t’attend',
  poeme: 'Un poème t’attend',
  photo: 'Une photo t’attend',
  vocal: 'Un vocal t’attend',
}

/** Titre de la feuille d'une case scellée (2.2). */
export const phraseAttente = (type: TypeMot) => ATTEND[type]

/**
 * Titres de lecture générés (le titre de l'auteur reste privé) : « Mot du jeudi »
 * dans l'en-tête, « Un vocal pour ton mercredi » au-dessus d'un vocal.
 */
export function titresLecture(jour: string | null) {
  if (!jour) return { enTete: 'Ouvre quand…', jourNom: null }
  const nom = libellesJour(jour).nomJour
  return { enTete: `Mot du ${nom}`, jourNom: nom }
}
