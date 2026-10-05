import type { CollectionConfig } from 'payload'

import { listesMedias } from '@/endpoints/medias'
import { supprimer } from '@/lib/stockage'

import { isAdmin } from './Admins'

/**
 * Métadonnées des photos et vocaux. Les fichiers vivent dans le bucket privé
 * (src/lib/stockage.ts) et ne passent jamais par Payload.
 */
export const Medias: CollectionConfig = {
  slug: 'medias',
  labels: { singular: 'Média', plural: 'Médias' },
  admin: { useAsTitle: 'cle', defaultColumns: ['nature', 'statut', 'taille', 'proprietaire'] },
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  endpoints: listesMedias,
  hooks: {
    // Supprimer la fiche supprime le fichier, quelle que soit l'origine (appli, admin, fermeture).
    afterDelete: [
      async ({ doc, req }) => {
        try {
          await supprimer(doc.cle)
        } catch (e) {
          req.payload.logger.error({ err: e, cle: doc.cle }, 'Fichier de média non supprimé')
        }
      },
    ],
  },
  fields: [
    {
      name: 'proprietaire',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    { name: 'duo', type: 'relationship', relationTo: 'duos', required: true, index: true },
    {
      name: 'nature',
      type: 'select',
      required: true,
      options: [
        { label: 'Photo', value: 'photo' },
        { label: 'Vocal', value: 'vocal' },
      ],
    },
    { name: 'cle', label: 'Clé dans le bucket', type: 'text', required: true, unique: true },
    { name: 'mime', type: 'text', required: true },
    { name: 'taille', label: 'Taille (octets)', type: 'number', required: true },
    { name: 'duree', label: 'Durée (s)', type: 'number' },
    {
      name: 'statut',
      type: 'select',
      required: true,
      defaultValue: 'en_attente',
      options: [
        { label: 'En attente de l’envoi', value: 'en_attente' },
        { label: 'Prêt', value: 'pret' },
      ],
    },
  ],
}
