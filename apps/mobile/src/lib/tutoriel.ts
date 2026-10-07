/** Textes du tutoriel, validés par l'utilisateur (étape 8). */

/** Visite guidée de la démo web, après la lecture du mot du jour. */
export const VISITE_DEMO = [
  {
    cible: 'titre',
    texte:
      'Voici le calendrier que Lina te prépare : chaque case est un mot qui s’ouvre à son jour.',
  },
  {
    cible: 'caseScellee',
    texte: 'Une case scellée : tu vois son jour et l’indice de Lina, jamais le mot avant l’heure.',
  },
  {
    cible: 'ongletPourToi',
    texte:
      'Dans « Pour toi », tu prépares à ton tour les mots pour Lina, pour le jour de ton choix.',
  },
  {
    cible: 'ongletSouvenirs',
    texte: 'Chaque mot ouvert, le sien comme le tien, se range dans « Souvenirs ».',
  },
  {
    cible: null,
    texte: 'Tout est à toi : écris, programme, réagis. Ce duo de démo revient à zéro chaque nuit.',
  },
] as const

export type CibleVisite = (typeof VISITE_DEMO)[number]['cible']

/** Les 3 cartes qui suivent la création du duo (après l'écran 1.3). */
export const cartesPrincipe = (prenom: string) => [
  {
    titre: 'Des mots préparés à l’avance',
    texte: `Quand tu y penses, écris un mot, un poème, une photo ou un vocal pour ${prenom}, et choisis le jour où il s’ouvrira.`,
  },
  {
    titre: 'Scellés jusqu’au jour choisi',
    texte: `Avant ce jour-là, ${prenom} ne voit que la date et, si tu veux, un indice.`,
  },
  {
    titre: 'Un calendrier qui se remplit',
    texte: `Pendant que tu remplis le calendrier de ${prenom}, tu vois le tien se remplir, case après case.`,
  },
]

/** Une bulle à la première visite de chaque onglet. */
export const bulleOnglet = (
  onglet: 'pourMoi' | 'pourToi' | 'souvenirs' | 'nousDeux',
  prenom: string,
  heure: string,
) =>
  ({
    pourMoi: `Ici s’ouvrent les mots que ${prenom} te prépare, à ${heure}, le jour venu.`,
    pourToi: `Ici, tu prépares les mots pour ${prenom} : touche une case pour écrire pour ce jour-là.`,
    souvenirs: 'Chaque mot ouvert, dans les deux sens, vient se ranger ici.',
    nousDeux: 'Ton heure, la pause et vos réglages se trouvent ici.',
  })[onglet]
