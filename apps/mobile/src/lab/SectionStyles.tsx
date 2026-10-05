import { StyleSheet, View } from 'react-native'

import Plume from '@/assets/icons/Plume.svg'
import { Bouton } from '@/components/Bouton'
import { Case } from '@/components/Case'
import { Section } from '@/components/Section'
import { Texte } from '@/components/Texte'
import { couleurs, rayons } from '@/theme/tokens'

import { exemplesCases } from './exemplesCases'
import { BoutonNW } from './nativewind/BoutonNW'
import { CaseNW } from './nativewind/CaseNW'

const colonnes = [
  {
    titre: 'StyleSheet',
    notes: [
      'API native de React Native, rien à configurer ni à maintenir.',
      'Tokens importés depuis tokens.ts : autocomplétion et vérification TypeScript.',
      'Plus verbeux ; styles séparés du balisage.',
    ],
    Bouton: Bouton,
    Case: Case,
  },
  {
    titre: 'NativeWind (Tailwind 3)',
    notes: [
      'Classes courtes dans le balisage, proches du code généré par Figma.',
      'Couche de compilation en plus (Babel, Metro) et noms de classes non typés.',
      'Ombres CSS et quelques propriétés repassent par le style direct.',
    ],
    Bouton: BoutonNW,
    Case: CaseNW,
  },
] as const

export function SectionStyles() {
  return (
    <Section titre="Styles : StyleSheet ou NativeWind">
      <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
        Mêmes composants Figma (Bouton, Case du calendrier), écrits des deux façons. Le rendu doit
        être identique : c’est l’écriture qui change.
      </Texte>
      <View style={styles.colonnes}>
        {colonnes.map(({ titre, notes, Bouton: B, Case: C }) => (
          <View key={titre} style={styles.colonne}>
            <Texte variante="titreM">{titre}</Texte>
            {notes.map((n) => (
              <Texte key={n} variante="corpsS" couleur={couleurs.texte.encreDouce}>
                • {n}
              </Texte>
            ))}
            <View style={styles.boutons}>
              <B libelle="Programmer le mot" variante="principal" Icone={Plume} />
              <B libelle="Programmer le mot" variante="secondaire" Icone={Plume} />
              <B libelle="Programmer le mot" variante="discret" Icone={Plume} />
            </View>
            <View style={styles.cases}>
              {exemplesCases.map((c) => (
                <C key={c.etat} {...c} />
              ))}
            </View>
          </View>
        ))}
      </View>
    </Section>
  )
}

const styles = StyleSheet.create({
  colonnes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  colonne: {
    flexGrow: 1,
    flexBasis: 320,
    gap: 8,
    padding: 16,
    borderRadius: rayons.case,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: couleurs.trait.ligne,
  },
  boutons: {
    gap: 12,
    marginTop: 8,
  },
  cases: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
    paddingBottom: 8,
  },
})
