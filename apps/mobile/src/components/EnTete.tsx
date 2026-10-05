import type { FC } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import type { SvgProps } from 'react-native-svg'

import Retour from '@/assets/icons/Retour.svg'
import { couleurs, rayons } from '@/theme/tokens'

import { Texte } from './Texte'

type Action = { Icone: FC<SvgProps>; libelle: string; onPress: () => void; active?: boolean }

/** Composant Figma « En-tête » : retour rond à gauche, titre centré, action ronde à droite. */
export function EnTete({
  titre,
  retour,
  action,
}: {
  titre: string
  retour?: () => void
  action?: Action
}) {
  return (
    <View style={styles.enTete}>
      <View style={styles.emplacement}>
        {retour ? (
          <Pressable
            onPress={retour}
            accessibilityRole="button"
            accessibilityLabel="Retour"
            hitSlop={8}
            style={({ pressed }) => [styles.retour, pressed && styles.presse]}
          >
            <Retour width={20} height={20} color={couleurs.texte.encre} />
          </Pressable>
        ) : null}
      </View>
      <Texte variante="labelM" accessibilityRole="header">
        {titre}
      </Texte>
      <View style={styles.emplacement}>
        {action ? (
          <Pressable
            onPress={action.onPress}
            accessibilityRole="button"
            accessibilityLabel={action.libelle}
            accessibilityState={
              action.active === undefined ? undefined : { selected: action.active }
            }
            hitSlop={8}
            style={({ pressed }) => [
              styles.retour,
              action.active && styles.actif,
              pressed && styles.presse,
            ]}
          >
            <action.Icone
              width={20}
              height={20}
              color={action.active ? couleurs.fond.carte : couleurs.texte.encre}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  enTete: {
    height: 56,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emplacement: {
    width: 40,
    height: 40,
  },
  retour: {
    width: 40,
    height: 40,
    borderRadius: rayons.pilule,
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
    backgroundColor: couleurs.fond.carte,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actif: {
    backgroundColor: couleurs.texte.encre,
    borderColor: couleurs.texte.encre,
  },
  presse: {
    opacity: 0.7,
  },
})
