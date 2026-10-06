import type { SourcePhoto } from './sourcePhoto'

/** Web : pas d'appareil photo, on ouvre directement le sélecteur de fichiers. */
export function useSourcePhoto() {
  return async (): Promise<SourcePhoto | null> => 'galerie'
}
