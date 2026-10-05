import { StyleSheet, View } from 'react-native'

import Pointilles from '@/assets/decor/pointilles.svg'
import TimbreLune from '@/assets/illustrations/timbre-lune.svg'
import { couleurs } from '@/theme/tokens'

import { Texte } from './Texte'

/** Les deux timbres reliés par des pointillés (écran 1.3). */
export function DuoTimbres({ moi, partenaire }: { moi: string; partenaire: string }) {
  return (
    <View style={styles.duo} accessible accessibilityLabel={`${moi} et ${partenaire}`}>
      <Personne prenom={moi} />
      <Pointilles width={64} height={2.5} color={couleurs.texte.encre} />
      <Personne prenom={partenaire} />
    </View>
  )
}

function Personne({ prenom }: { prenom: string }) {
  return (
    <View style={styles.personne}>
      {/* Illu/timbre-lune (72 × 88) affichée à 120 %, comme dans la maquette. */}
      <TimbreLune width={86.4} height={105.6} />
      <Texte variante="labelM">{prenom}</Texte>
    </View>
  )
}

const styles = StyleSheet.create({
  duo: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
  },
  personne: {
    alignItems: 'center',
    gap: 8,
  },
})
