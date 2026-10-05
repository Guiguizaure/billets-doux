import type { FC } from 'react'
import { Pressable, Text } from 'react-native'
import type { SvgProps } from 'react-native-svg'

import { couleurs } from '@/theme/tokens'

type Props = {
  libelle: string
  variante?: 'principal' | 'secondaire' | 'discret'
  Icone?: FC<SvgProps>
}

const fonds = {
  principal: 'bg-action-cachet',
  secondaire: 'bg-fond-carte border-[1.5px] border-texte-encre',
  discret: '',
}

/** Variante NativeWind du composant Figma « Bouton ». */
export function BoutonNW({ libelle, variante = 'principal', Icone }: Props) {
  const principal = variante === 'principal'
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={libelle}
      className={`flex-row items-center gap-2 self-start rounded-full px-6 py-[15px] active:opacity-70 ${fonds[variante]}`}
    >
      {Icone ? (
        <Icone
          width={20}
          height={20}
          color={principal ? couleurs.texte.surCachet : couleurs.texte.encre}
        />
      ) : null}
      <Text
        className={`font-corps-semibold text-[15px] leading-[20px] ${principal ? 'text-texte-sur-cachet' : 'text-texte-encre'}`}
      >
        {libelle}
      </Text>
    </Pressable>
  )
}
