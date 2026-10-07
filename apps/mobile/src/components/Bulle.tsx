import { useEffect, useRef } from 'react'
import { AccessibilityInfo, findNodeHandle, Platform, StyleSheet, View } from 'react-native'
import Animated, { FadeIn, FadeInDown, FadeInUp, useReducedMotion } from 'react-native-reanimated'

import TimbreLune from '@/assets/illustrations/timbre-lune.svg'
import { couleurs, rayons } from '@/theme/tokens'

import { Bouton } from './Bouton'
import { Texte } from './Texte'

export type VarianteBulle = 'carte' | 'etiquette'

/**
 * Une bulle du tutoriel : une phrase, « Suivant » (ou « Terminer », « Compris ») et « Passer ».
 * - `carte` : carte crème bordée de « ligne », petite flèche vers l'élément ;
 * - `etiquette` : étiquette papier ombre, timbre-lune en coin, écriture manuscrite.
 * Le lecteur d'écran se place sur la bulle et la lit ; avec animations réduites, simple fondu.
 */
export function Bulle({
  variante,
  texte,
  etape,
  total,
  fleche,
  flecheX = 0,
  libelleSuivant,
  onSuivant,
  onPasser,
}: {
  variante: VarianteBulle
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
  const fond = variante === 'carte' ? couleurs.fond.carte : couleurs.fond.papierOmbre

  return (
    <Animated.View entering={entree.duration(220)} style={styles.colonne}>
      {fleche === 'haut' ? (
        <Fleche couleur={fond} carte={variante === 'carte'} x={flecheX} haut />
      ) : null}
      <View
        ref={ref}
        accessible
        accessibilityRole="alert"
        accessibilityLabel={etape && total ? `${etape} sur ${total}. ${texte}` : texte}
        style={[styles.bulle, variante === 'carte' ? styles.carte : styles.etiquette, styles.haut]}
      >
        {variante === 'etiquette' ? (
          <View style={styles.timbre} accessible={false}>
            <TimbreLune width={30} height={37} />
          </View>
        ) : null}
        <Texte
          variante={variante === 'etiquette' ? 'manuscritM' : 'corpsM'}
          style={variante === 'etiquette' ? styles.texteEtiquette : null}
        >
          {texte}
        </Texte>
      </View>
      <View
        style={[
          styles.actions,
          variante === 'carte' ? styles.carte : styles.etiquette,
          styles.pied,
        ]}
      >
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
      {fleche === 'bas' ? <Fleche couleur={fond} carte={variante === 'carte'} x={flecheX} /> : null}
    </Animated.View>
  )
}

/** Petite flèche (carré tourné) qui pointe vers l'élément. */
function Fleche({
  couleur,
  carte,
  x,
  haut,
}: {
  couleur: string
  carte: boolean
  x: number
  haut?: boolean
}) {
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
          { backgroundColor: couleur },
          haut ? styles.flechePlaceHaut : styles.flechePlaceBas,
          // Bordure seulement pour la carte (l'étiquette n'en a pas).
          carte && styles.flecheBordure,
          carte && (haut ? styles.bordureHaut : styles.bordureBas),
        ]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  colonne: {
    width: '100%',
    maxWidth: 340,
  },
  bulle: {
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    borderTopLeftRadius: rayons.carte,
    borderTopRightRadius: rayons.carte,
  },
  // Bulle en deux blocs (texte, puis boutons) : pas de trait entre les deux.
  haut: {
    borderBottomWidth: 0,
    boxShadow: 'none',
  },
  pied: {
    borderTopWidth: 0,
    borderBottomLeftRadius: rayons.carte,
    borderBottomRightRadius: rayons.carte,
  },
  carte: {
    backgroundColor: couleurs.fond.carte,
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
    boxShadow: '0px 12px 30px -12px rgba(42, 35, 70, 0.35)',
  },
  // Sans voile : l'ombre la détache de ce qu'elle recouvre (une case de même couleur…).
  etiquette: {
    backgroundColor: couleurs.fond.papierOmbre,
    boxShadow: '0px 12px 30px -12px rgba(42, 35, 70, 0.35)',
  },
  texteEtiquette: {
    paddingRight: 34,
  },
  timbre: {
    position: 'absolute',
    top: -10,
    right: 10,
    transform: [{ rotate: '8deg' }],
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 4,
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
  },
  flecheBordure: {
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
