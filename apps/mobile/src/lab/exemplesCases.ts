import type { EtatCase } from '@/components/Case'

/** Les cinq états du composant Figma « Case du calendrier ». */
export const exemplesCases: {
  etat: EtatCase
  jourSemaine: string
  jour: string
  info: string
  libelleAccessible: string
}[] = [
  {
    etat: 'ouverte',
    jourSemaine: 'lun.',
    jour: '12',
    info: 'ouvert',
    libelleAccessible: 'Lundi 12, mot ouvert',
  },
  {
    etat: 'aujourdhui',
    jourSemaine: 'mar.',
    jour: '13',
    info: 'à 8 h',
    libelleAccessible: 'Mardi 13, aujourd’hui, s’ouvre à 8 heures',
  },
  {
    etat: 'verrouillee',
    jourSemaine: 'ven.',
    jour: '16',
    info: 'dans 3 j',
    libelleAccessible: 'Vendredi 16, scellé, s’ouvre dans 3 jours',
  },
  {
    etat: 'vide',
    jourSemaine: 'sam.',
    jour: '17',
    info: 'à écrire',
    libelleAccessible: 'Samedi 17, case vide, à écrire',
  },
  {
    etat: 'prete',
    jourSemaine: 'dim.',
    jour: '18',
    info: 'prêt',
    libelleAccessible: 'Dimanche 18, mot prêt et programmé',
  },
]
