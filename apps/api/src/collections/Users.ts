import { HEURE_PAR_DEFAUT, HeureDecouverte } from '@billets-doux/shared'
import type { CollectionConfig } from 'payload'

import { fuseauValide } from '@/lib/fuseau'
import { recalculerOuvertures } from '@/services/programmation'

import { isAdmin } from './Admins'

const TRENTE_JOURS = 60 * 60 * 24 * 30

/**
 * Comptes de l'appli. L'appli passe uniquement par les routes `/api/comptes/*` et
 * `/api/duos/*` (src/endpoints) : l'API REST générique reste réservée aux admins.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Utilisateur', plural: 'Utilisateurs' },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['prenom', 'email', 'duo', 'createdAt'],
  },
  auth: {
    tokenExpiration: TRENTE_JOURS,
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
  },
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: {
    // Nouvelle heure de découverte ou nouveau fuseau : les mots qui lui sont destinés suivent.
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        if (operation !== 'update' || !previousDoc) return doc
        if (
          doc.heureDecouverte !== previousDoc.heureDecouverte ||
          doc.fuseauHoraire !== previousDoc.fuseauHoraire
        ) {
          await recalculerOuvertures(req, doc)
        }
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'prenom',
      label: 'Prénom',
      type: 'text',
      required: true,
      maxLength: 40,
    },
    {
      name: 'fuseauHoraire',
      label: 'Fuseau horaire',
      type: 'text',
      required: true,
      defaultValue: 'Europe/Paris',
      validate: (valeur: string | null | undefined) =>
        valeur && fuseauValide(valeur) ? true : 'Fuseau horaire inconnu.',
    },
    {
      name: 'heureDecouverte',
      label: 'Heure de découverte',
      type: 'text',
      required: true,
      defaultValue: HEURE_PAR_DEFAUT,
      validate: (valeur: string | null | undefined) =>
        HeureDecouverte.safeParse(valeur).success || 'Heure invalide (HH:MM).',
    },
    {
      name: 'heureConfirmee',
      label: 'Heure confirmée (écran 1.3 vu)',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'duo',
      label: 'Duo en cours',
      type: 'relationship',
      relationTo: 'duos',
      index: true,
      admin: { readOnly: true },
    },
    {
      // Écrit à chaque joker : deux jokers simultanés se gênent dans la transaction (un seul passe).
      name: 'dernierJokerLe',
      label: 'Dernier joker utilisé le',
      type: 'date',
      admin: { readOnly: true },
    },
    {
      name: 'reglages',
      label: 'Réglages',
      type: 'group',
      fields: [
        { name: 'rappelDoux', label: 'Rappel doux', type: 'checkbox', defaultValue: true },
        {
          name: 'indicesVisibles',
          label: 'Indices visibles',
          type: 'checkbox',
          defaultValue: true,
        },
      ],
    },
    {
      // Un jeton Expo Push par appareil ; retiré à la déconnexion ou quand Expo le déclare invalide.
      name: 'appareils',
      label: 'Appareils (notifications)',
      type: 'array',
      admin: { readOnly: true },
      fields: [
        { name: 'jeton', type: 'text', required: true },
        {
          name: 'plateforme',
          type: 'select',
          required: true,
          options: ['android', 'ios'],
        },
        { name: 'vuLe', label: 'Vu le', type: 'date' },
      ],
    },
    {
      name: 'dernierRappelLe',
      label: 'Dernier rappel doux le',
      type: 'date',
      admin: { readOnly: true },
    },
    {
      name: 'essaisCode',
      label: 'Essais de code d’invitation',
      type: 'group',
      admin: { readOnly: true },
      fields: [
        { name: 'nombre', type: 'number', defaultValue: 0 },
        { name: 'depuis', type: 'date' },
      ],
    },
  ],
}
