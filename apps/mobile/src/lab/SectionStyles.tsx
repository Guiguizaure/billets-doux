import { StyleSheet, View } from 'react-native'

import Plume from '@/assets/icons/Plume.svg'
import { Bouton } from '@/components/Bouton'
import { Case } from '@/components/Case'
import { Section } from '@/components/Section'
import { Texte } from '@/components/Texte'
import { couleurs } from '@/theme/tokens'

import { exemplesCases } from './exemplesCases'

export function SectionStyles() {
  return (
    <Section titre="Composants">
      <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
        Composants Figma (Bouton, Case du calendrier), écrits avec StyleSheet.
      </Texte>
      <View style={styles.boutons}>
        <Bouton libelle="Programmer le mot" variante="principal" Icone={Plume} />
        <Bouton libelle="Programmer le mot" variante="secondaire" Icone={Plume} />
        <Bouton libelle="Programmer le mot" variante="discret" Icone={Plume} />
      </View>
      <View style={styles.cases}>
        {exemplesCases.map((c) => (
          <Case key={c.etat} {...c} />
        ))}
      </View>
    </Section>
  )
}

const styles = StyleSheet.create({
  boutons: {
    gap: 12,
  },
  cases: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 8,
  },
})
