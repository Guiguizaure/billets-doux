import type { BottomTabBarProps } from 'expo-router/js-tabs'
import type { FC } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import type { SvgProps } from 'react-native-svg'

import Boite from '@/assets/icons/Boite.svg'
import Calendrier from '@/assets/icons/Calendrier.svg'
import Duo from '@/assets/icons/Duo.svg'
import Plume from '@/assets/icons/Plume.svg'
import { couleurs } from '@/theme/tokens'

import { Texte } from './Texte'

const icones: Record<string, FC<SvgProps>> = {
  'pour-moi': Calendrier,
  'pour-toi': Plume,
  souvenirs: Boite,
  'nous-deux': Duo,
}

/** Composant Figma « Barre d'onglets » : onglet actif en rouge cachet, les autres en encre douce. */
export function BarreOnglets({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  return (
    <View style={[styles.barre, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View accessibilityRole="tablist" style={styles.onglets}>
        {state.routes.map((route, index) => {
          const actif = state.index === index
          const libelle = descriptors[route.key]?.options.title ?? route.name
          const Icone = icones[route.name]
          const couleur = actif ? couleurs.action.cachet : couleurs.texte.encreDouce
          const appuyer = () => {
            const evenement = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            })
            if (!actif && !evenement.defaultPrevented) navigation.navigate(route.name, route.params)
          }
          return (
            <Pressable
              key={route.key}
              onPress={appuyer}
              accessibilityRole="tab"
              accessibilityState={{ selected: actif }}
              accessibilityLabel={libelle}
              style={styles.onglet}
            >
              {Icone ? <Icone width={24} height={24} color={couleur} /> : null}
              <Texte variante="labelS" couleur={couleur}>
                {libelle}
              </Texte>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  barre: {
    backgroundColor: couleurs.fond.carte,
    borderTopWidth: 1,
    borderTopColor: couleurs.trait.ligne,
    paddingTop: 10,
  },
  onglets: {
    flexDirection: 'row',
    width: '100%',
    // Même colonne que le contenu des écrans sur grand écran (web).
    maxWidth: 480,
    alignSelf: 'center',
  },
  onglet: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
})
