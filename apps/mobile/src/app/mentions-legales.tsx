import { router } from 'expo-router'
import Head from 'expo-router/head'
import { StyleSheet, View } from 'react-native'

import { Ecran } from '@/components/Ecran'
import { EnTete } from '@/components/EnTete'
import { LienTexte } from '@/components/LienTexte'
import { Texte } from '@/components/Texte'
import { SECTIONS_MENTIONS } from '@/lib/mentionsLegales'

const revenir = () => (router.canGoBack() ? router.back() : router.replace('/'))

/** Mentions légales, accessibles avec ou sans compte (texte : lib/mentionsLegales.ts). */
export default function MentionsLegales() {
  return (
    <Ecran enTete={<EnTete titre="Mentions légales" retour={revenir} />}>
      <Head>
        <title>Mentions légales · Billets doux</title>
        <meta name="description" content="Éditeur et hébergeurs de Billets doux." />
      </Head>
      {SECTIONS_MENTIONS.map((section) => (
        <View key={section.titre} style={styles.section}>
          <Texte variante="titreM" accessibilityRole="header">
            {section.titre}
          </Texte>
          {section.paragraphes.map((paragraphe) => (
            <Texte key={paragraphe} variante="corpsM">
              {paragraphe}
            </Texte>
          ))}
        </View>
      ))}
      <LienTexte libelle="Confidentialité" onPress={() => router.push('/confidentialite')} />
    </Ecran>
  )
}

const styles = StyleSheet.create({
  section: {
    gap: 8,
  },
})
