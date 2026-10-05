import { Redirect, router } from 'expo-router'
import Head from 'expo-router/head'
import { ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Bouton } from '@/components/Bouton'
import { Texte } from '@/components/Texte'
import { SectionAnimations } from '@/lab/SectionAnimations'
import { SectionPalette } from '@/lab/SectionPalette'
import { SectionStyles } from '@/lab/SectionStyles'
import { SectionTypo } from '@/lab/SectionTypo'
import { couleurs } from '@/theme/tokens'

/** Page de test temporaire : variantes visuelles côte à côte, à valider en local. */
export default function Lab() {
  if (!__DEV__) return <Redirect href="/" />

  return (
    <SafeAreaView style={styles.ecran}>
      <Head>
        <title>Page de test · Billets doux</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <ScrollView contentContainerStyle={styles.contenu}>
        <Bouton
          libelle="Retour"
          variante="discret"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
        <Texte variante="titreL" accessibilityRole="header">
          Page de test
        </Texte>
        <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
          Temporaire, non indexée, visible en développement seulement. Les choix faits ici
          deviennent les règles de l’appli.
        </Texte>
        <SectionPalette />
        <SectionTypo />
        <SectionStyles />
        <SectionAnimations />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  ecran: {
    flex: 1,
    backgroundColor: couleurs.fond.papier,
  },
  contenu: {
    gap: 40,
    padding: 16,
    paddingBottom: 64,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
  },
})
