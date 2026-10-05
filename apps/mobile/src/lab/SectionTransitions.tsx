import { router } from 'expo-router'
import { Platform, StyleSheet, View } from 'react-native'

import { Bouton } from '@/components/Bouton'
import { Section } from '@/components/Section'
import { Texte } from '@/components/Texte'
import { couleurs } from '@/theme/tokens'

/** Transitions entre écrans : glissement (Android par défaut) ou fondu. */
export function SectionTransitions() {
  return (
    <Section titre="Transitions entre écrans">
      <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
        Ouvre le même écran avec chaque transition, puis reviens en arrière.
        {Platform.OS === 'web'
          ? ' Sur le web, la navigation n’est pas animée : compare sur le téléphone.'
          : ''}
      </Texte>
      <View style={styles.boutons}>
        <Bouton
          libelle="Glissement"
          variante="secondaire"
          onPress={() => router.push('/lab/glissement')}
        />
        <Bouton libelle="Fondu" variante="secondaire" onPress={() => router.push('/lab/fondu')} />
      </View>
    </Section>
  )
}

const styles = StyleSheet.create({
  boutons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
})
