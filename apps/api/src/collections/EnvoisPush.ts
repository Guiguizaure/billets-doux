import type { CollectionConfig } from 'payload'

import { isAdmin } from './Admins'

/**
 * Notifications confiées à Expo, en attente de leur reçu (relevé un quart d'heure plus tard
 * par la tâche `recusPush`) : un reçu « DeviceNotRegistered » retire le jeton de l'appareil.
 */
export const EnvoisPush: CollectionConfig = {
  slug: 'envois-push',
  labels: { singular: 'Envoi de notification', plural: 'Envois de notifications' },
  admin: { group: 'Système', defaultColumns: ['utilisateur', 'createdAt'] },
  access: { read: isAdmin, create: isAdmin, update: isAdmin, delete: isAdmin },
  fields: [
    { name: 'ticket', label: 'Ticket Expo', type: 'text', required: true, index: true },
    { name: 'jeton', label: 'Jeton de l’appareil', type: 'text', required: true },
    {
      name: 'utilisateur',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
  ],
}
