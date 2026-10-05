import { Pressable, StyleSheet, View } from 'react-native'

import { couleurs, rayons } from '@/theme/tokens'

import { Texte } from './Texte'

type Option<T extends string> = { valeur: T; libelle: string }

/** « Mode (segments) » du Figma (3.5) : un choix exclusif sur fond papier ombre. */
export function Segments<T extends string>({
  options,
  valeur,
  onChange,
  libelle,
}: {
  options: Option<T>[]
  valeur: T
  onChange: (valeur: T) => void
  libelle: string
}) {
  return (
    <View style={styles.conteneur} accessibilityRole="radiogroup" accessibilityLabel={libelle}>
      {options.map((option) => {
        const actif = option.valeur === valeur
        return (
          <Pressable
            key={option.valeur}
            onPress={() => onChange(option.valeur)}
            accessibilityRole="radio"
            accessibilityState={{ checked: actif }}
            accessibilityLabel={option.libelle}
            style={[styles.segment, actif && styles.actif]}
          >
            <Texte
              variante={actif ? 'labelM' : 'corpsS'}
              couleur={actif ? couleurs.texte.encre : couleurs.texte.encreDouce}
              numberOfLines={1}
              style={styles.texte}
            >
              {option.libelle}
            </Texte>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  conteneur: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: rayons.pilule,
    backgroundColor: couleurs.fond.papierOmbre,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: rayons.pilule,
  },
  actif: {
    backgroundColor: couleurs.fond.carte,
    boxShadow: '0px 2px 6px 0px rgba(41, 36, 69, 0.12)',
  },
  texte: {
    fontSize: 14,
  },
})
