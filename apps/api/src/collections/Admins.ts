import type { Access, CollectionConfig } from 'payload'

export const isAdmin: Access = ({ req }) => req.user?.collection === 'admins'

/** Comptes de l'interface d'administration, distincts des comptes de l'appli. */
export const Admins: CollectionConfig = {
  slug: 'admins',
  labels: { singular: 'Admin', plural: 'Admins' },
  admin: { useAsTitle: 'email', group: 'Administration' },
  auth: true,
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [],
}
