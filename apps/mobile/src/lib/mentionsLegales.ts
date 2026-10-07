/**
 * Mentions légales (billetsdoux.app/mentions-legales), loi pour la confiance dans l'économie
 * numérique, article 6. Coordonnées des hébergeurs relevées sur leurs sites le 7 octobre 2026
 * (politique de confidentialité de Cloudflare, page des bureaux de Salesforce).
 */
import type { Section } from './confidentialite'

export const SECTIONS_MENTIONS: Section[] = [
  {
    titre: 'Éditeur',
    paragraphes: [
      'Guillaume Salle, entrepreneur individuel (auto-entrepreneur), nom commercial Webjuno.',
      'SIRET : 931 695 365 00011.',
      'Adresse : 136 rue Estève Haut, 83140 Six-Fours-les-Plages (Var), France.',
      'Téléphone : 07 83 31 43 93.',
      'Contact : contact@billetsdoux.app.',
      'Directeur de la publication : Guillaume Salle.',
    ],
  },
  {
    titre: 'Hébergeurs',
    paragraphes: [
      'Serveur de l’appli : Heroku, service de Salesforce, Inc., 415 Mission Street, 3rd Floor, San Francisco, CA 94105, États-Unis. Téléphone : +1 800 664 9073.',
      'Version web, photos et vocaux : Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, États-Unis. Téléphone : +1 650 319 8930.',
    ],
  },
  {
    titre: 'Données personnelles',
    paragraphes: [
      'Ce que Billets doux enregistre, pourquoi, où et combien de temps, et comment exercer tes droits : voir la page Confidentialité.',
    ],
  },
]
