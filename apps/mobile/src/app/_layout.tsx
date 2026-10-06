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
  const { phase } = useSession()

  // L'écran de démarrage reste visible tant qu'on ne sait pas où envoyer la personne.
  useEffect(() => {
    if (phase !== 'chargement') SplashScreen.hideAsync()
  }, [phase])

  return (
    <Stack screenOptions={optionsPile}>
      <Stack.Screen name="lab/glissement" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="lab/fondu" options={{ animation: 'fade' }} />
    </Stack>
  )
}
