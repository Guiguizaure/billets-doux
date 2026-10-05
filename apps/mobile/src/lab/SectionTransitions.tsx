import { router } from 'expo-router'
import { Platform, StyleSheet, View } from 'react-native'

import { Bouton } from '@/components/Bouton'
import { Section } from '@/components/Section'
import { Texte } from '@/components/Texte'
import { couleurs } from '@/theme/tokens'

/** Transitions entre écrans : le fondu est retenu (theme/navigation.ts), le glissement reste pour comparaison. */
export function SectionTransitions() {
  return (
    <Section titre="Transitions entre écrans">
      <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
        Choix retenu : le fondu, appliqué à toute l’appli. Le glissement reste ici pour comparaison.
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
