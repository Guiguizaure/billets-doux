import { router, useLocalSearchParams } from 'expo-router'
import { type FC, useEffect, useRef, useState } from 'react'
import {
  AccessibilityInfo,
  BackHandler,
  findNodeHandle,
  Platform,
  StyleSheet,
  View,
} from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import type { SvgProps } from 'react-native-svg'

import EnveloppeCachet from '@/assets/illustrations/enveloppe-cachet.svg'
import FilEntreNous from '@/assets/illustrations/fil-entre-nous.svg'
import TimbreLune from '@/assets/illustrations/timbre-lune.svg'
import { Bouton } from '@/components/Bouton'
import { Ecran } from '@/components/Ecran'
import { Texte } from '@/components/Texte'
import { cartesPrincipe } from '@/lib/tutoriel'
import { useSession } from '@/session/SessionProvider'
import { couleurs, rayons } from '@/theme/tokens'

/** L'illustration de chaque carte, à sa taille d'affichage. */
const ILLUSTRATIONS: { Illu: FC<SvgProps>; l: number; h: number }[] = [
  { Illu: EnveloppeCachet, l: 200, h: 150 },
  { Illu: TimbreLune, l: 108, h: 132 },
  { Illu: FilEntreNous, l: 280, h: 132 },
]

/**
 * Après l'écran 1.3 (et depuis « Revoir le tutoriel ») : le principe en trois cartes.
 * « Passer » en haut à droite ; le retour Android et Échap font de même.
 */
export default function Principe() {
  const { revoir } = useLocalSearchParams<{ revoir?: string }>()
  const { moi, api, appliquer } = useSession()
  const prenom = moi?.duo?.partenaire?.prenom ?? 'l’autre'
  const cartes = cartesPrincipe(prenom)
  const [index, setIndex] = useState(0)
  const [enCours, setEnCours] = useState(false)
  const titre = useRef<View>(null)
  const derniere = index === cartes.length - 1

  const terminer = async () => {
    if (enCours) return
    setEnCours(true)
    // Hors ligne : on continue quand même, les bulles des onglets attendront.
    await api
      .mettreAJour({ tutoriel: { cartesVues: true } })
      .then(appliquer)
      .catch(() => undefined)
    if (revoir === '1' && router.canGoBack()) router.back()
    else router.replace('/pour-moi')
  }
  const passer = useRef(terminer)
  useEffect(() => {
    passer.current = terminer
  })

  // Retour Android et Échap : « Passer ».
  useEffect(() => {
    if (Platform.OS === 'web') {
      const touche = (e: KeyboardEvent) => {
        if (e.key === 'Escape') void passer.current()
      }
      window.addEventListener('keydown', touche)
      return () => window.removeEventListener('keydown', touche)
    }
    const abonnement = BackHandler.addEventListener('hardwareBackPress', () => {
      void passer.current()
      return true
    })
    return () => abonnement.remove()
  }, [])

  // À chaque carte, le lecteur d'écran repart de son titre.
  useEffect(() => {
    if (Platform.OS === 'web') return
    const noeud = titre.current ? findNodeHandle(titre.current) : null
    if (noeud) AccessibilityInfo.setAccessibilityFocus(noeud)
  }, [index])

  const carte = cartes[index]!
  const { Illu, l, h } = ILLUSTRATIONS[index]!

  return (
    <Ecran
      enTete={
        <View style={styles.haut}>
          <Bouton libelle="Passer" variante="discret" compact onPress={() => void terminer()} />
        </View>
      }
      actions={
        <Bouton
          libelle={derniere ? 'Commencer' : 'Suivant'}
          pleineLargeur
          enCours={enCours}
          onPress={() => (derniere ? void terminer() : setIndex(index + 1))}
        />
      }
    >
      <Animated.View key={index} entering={FadeIn.duration(260)} style={styles.carte}>
        <View style={styles.illustration} accessible={false}>
          <Illu width={l} height={h} />
        </View>
        <View ref={titre} accessible accessibilityRole="header">
          <Texte variante="titreL" style={styles.centre}>
            {carte.titre}
          </Texte>
        </View>
        <Texte variante="corpsM" couleur={couleurs.texte.encreDouce} style={styles.texte}>
          {carte.texte}
        </Texte>
      </Animated.View>
      <View
        style={styles.points}
        accessible
        accessibilityLabel={`Carte ${index + 1} sur ${cartes.length}`}
      >
        {cartes.map((c, i) => (
          <View key={c.titre} style={[styles.point, i === index && styles.pointActif]} />
        ))}
      </View>
    </Ecran>
  )
}

const styles = StyleSheet.create({
  haut: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  carte: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingTop: 12,
  },
  illustration: {
    height: 150,
    justifyContent: 'center',
    marginBottom: 12,
  },
  centre: {
    textAlign: 'center',
  },
  texte: {
    textAlign: 'center',
    maxWidth: 320,
  },
  points: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  point: {
    width: 8,
    height: 8,
    borderRadius: rayons.pilule,
    backgroundColor: couleurs.trait.ligne,
  },
  pointActif: {
    width: 22,
    backgroundColor: couleurs.action.cachet,
  },
})
