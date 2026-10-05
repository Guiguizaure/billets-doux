import { ModeMot, StatutMot, TypeMot } from '@billets-doux/shared'
import type { CollectionConfig } from 'payload'

import { listesMots } from '@/endpoints/mots'
import { idDe } from '@/lib/ids'

import { isAdmin } from './Admins'

const options = (valeurs: readonly string[]) => valeurs.map((v) => ({ label: v, value: v }))

/**
 * Les mots. Brouillons (la réserve) à l'étape 3 ; programmation à l'étape 4,
 * ouverture et verrouillage à l'étape 5. Accès uniquement par les routes de l'appli.
 */
export const Mots: CollectionConfig = {
  slug: 'mots',
  labels: { singular: 'Mot', plural: 'Mots' },
  admin: {
    useAsTitle: 'titre',
    defaultColumns: ['titre', 'type', 'statut', 'auteur', 'updatedAt'],
  },
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  endpoints: listesMots,
  hooks: {
    // Un mot supprimé emporte sa photo et son vocal (fiches et fichiers).
    afterDelete: [
      async ({ doc, req }) => {
        for (const media of [doc.photo, doc.vocal]) {
          const id = idDe(media)
          if (!id) continue
          await req.payload.delete({ collection: 'medias', id, req }).catch((e: unknown) => {
            req.payload.logger.error({ err: e, media: id }, 'Média du mot non supprimé')
          })
        }
      },
    ],
  },
  fields: [
    { name: 'duo', type: 'relationship', relationTo: 'duos', required: true, index: true },
    { name: 'auteur', type: 'relationship', relationTo: 'users', required: true, index: true },
    {
      name: 'destinataire',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    { name: 'type', type: 'select', required: true, options: options(TypeMot.options) },
    { name: 'titre', label: 'Titre (visible de l’auteur seul)', type: 'text', maxLength: 60 },
    { name: 'texte', type: 'textarea', maxLength: 2000 },
    { name: 'indice', type: 'text', maxLength: 80 },
    { name: 'manuscrit', label: 'Écriture manuscrite', type: 'checkbox', defaultValue: true },
    { name: 'photo', type: 'relationship', relationTo: 'medias' },
    { name: 'vocal', type: 'relationship', relationTo: 'medias' },
    {
      name: 'mode',
      type: 'select',
      required: true,
      defaultValue: 'brouillon',
      options: options(ModeMot.options),
    },
    { name: 'unlockAt', label: 'S’ouvre le', type: 'date', index: true },
    { name: 'titreOuvreQuand', label: 'Ouvre quand…', type: 'text' },
    {
      name: 'statut',
      type: 'select',
      required: true,
      defaultValue: 'brouillon',
      index: true,
      options: options(StatutMot.options),
    },
    { name: 'openedAt', label: 'Ouvert le', type: 'date' },
    { name: 'ouvertAvecJoker', label: 'Ouvert grâce au joker', type: 'checkbox' },
    { name: 'notifiedAt', label: 'Notifié le', type: 'date' },
  ],
}
