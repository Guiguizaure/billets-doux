import { DuoStatut, Rythme } from '@billets-doux/shared'
import type { CollectionConfig } from 'payload'

import {
  fermetureEndpoint,
  inviterEndpoint,
  nousDeuxEndpoint,
  pauseEndpoint,
  rejoindreEndpoint,
  repriseEndpoint,
  retrouvaillesEndpoint,
} from '@/endpoints/duos'

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
  endpoints: [
    inviterEndpoint,
    rejoindreEndpoint,
    nousDeuxEndpoint,
    pauseEndpoint,
    repriseEndpoint,
    fermetureEndpoint,
    retrouvaillesEndpoint,
  ],
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
      // Un jour (« 2026-10-31 »), pas un instant : il se lit pareil dans les deux fuseaux.
      name: 'retrouvailles',
      label: 'Jour des retrouvailles',
      type: 'text',
      validate: (valeur: string | null | undefined) =>
        !valeur || /^\d{4}-\d{2}-\d{2}$/.test(valeur) || 'Jour invalide (AAAA-MM-JJ).',
    },
    {
      // Seule la personne qui a mis la pause peut la lever.
      name: 'pausePar',
      label: 'Mis en pause par',
      type: 'relationship',
      relationTo: 'users',
    },
    { name: 'pauseDepuis', label: 'En pause depuis', type: 'date' },
    { name: 'fermePar', label: 'Fermé par', type: 'relationship', relationTo: 'users' },
    { name: 'fermeLe', label: 'Fermé le', type: 'date' },
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
