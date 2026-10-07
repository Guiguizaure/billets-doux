import { router } from 'expo-router'
import Head from 'expo-router/head'
import { Linking, StyleSheet, View } from 'react-native'

import { Ecran } from '@/components/Ecran'
import { EnTete } from '@/components/EnTete'
import { LienTexte } from '@/components/LienTexte'
import { Texte } from '@/components/Texte'
import { CONTACT, MISE_A_JOUR, SECTIONS } from '@/lib/confidentialite'
import { couleurs } from '@/theme/tokens'

const revenir = () => (router.canGoBack() ? router.back() : router.replace('/'))

/** Politique de confidentialité, accessible avec ou sans compte (texte : lib/confidentialite.ts). */
export default function Confidentialite() {
  return (
    <Ecran enTete={<EnTete titre="Confidentialité" retour={revenir} />}>
      <Head>
        <title>Confidentialité · Billets doux</title>
        <meta
          name="description"
          content="Ce que Billets doux enregistre, pourquoi, où, combien de temps, et tes droits."
        />
      </Head>
      <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
        Mise à jour le {MISE_A_JOUR}
      </Texte>
      {SECTIONS.map((section) => (
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
      <View style={styles.liens}>
        <LienTexte
          libelle={`Écrire à ${CONTACT}`}
          onPress={() => void Linking.openURL(`mailto:${CONTACT}`)}
        />
        <LienTexte
          libelle="Supprimer mon compte"
          onPress={() => router.push('/supprimer-mon-compte')}
        />
        <LienTexte libelle="Mentions légales" onPress={() => router.push('/mentions-legales')} />
      </View>
    </Ecran>
  )
}

const styles = StyleSheet.create({
  section: {
    gap: 8,
  },
  liens: {
    gap: 8,
    paddingVertical: 8,
  },
})
