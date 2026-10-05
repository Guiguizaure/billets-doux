import {
  type CalendrierDestinataire,
  formaterHeure,
  heureLocale,
  libellesJour,
} from '@billets-doux/shared'
import { router, useLocalSearchParams } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'
import { Easing, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'

import { EnveloppeRituel } from '@/components/EnveloppeRituel'
import { LienTexte } from '@/components/LienTexte'
import { Texte } from '@/components/Texte'
import { api } from '@/lib/client'
import { messageErreur } from '@/lib/formulaires'
import { useSession } from '@/session/SessionProvider'
import { couleurs } from '@/theme/tokens'

/** Durée de l'appui long sur le cachet. */
const DUREE_APPUI = 1200
/** Choix validé à l'étape 1 : le cachet se brise ; apparition douce si animations réduites. */
const DUREE_CACHET = 900
const DUREE_DOUCE = 600

const CREME = couleurs.fond.carte

/** Étoiles du Figma (x, y, taille sur 393 × 852) et leurs couleurs. */
const ETOILES = [
  { x: 40, y: 120, t: 20, c: couleurs.decor.soleil },
  { x: 320, y: 100, t: 14, c: CREME },
  { x: 70, y: 260, t: 10, c: CREME },
  { x: 340, y: 300, t: 22, c: couleurs.decor.rose },
  { x: 30, y: 660, t: 16, c: CREME },
  { x: 350, y: 600, t: 12, c: couleurs.decor.soleil },
  { x: 180, y: 90, t: 10, c: couleurs.decor.lavande },
  { x: 300, y: 700, t: 18, c: CREME },
  { x: 60, y: 720, t: 12, c: couleurs.decor.rose },
]

/** Suite d'ids « a,b,c » des mots à ouvrir l'un après l'autre. */
const lireSuite = (suite?: string) => (suite ? suite.split(',').filter(Boolean) : [])

/**
 * Écran 2.3 Le moment de l'ouverture. Fond de nuit plein écran (exception validée :
 * texte crème sur nuit, 8,9:1). `?joker=1` : ouverture en avance, déjà confirmée en 2.2.
 * `?suite=` : les autres mots du jour, ouverts ensuite.
 */
export default function Ouverture() {
  const { id, joker, suite } = useLocalSearchParams<{
    id: string
    joker?: string
    suite?: string
  }>()
  const { moi } = useSession()
  const fuseau = moi?.utilisateur.fuseauHoraire ?? 'Europe/Paris'
  const reduit = useReducedMotion()
  const [cal, setCal] = useState<CalendrierDestinataire | null>(null)
  const [etat, setEtat] = useState<'attente' | 'ouverture'>('attente')
  const [erreur, setErreur] = useState<string | null>(null)
  const appui = useSharedValue(0)
  const casse = useSharedValue(0)
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let annule = false
    api
      .pourMoi()
      .then((c) => {
        if (!annule) setCal(c)
      })
      .catch((e: unknown) => {
        if (!annule) setErreur(messageErreur(e))
      })
    return () => {
      annule = true
    }
  }, [])

  useEffect(
    () => () => {
      if (minuteur.current) clearTimeout(minuteur.current)
    },
    [],
  )

  const kase = cal?.cases.find((c) => c.id === id)
  const lettre = cal?.lettres.find((l) => l.id === id)
  const dejaOuvert = kase?.etat === 'ouvert' || lettre?.etat === 'ouvert'

  // Déjà ouvert (autre appareil, retour arrière) : on passe directement à la lecture.
  useEffect(() => {
    if (dejaOuvert) router.replace({ pathname: '/mot/[id]', params: { id, suite } })
  }, [dejaOuvert, id, suite])

  const plusTard = () => (router.canGoBack() ? router.back() : router.replace('/pour-moi'))

  const ouvrir = async () => {
    setEtat('ouverture')
    setErreur(null)
    try {
      await api.ouvrir(id, joker === '1')
      const duree = reduit ? DUREE_DOUCE : DUREE_CACHET
      casse.set(withTiming(1, { duration: duree, easing: Easing.out(Easing.cubic) }))
      setTimeout(() => {
        router.replace({ pathname: '/mot/[id]', params: { id, suite } })
      }, duree)
    } catch (e) {
      setErreur(messageErreur(e))
      setEtat('attente')
      appui.set(withTiming(0, { duration: 200 }))
    }
  }

  const debutAppui = () => {
    if (etat !== 'attente') return
    appui.set(withTiming(1, { duration: DUREE_APPUI, easing: Easing.linear }))
    minuteur.current = setTimeout(() => void ouvrir(), DUREE_APPUI)
  }

  const finAppui = () => {
    if (etat !== 'attente' || !minuteur.current) return
    clearTimeout(minuteur.current)
    minuteur.current = null
    appui.set(withTiming(0, { duration: 200 }))
  }

  const prenom = cal?.expediteur.prenom ?? moi?.duo?.partenaire?.prenom ?? ''
  const surtitre = kase
    ? `${libellesJour(kase.jour).long} · ${formaterHeure(heureLocale(new Date(kase.unlockAt), fuseau))}`
    : lettre
      ? `Ouvre quand ${lettre.titre}`
      : ''
  const pret = Boolean(kase ?? lettre) && !dejaOuvert

  return (
    <SafeAreaView style={styles.nuit}>
      <StatusBar style="light" />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {ETOILES.map((e, i) => (
          <Etoile key={i} {...e} />
        ))}
      </View>

      <View style={styles.contenu}>
        <Texte variante="labelS" couleur={CREME} style={styles.centre}>
          {surtitre.toUpperCase()}
        </Texte>
        <Texte variante="titreL" couleur={CREME} style={styles.centre} accessibilityRole="header">
          <Texte variante="titreItaliqueL" couleur={CREME}>
            {prenom}
          </Texte>{' '}
          t’a écrit
        </Texte>

        {pret ? (
          <Pressable
            onPressIn={debutAppui}
            onPressOut={finAppui}
            disabled={etat !== 'attente'}
            accessibilityRole="button"
            accessibilityLabel={`Ouvrir le mot de ${prenom}`}
            accessibilityHint="Appui long sur le cachet"
            accessibilityActions={[{ name: 'activate' }]}
            // Lecteur d'écran : un double appui suffit, sans appui long.
            onAccessibilityAction={() => {
              if (etat === 'attente') void ouvrir()
            }}
          >
            <EnveloppeRituel appui={appui} casse={casse} reduit={reduit} />
          </Pressable>
        ) : (
          <View style={styles.attente}>{erreur ? null : <ActivityIndicator color={CREME} />}</View>
        )}

        <Texte
          variante="corpsM"
          couleur={CREME}
          style={styles.consigne}
          accessibilityLiveRegion="polite"
        >
          {erreur ??
            (etat === 'ouverture'
              ? 'Le cachet cède…'
              : 'Appuie longuement sur le cachet pour ouvrir')}
        </Texte>
      </View>

      <View style={styles.bas}>
        <LienTexte libelle="Plus tard" couleur={CREME} onPress={plusTard} />
        {lireSuite(suite).length > 0 ? (
          <Texte variante="labelS" couleur={CREME} style={styles.centre}>
            Encore {lireSuite(suite).length} après celui-ci
          </Texte>
        ) : null}
      </View>
    </SafeAreaView>
  )
}

function Etoile({ x, y, t, c }: { x: number; y: number; t: number; c: string }) {
  return (
    <View style={[styles.etoile, { left: `${(x / 393) * 100}%`, top: `${(y / 852) * 100}%` }]}>
      <Svg width={t} height={t} viewBox="0 0 16 16">
        <Path d="M8 0L10.08 5.92L16 8L10.08 10.08L8 16L5.92 10.08L0 8L5.92 5.92Z" fill={c} />
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  nuit: {
    flex: 1,
    backgroundColor: couleurs.decor.nuit,
  },
  etoile: {
    position: 'absolute',
  },
  contenu: {
    flex: 1,
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 24,
  },
  centre: {
    textAlign: 'center',
  },
  attente: {
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  consigne: {
    textAlign: 'center',
    maxWidth: 300,
    alignSelf: 'center',
  },
  bas: {
    gap: 6,
    paddingBottom: 24,
  },
})
