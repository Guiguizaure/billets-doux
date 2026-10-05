import Constants, { ExecutionEnvironment } from 'expo-constants'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { Platform } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { SessionProvider, useSession } from '@/session/SessionProvider'
import { fichiersPolices } from '@/theme/polices'
import { couleurs } from '@/theme/tokens'

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
        <StatusBar style="dark" />
        {policesPretes ? <Navigation /> : null}
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
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: couleurs.fond.papier },
      }}
    />
  )
}
