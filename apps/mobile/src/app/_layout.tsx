import Constants, { ExecutionEnvironment } from 'expo-constants'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { Platform } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { ChoixProvider } from '@/components/Choix'
import { DialogueProvider } from '@/components/Dialogue'
import { fuseauDuTelephone } from '@/lib/fuseau'
import { enregistrerCetAppareil, useOuvertureDesNotifications } from '@/lib/notifications'
import { SessionProvider, useSession } from '@/session/SessionProvider'
import { fichiersPolices } from '@/theme/polices'
import { optionsPile } from '@/theme/navigation'

SplashScreen.preventAutoHideAsync()

/**
 * Les builds natifs embarquent les polices (plugin expo-font) : rien à charger.
 * Le web et Expo Go les chargent au démarrage.
 */
const chargerPolices =
  Platform.OS === 'web' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient

export default function RootLayout() {
  const [policesChargees, erreurPolices] = useFonts(chargerPolices ? fichiersPolices : {})
  const policesPretes = policesChargees || erreurPolices !== null

  return (
    <SafeAreaProvider>
      <SessionProvider>
        <DialogueProvider>
          <ChoixProvider>
            <StatusBar style="dark" />
            {policesPretes ? <Navigation /> : null}
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
    <Stack screenOptions={optionsPile}>
      <Stack.Screen name="lab/glissement" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="lab/fondu" options={{ animation: 'fade' }} />
    </Stack>
  )
}
