import { useChoisir } from '@/components/Choix'

export type SourcePhoto = 'appareil' | 'galerie'

/** D'où vient la photo : feuille de choix aux couleurs de l'appli ; null si on annule. */
export function useSourcePhoto() {
  const choisir = useChoisir()
  return () =>
    choisir<SourcePhoto>({
      titre: 'Ajouter une photo',
      options: [
        { valeur: 'appareil', libelle: 'Prendre une photo' },
        { valeur: 'galerie', libelle: 'Choisir dans la galerie' },
      ],
    })
}
