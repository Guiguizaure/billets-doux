import { Reaction } from '@billets-doux/shared'
import type { CollectionConfig } from 'payload'

import { idDe } from '@/lib/ids'

import { isAdmin } from './Admins'

/**
 * La réponse du destinataire à un mot ouvert : une réaction (modifiable) et, au plus une fois,
 * un mot court (140 signes) ou un vocal (30 s). « Ce n'est pas une messagerie. »
 */
export const Reponses: CollectionConfig = {
  slug: 'reponses',
  labels: { singular: 'Réponse', plural: 'Réponses' },
  admin: { defaultColumns: ['mot', 'reaction', 'texte', 'envoyeeLe'] },
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: {
    // Le vocal d'une réponse supprimée part avec elle (fiche et fichier).
    afterDelete: [
      async ({ doc, req }) => {
        const vocal = idDe(doc.vocal)
        if (!vocal) return
        await req.payload.delete({ collection: 'medias', id: vocal, req }).catch((e: unknown) => {
          req.payload.logger.error({ err: e, media: vocal }, 'Vocal de réponse non supprimé')
        })
      },
    ],
  },
  fields: [
    {
      name: 'mot',
      type: 'relationship',
      relationTo: 'mots',
      required: true,
      unique: true,
      index: true,
    },
    { name: 'auteur', type: 'relationship', relationTo: 'users', required: true },
    {
      name: 'reaction',
      type: 'select',
      options: Reaction.options.map((valeur) => ({ label: valeur, value: valeur })),
    },
    { name: 'texte', type: 'textarea', maxLength: 140 },
    { name: 'vocal', type: 'relationship', relationTo: 'medias' },
    {
      name: 'envoyeeLe',
      label: 'Réponse envoyée le',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
  ],
}
