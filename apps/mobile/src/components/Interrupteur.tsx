import { Pressable, StyleSheet, View } from 'react-native'

import { couleurs, rayons } from '@/theme/tokens'

/** « Interrupteur activé » du Figma (3.4) : piste sauge, pastille crème. */
export function Interrupteur({
  actif,
  onChange,
  libelle,
}: {
  actif: boolean
  onChange: (actif: boolean) => void
  libelle: string
}) {
  return (
    <Pressable
      onPress={() => onChange(!actif)}
      accessibilityRole="switch"
      accessibilityLabel={libelle}
      accessibilityState={{ checked: actif }}
      hitSlop={8}
      style={[styles.piste, actif ? styles.actif : styles.inactif]}
    >
      <View style={[styles.pastille, actif && styles.pastilleActive]} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  piste: {
    width: 46,
    height: 28,
    borderRadius: rayons.pilule,
    padding: 3,
    justifyContent: 'center',
  },
  actif: {
    backgroundColor: couleurs.decor.sauge,
  },
  inactif: {
    backgroundColor: couleurs.trait.ligne,
  },
  pastille: {
    width: 22,
    height: 22,
    borderRadius: rayons.pilule,
    backgroundColor: couleurs.fond.carte,
  },
  pastilleActive: {
    alignSelf: 'flex-end',
  },
})
