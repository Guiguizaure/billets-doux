import type { CollectionConfig } from 'payload'

import { isAdmin } from './Admins'

/**
 * Comptes de l'appli. Champs et règles d'accès complets à l'étape 2 (inscription, duo) ;
 * d'ici là, seuls les admins y ont accès.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Utilisateur', plural: 'Utilisateurs' },
  admin: { useAsTitle: 'email' },
  auth: true,
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [],
}
