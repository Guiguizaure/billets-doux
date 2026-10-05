import { Text, View } from 'react-native'

import Vocal from '@/assets/icons/Vocal.svg'
import type { EtatCase } from '@/components/Case'
import { couleurs, ombres } from '@/theme/tokens'

type Props = {
  etat: EtatCase
  jourSemaine: string
  jour: string
  info: string
  libelleAccessible: string
}

const cases: Record<EtatCase, string> = {
  ouverte: 'bg-fond-carte border border-trait-ligne',
  aujourdhui: 'bg-action-cachet',
  verrouillee: 'bg-fond-papier-ombre border border-trait-ligne',
  vide: 'border-[1.5px] border-dashed border-trait-ligne',
  prete: 'bg-fond-carte border-[1.5px] border-decor-sauge',
}

const pastilles: Record<EtatCase, string> = {
  ouverte: 'bg-decor-rose',
  aujourdhui: 'bg-decor-soleil',
  verrouillee: 'bg-fond-carte',
  vide: 'border-[1.5px] border-dashed border-trait-ligne',
  prete: 'bg-decor-sauge',
}

/** Variante NativeWind du composant Figma « Case du calendrier ». */
export function CaseNW({ etat, jourSemaine, jour, info, libelleAccessible }: Props) {
  const aujourdhui = etat === 'aujourdhui'
  const label = `font-corps-medium text-[12px] leading-[16px] tracking-[0.24px] ${aujourdhui ? 'text-texte-sur-cachet' : 'text-texte-encre-douce'}`
  const chiffre = aujourdhui
    ? 'text-texte-sur-cachet'
    : etat === 'vide'
      ? 'text-texte-encre-douce'
      : 'text-texte-encre'

  return (
    <View
      accessible
      accessibilityLabel={libelleAccessible}
      // L'ombre CSS (boxShadow) n'a pas d'équivalent en classe NativeWind v4 : style direct.
      style={aujourdhui ? { boxShadow: ombres.cachet } : undefined}
      className={`h-[128px] w-[111px] justify-between rounded-case p-3 ${cases[etat]}`}
    >
      <View className="gap-0.5">
        <Text className={label}>{jourSemaine}</Text>
        <Text className={`font-titre text-[30px] leading-[30px] ${chiffre}`}>{jour}</Text>
      </View>
      <View className="flex-row items-center gap-1.5">
        <View className={`h-7 w-7 items-center justify-center rounded-full ${pastilles[etat]}`}>
          <Vocal
            width={16}
            height={16}
            color={etat === 'vide' ? couleurs.texte.encreDouce : couleurs.texte.encre}
          />
        </View>
        <Text className={label}>{info}</Text>
      </View>
    </View>
  )
}
