import {
  ajouterJours,
  type CalendrierAuteur,
  ecartEnJours,
  heureLocale,
  libellesJour,
  lundiDe,
  type MotProgramme,
  type Rythme,
} from '@billets-doux/shared'

/** État d'une case du calendrier de l'auteur (écran 3.1). */
export type EtatCaseAuteur = 'ouverte' | 'prete' | 'libre' | 'passee'

export type CaseAuteur = {
  cle: string
  /** Petit libellé au-dessus du chiffre : « jeu. », « sem. du », « 2026 ». */
  titre: string
  /** Grand chiffre : « 15 », « 19 », « oct. ». */
  chiffre: string
  debut: string
  fin: string
  etat: EtatCaseAuteur
  mots: MotProgramme[]
  /** « lu à 8 h », « prête », « 2 prêtes », « libre ». */
  info: string
  /** Jour proposé pour écrire dans une case libre (le premier encore programmable). */
  jourCible: string | null
  libelleAccessible: string
}

const NOMBRE_DE_CASES: Record<Rythme, number> = { jour: 14, semaine: 8, mois: 6 }

/** Les cases à afficher selon le rythme de l'auteur : jours, semaines ou mois. */
export function construireCases(cal: CalendrierAuteur, rythme: Rythme = cal.rythme): CaseAuteur[] {
  const datees = cal.mots.filter((m) => m.programmation.mode === 'date')
  const jourDe = (m: MotProgramme) => (m.programmation.mode === 'date' ? m.programmation.jour : '')

  return periodes(cal.aujourdhui, rythme).map(({ debut, fin, titre, chiffre, nom }) => {
    const mots = datees.filter((m) => jourDe(m) >= debut && jourDe(m) <= fin)
    const ouverts = mots.filter((m) => m.ouvertLe)
    const jourCible =
      cal.premierJour > fin ? null : cal.premierJour > debut ? cal.premierJour : debut

    let etat: EtatCaseAuteur
    let info: string
    if (mots.length > 0 && ouverts.length === mots.length) {
      etat = 'ouverte'
      const dernier = ouverts.at(-1)?.ouvertLe
      // Heure ronde seulement (« lu à 8 h ») : la case est étroite.
      info = dernier
        ? `lu à ${Number(heureLocale(new Date(dernier), cal.destinataire.fuseauHoraire).slice(0, 2))} h`
        : 'lu'
    } else if (mots.length > 0) {
      etat = 'prete'
      const prets = mots.length - ouverts.length
      info = prets > 1 ? `${prets} prêts` : 'prête'
    } else if (jourCible) {
      etat = 'libre'
      info = 'libre'
    } else {
      etat = 'passee'
      info = 'passée'
    }

    const quoi =
      etat === 'ouverte'
        ? `${info}`
        : etat === 'prete'
          ? `${mots.length} mot${mots.length > 1 ? 's' : ''} prêt${mots.length > 1 ? 's' : ''}`
          : etat === 'libre'
            ? 'libre : touche pour écrire'
            : 'passée'
    return {
      cle: debut,
      titre,
      chiffre,
      debut,
      fin,
      etat,
      mots,
      info,
      jourCible,
      libelleAccessible: `${nom}, ${quoi}`,
    }
  })
}

function periodes(aujourdhui: string, rythme: Rythme) {
  const nombre = NOMBRE_DE_CASES[rythme]
  if (rythme === 'jour') {
    return Array.from({ length: nombre }, (_, i) => {
      const jour = ajouterJours(aujourdhui, i)
      const l = libellesJour(jour)
      return {
        debut: jour,
        fin: jour,
        titre: l.nomJourCourt,
        chiffre: String(l.jourDuMois),
        nom: l.long,
      }
    })
  }
  if (rythme === 'semaine') {
    const lundi = lundiDe(aujourdhui)
    return Array.from({ length: nombre }, (_, i) => {
      const debut = ajouterJours(lundi, 7 * i)
      const l = libellesJour(debut)
      return {
        debut,
        fin: ajouterJours(debut, 6),
        titre: 'sem. du',
        chiffre: String(l.jourDuMois),
        nom: `Semaine du ${l.date}`,
      }
    })
  }
  const { annee, mois } = libellesJour(aujourdhui)
  return Array.from({ length: nombre }, (_, i) => {
    const m = ((mois - 1 + i) % 12) + 1
    const a = annee + Math.floor((mois - 1 + i) / 12)
    const debut = `${a}-${String(m).padStart(2, '0')}-01`
    const fin = ajouterJours(
      `${m === 12 ? a + 1 : a}-${String((m % 12) + 1).padStart(2, '0')}-01`,
      -1,
    )
    const l = libellesJour(debut)
    return {
      debut,
      fin,
      titre: String(a),
      chiffre: l.nomMoisCourt,
      nom: `${l.nomMois} ${a}`,
    }
  })
}

/** Ce que résume le haut de l'écran 3.1. */
export function resumer(cal: CalendrierAuteur) {
  const enAttente = cal.mots.filter((m) => !m.ouvertLe)
  const datees = enAttente.filter((m) => m.programmation.mode === 'date')
  const auHasard = enAttente.filter((m) => m.programmation.mode === 'semaine_hasard')
  const lettres = cal.mots.filter((m) => m.programmation.mode === 'ouvre_quand')

  const jours = datees.map((m) => (m.programmation.mode === 'date' ? m.programmation.jour : ''))
  const fins = auHasard.map((m) =>
    m.programmation.mode === 'semaine_hasard' ? m.programmation.fin : '',
  )
  const dernier = [...jours, ...fins].sort().at(-1) ?? null
  const joursCouverts = new Set(jours).size
  const etendue = dernier ? ecartEnJours(cal.aujourdhui, dernier) + 1 : 0

  const lundiProchain = ajouterJours(lundiDe(cal.aujourdhui), 7)
  const dimancheProchain = ajouterJours(lundiProchain, 6)
  const semaineProchaine = jours.filter((j) => j >= lundiProchain && j <= dimancheProchain).length

  const fenetres = new Map<string, { debut: string; fin: string; nombre: number }>()
  for (const m of auHasard) {
    if (m.programmation.mode !== 'semaine_hasard') continue
    const { debut, fin } = m.programmation
    const f = fenetres.get(debut) ?? { debut, fin, nombre: 0 }
    f.nombre += 1
    fenetres.set(debut, f)
  }

  return {
    prets: datees.length + auHasard.length,
    jusquAu: dernier,
    /** Part des jours couverts d'ici au dernier mot (0 à 1). */
    progression: etendue > 0 ? Math.min(1, (joursCouverts + auHasard.length) / etendue) : 0,
    semaineProchaine,
    dansLaSemaine: [...fenetres.values()].sort((a, b) => a.debut.localeCompare(b.debut)),
    lettres: lettres.length,
  }
}
