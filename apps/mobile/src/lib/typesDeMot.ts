import type { TypeMot } from '@billets-doux/shared'
import type { FC } from 'react'
import type { SvgProps } from 'react-native-svg'

import Mot from '@/assets/icons/Mot.svg'
import Photo from '@/assets/icons/Photo.svg'
import Poeme from '@/assets/icons/Poeme.svg'
import Vocal from '@/assets/icons/Vocal.svg'
import { couleurs } from '@/theme/tokens'

/** Libellé, icône et couleur de pastille de chaque type (réserve du Figma, 3.2). */
export const TYPES_DE_MOT: Record<TypeMot, { libelle: string; Icone: FC<SvgProps>; fond: string }> =
  {
    mot: { libelle: 'Mot', Icone: Mot, fond: couleurs.decor.sauge },
    poeme: { libelle: 'Poème', Icone: Poeme, fond: couleurs.decor.lavande },
    photo: { libelle: 'Photo', Icone: Photo, fond: couleurs.decor.soleil },
    vocal: { libelle: 'Vocal', Icone: Vocal, fond: couleurs.decor.rose },
  }
