/**
 * Texte de la page « Confidentialité » (billetsdoux.app/confidentialite), en une seule source.
 * À relire à chaque changement de ce que l'appli stocke ou de ses prestataires.
 */

export const MISE_A_JOUR = '7 octobre 2026'
export const CONTACT = 'contact@billetsdoux.app'

export type Section = { titre: string; paragraphes: string[] }

export const SECTIONS: Section[] = [
  {
    titre: 'Qui est responsable de tes données',
    paragraphes: [
      'Billets doux est édité par Guillaume Salle (Webjuno, auto-entrepreneur), responsable du traitement de tes données (voir les mentions légales).',
      `Pour toute question ou demande sur tes données : ${CONTACT}.`,
    ],
  },
  {
    titre: 'Ce que Billets doux enregistre',
    paragraphes: [
      'Ton compte : ton prénom, ton adresse e-mail, ton mot de passe (seulement sous une forme chiffrée qui ne permet pas de le retrouver), ton fuseau horaire, l’heure à laquelle tes mots s’ouvrent et tes réglages.',
      'Ton duo : la personne avec qui tu le partages, la date à laquelle il a commencé, une pause ou une date de retrouvailles si tu en choisis une.',
      'Ce que vous vous écrivez : les mots, poèmes, photos et vocaux, leur titre, leur indice, le jour où ils s’ouvrent, vos réactions et vos réponses, et l’utilisation du joker du mois.',
      'Pour les notifications : l’identifiant de notification de ton téléphone, si tu les autorises.',
      'Sur ton appareil : ta session (pour rester connecté·e, 30 jours au plus sans ouvrir l’appli) et, sur la version web, le fait d’avoir déjà vu la visite guidée de la démo. Pas de cookie publicitaire, pas de mesure d’audience, pas de publicité.',
    ],
  },
  {
    titre: 'Pourquoi',
    paragraphes: [
      'Uniquement pour faire fonctionner Billets doux : garder tes mots scellés jusqu’au jour choisi, les ouvrir à ton heure, te prévenir qu’un mot t’attend, garder vos souvenirs. Ces données servent à te rendre le service que tu demandes en créant ton compte (exécution du contrat).',
      'Les notifications ne sont envoyées que si tu les autorises sur ton téléphone. Elles ne disent jamais ce que contient un mot ni quand il s’ouvrira : seulement le prénom de la personne qui t’a écrit (« Un mot de Lina t’attend »).',
      'Tes données ne sont ni vendues, ni louées, ni utilisées pour de la publicité.',
    ],
  },
  {
    titre: 'Qui peut voir tes mots',
    paragraphes: [
      'Seulement la personne de ton duo, et seulement à partir du jour où le mot s’ouvre. Avant, elle ne voit que la date, le type de mot et l’indice si tu en as mis un.',
      'Les photos et les vocaux sont stockés dans un espace privé : ils ne sont accessibles que par des liens temporaires, valables quelques minutes, créés pour la personne qui a le droit de les voir.',
      'Techniquement, en tant qu’éditeur, j’ai accès à la base pour la maintenance. Je ne lis pas vos mots, sauf si tu me le demandes pour résoudre un problème.',
    ],
  },
  {
    titre: 'Où sont tes données',
    paragraphes: [
      'Base de données : MongoDB Atlas, sur des serveurs Amazon Web Services à Paris (France).',
      'Serveur de l’appli : Heroku (Salesforce), dans sa région Europe.',
      'Photos, vocaux et sauvegardes : Cloudflare R2, dans un espace privé.',
      'Version web et nom de domaine : Cloudflare.',
      'Notifications : Expo (650 Industries) et Google Firebase Cloud Messaging, qui acheminent la notification jusqu’à ton téléphone. Ils ne reçoivent que l’identifiant de notification de ton téléphone et le texte de la notification.',
      'Expo est situé aux États-Unis, et Google peut traiter ces données dans n’importe lequel de ses centres de données, aux États-Unis compris. Ces transferts reposent sur le cadre de protection des données UE–États-Unis (Data Privacy Framework), auquel Expo et Google ont adhéré ; pour Firebase, Google applique en outre les clauses contractuelles types de la Commission européenne.',
    ],
  },
  {
    titre: 'Combien de temps',
    paragraphes: [
      'Tant que ton compte existe. Si ton duo est fermé, tes souvenirs restent consultables, jusqu’à ce que tu supprimes ton compte.',
      'Quand tu supprimes ton compte, tout ce que tu as écrit est effacé tout de suite, photos et vocaux compris, y compris les mots que la personne de ton duo avait déjà ouverts. Les copies de sauvegarde de la base, faites chaque nuit, disparaissent d’elles-mêmes au bout de 14 jours.',
      'Un export de tes souvenirs (archive à télécharger) est effacé au bout de 24 heures.',
      'Les traces techniques d’envoi des notifications sont effacées après un quart d’heure.',
    ],
  },
  {
    titre: 'Tes droits',
    paragraphes: [
      'Tu peux à tout moment accéder à tes données, les rectifier, les effacer, en demander la limitation, t’opposer à leur traitement ou les récupérer.',
      'Dans l’appli : « Nous deux » → « Exporter nos souvenirs » pour récupérer tes mots, et « Supprimer mon compte » pour tout effacer. Sans l’appli : billetsdoux.app/supprimer-mon-compte.',
      `Pour le reste, écris à ${CONTACT} : tu auras une réponse sous un mois au plus.`,
      'Si tu estimes que tes droits ne sont pas respectés, tu peux adresser une réclamation à la CNIL (cnil.fr).',
    ],
  },
]
