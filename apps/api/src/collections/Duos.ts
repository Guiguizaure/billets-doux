import { DuoStatut, Rythme } from '@billets-doux/shared'
import type { CollectionConfig } from 'payload'

import { inviterEndpoint, rejoindreEndpoint } from '@/endpoints/duos'

import { isAdmin } from './Admins'

/**
 * Un duo exclusif. Il naît en `invitation` (un seul membre, un code valable 7 jours)
 * et devient `actif` quand la seconde personne le rejoint (src/services/duos.ts).
 */
export const Duos: CollectionConfig = {
  slug: 'duos',
  labels: { singular: 'Duo', plural: 'Duos' },
  admin: {
    useAsTitle: 'code',
    defaultColumns: ['code', 'statut', 'membres', 'createdAt'],
  },
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  endpoints: [inviterEndpoint, rejoindreEndpoint],
  fields: [
    {
      name: 'membres',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      maxRows: 2,
      required: true,
    },
    {
      name: 'createur',
      label: 'Créé par',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'statut',
      type: 'select',
      required: true,
      defaultValue: 'invitation',
      index: true,
      options: DuoStatut.options.map((valeur) => ({ label: valeur, value: valeur })),
    },
    {
      name: 'code',
      label: 'Code d’invitation',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'codeExpireLe',
      label: 'Code valable jusqu’au',
      type: 'date',
      required: true,
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'rejointLe',
      label: 'Duo formé le',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'retrouvailles',
      label: 'Date des retrouvailles',
      type: 'date',
    },
    {
      name: 'rythmes',
      label: 'Rythme du calendrier de chacun',
      type: 'array',
      maxRows: 2,
      fields: [
        { name: 'membre', type: 'relationship', relationTo: 'users', required: true },
        {
          name: 'rythme',
          type: 'select',
          required: true,
          defaultValue: 'jour',
          options: Rythme.options.map((valeur) => ({ label: valeur, value: valeur })),
        },
      ],
    },
  ],
}
