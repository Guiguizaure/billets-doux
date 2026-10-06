import Constants, { ExecutionEnvironment } from 'expo-constants'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { BandeauReseau } from '@/components/BandeauReseau'
import { ChoixProvider } from '@/components/Choix'
import { DialogueProvider } from '@/components/Dialogue'
import { fuseauDuTelephone } from '@/lib/fuseau'
import { enregistrerCetAppareil, useOuvertureDesNotifications } from '@/lib/notifications'
import { SessionProvider, useSession } from '@/session/SessionProvider'
import { fichiersPolices } from '@/theme/polices'
import { optionsPile } from '@/theme/navigation'
import { LARGEUR_CADRE, PageDemo } from '@/web/PageDemo'

SplashScreen.preventAutoHideAsync()

/**
 * Les builds natifs embarquent les polices (plugin expo-font) : rien à charger.
 * Le web et Expo Go les chargent au démarrage.
 */
const chargerPolices =
  Platform.OS === 'web' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient

/** Variante du cadre de la version web, choisie sur la page de test. */
const VARIANTE_CADRE = 'telephone'

/**
 * Version web sur grand écran, page principale (pas déjà dans le cadre, pas la page de test) :
 * on présente l'appli dans un cadre de téléphone.
 */
function pageAEncadrer(largeur: number) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null
  if (window.self !== window.top || largeur < LARGEUR_CADRE) return null
  const chemin = `${window.location.pathname}${window.location.search}`
  return chemin.startsWith('/lab') ? null : chemin
}

export default function RootLayout() {
  const [policesChargees, erreurPolices] = useFonts(chargerPolices ? fichiersPolices : {})
  const policesPretes = policesChargees || erreurPolices !== null
  const { width } = useWindowDimensions()
  const encadre = pageAEncadrer(width)

  return (
    <SafeAreaProvider>
      <SessionProvider>
        <DialogueProvider>
          <ChoixProvider>
            <StatusBar style="dark" />
            {!policesPretes ? null : encadre !== null ? (
              <PageDemo variante={VARIANTE_CADRE} chemin={encadre} />
            ) : (
              <Navigation />
            )}
          </ChoixProvider>
        </DialogueProvider>
      </SessionProvider>
    </SafeAreaProvider>
  )
}

function Navigation() {
  const { phase, moi, api, appliquer } = useSession()
  const fuseauCompte = moi?.utilisateur.fuseauHoraire

  // L'écran de démarrage reste visible tant qu'on ne sait pas où envoyer la personne.
  useEffect(() => {
    if (phase !== 'chargement') SplashScreen.hideAsync()
  }, [phase])

  // Duo formé : cet appareil (s'il l'autorise) reçoit les notifications, et les toucher
  // ouvre le bon écran.
  useEffect(() => {
    if (phase === 'duo') void enregistrerCetAppareil()
  }, [phase])
  useOuvertureDesNotifications(phase === 'duo')

  // Voyage, déménagement : le compte suit le fuseau du téléphone, pour que les mots
  // s'ouvrent toujours à l'heure choisie, heure locale (l'API recalcule les ouvertures).
  useEffect(() => {
    if (!fuseauCompte || (phase !== 'duo' && phase !== 'sansDuo')) return
    const fuseau = fuseauDuTelephone()
    if (fuseau === fuseauCompte) return
    api
      .mettreAJour({ fuseauHoraire: fuseau })
      .then(appliquer)
      .catch(() => undefined)
  }, [phase, fuseauCompte, api, appliquer])

  return (
    <View style={styles.plein}>
      <Stack screenOptions={optionsPile}>
        <Stack.Screen name="lab/glissement" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="lab/fondu" options={{ animation: 'fade' }} />
      </Stack>
      <BandeauReseau />
    </View>
  )
}

const styles = StyleSheet.create({
  plein: {
    flex: 1,
  },
})
