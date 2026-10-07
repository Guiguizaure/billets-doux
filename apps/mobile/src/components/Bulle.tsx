import { useEffect, useRef } from 'react'
import { AccessibilityInfo, findNodeHandle, Platform, StyleSheet, View } from 'react-native'
import Animated, { FadeIn, FadeInDown, FadeInUp, useReducedMotion } from 'react-native-reanimated'

import TimbreLune from '@/assets/illustrations/timbre-lune.svg'
import { couleurs, rayons } from '@/theme/tokens'

import { Bouton } from './Bouton'
import { Texte } from './Texte'

/** Largeur maximale d'une bulle (la flèche se décale pour viser l'élément). */
export const LARGEUR_BULLE = 340

/**
 * Une bulle du tutoriel (style choisi à l'étape 8) : carte crème bordée de « ligne », petite
 * flèche vers l'élément, timbre-lune en coin et phrase manuscrite ; « Suivant » (ou
 * « Terminer », « Compris ») et « Passer ». Le lecteur d'écran se place sur la bulle et la lit ;
 * avec animations réduites, simple fondu.
 */
export function Bulle({
  texte,
  etape,
  total,
  fleche,
  flecheX = 0,
  libelleSuivant,
  onSuivant,
  onPasser,
}: {
  texte: string
  /** Position dans la visite (1, 2…) ; absente pour une bulle seule. */
  etape?: number
  total?: number
  /** Côté de la flèche : vers l'élément au-dessus (`haut`), en dessous (`bas`), ou aucune. */
  fleche: 'haut' | 'bas' | null
  /** Décalage horizontal de la flèche par rapport au centre de la bulle (px). */
  flecheX?: number
  libelleSuivant: string
  onSuivant: () => void
  onPasser?: () => void
}) {
  const reduit = useReducedMotion()
  const ref = useRef<View>(null)

  // Le focus du lecteur d'écran va sur la bulle, qui se lit d'emblée.
  useEffect(() => {
    if (Platform.OS === 'web') return
    const noeud = ref.current ? findNodeHandle(ref.current) : null
    if (noeud) AccessibilityInfo.setAccessibilityFocus(noeud)
  }, [texte])

  const entree = reduit ? FadeIn : fleche === 'bas' ? FadeInDown : FadeInUp

  return (
    <Animated.View entering={entree.duration(220)} style={styles.colonne}>
      {fleche === 'haut' ? <Fleche x={flecheX} haut /> : null}
      <View
        ref={ref}
        accessible
        accessibilityRole="alert"
        accessibilityLabel={etape && total ? `${etape} sur ${total}. ${texte}` : texte}
        style={[styles.carte, styles.haut]}
      >
        <View style={styles.timbre} accessible={false}>
          <TimbreLune width={30} height={37} />
        </View>
        <Texte variante="manuscritM" style={styles.texte}>
          {texte}
        </Texte>
      </View>
      <View style={[styles.carte, styles.pied]}>
        {etape && total ? (
          <Texte variante="labelS" couleur={couleurs.texte.encreDouce} accessible={false}>
            {etape} / {total}
          </Texte>
        ) : (
          <View />
        )}
        <View style={styles.boutons}>
          {onPasser ? (
            <Bouton libelle="Passer" variante="discret" compact onPress={onPasser} />
          ) : null}
          <Bouton libelle={libelleSuivant} compact onPress={onSuivant} />
        </View>
      </View>
      {fleche === 'bas' ? <Fleche x={flecheX} /> : null}
    </Animated.View>
  )
}

/** Petite flèche (carré tourné, bordé de « ligne ») qui pointe vers l'élément. */
function Fleche({ x, haut }: { x: number; haut?: boolean }) {
  return (
    <View
      style={[
        styles.flecheZone,
        haut ? styles.flecheHaut : styles.flecheBas,
        { transform: [{ translateX: x }] },
      ]}
    >
      <View
        style={[
          styles.fleche,
          haut ? styles.flechePlaceHaut : styles.flechePlaceBas,
          haut ? styles.bordureHaut : styles.bordureBas,
        ]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  colonne: {
    width: '100%',
    maxWidth: LARGEUR_BULLE,
  },
  carte: {
    backgroundColor: couleurs.fond.carte,
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
  },
  // Bulle en deux blocs (phrase, puis boutons) : pas de trait entre les deux.
  haut: {
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    borderBottomWidth: 0,
    borderTopLeftRadius: rayons.carte,
    borderTopRightRadius: rayons.carte,
  },
  pied: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 4,
    borderTopWidth: 0,
    borderBottomLeftRadius: rayons.carte,
    borderBottomRightRadius: rayons.carte,
    // L'ombre la détache de ce qu'elle recouvre (une case de même couleur…).
    boxShadow: '0px 12px 30px -12px rgba(42, 35, 70, 0.35)',
  },
  timbre: {
    position: 'absolute',
    top: -10,
    right: 10,
    transform: [{ rotate: '8deg' }],
  },
  texte: {
    paddingRight: 34,
  },
  boutons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  flecheZone: {
    height: 9,
    alignItems: 'center',
    zIndex: 1,
  },
  flecheHaut: {
    marginBottom: -1,
  },
  flecheBas: {
    marginTop: -1,
  },
  fleche: {
    width: 16,
    height: 16,
    transform: [{ rotate: '45deg' }],
    backgroundColor: couleurs.fond.carte,
    borderColor: couleurs.trait.ligne,
  },
  flechePlaceHaut: {
    marginTop: 1,
  },
  flechePlaceBas: {
    marginTop: -8,
  },
  bordureHaut: {
    borderTopWidth: 1,
    borderLeftWidth: 1,
  },
  bordureBas: {
    borderBottomWidth: 1,
    borderRightWidth: 1,
  },
})
