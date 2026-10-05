import { useState } from 'react'
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native'

import { Puce } from '@/components/Puce'
import { Section } from '@/components/Section'
import { Texte } from '@/components/Texte'
import { couleurs, typo, type StyleTexte } from '@/theme/tokens'

const exemples: { style: StyleTexte; nom: string; texte: string }[] = [
  {
    style: 'titreXL',
    nom: 'Titre XL — Instrument Serif 42',
    texte: 'Tes petits mots, au fil des jours',
  },
  { style: 'titreL', nom: 'Titre L — Instrument Serif 32', texte: 'Ce matin, une case s’ouvre' },
  {
    style: 'titreItaliqueL',
    nom: 'Titre italique L — Instrument Serif Italic 32',
    texte: 'quelque part cette semaine…',
  },
  { style: 'titreM', nom: 'Titre M — Instrument Serif 24', texte: 'Calendrier d’octobre' },
  {
    style: 'corpsM',
    nom: 'Corps M — DM Sans 16',
    texte: 'Prépare tes mots à l’avance : ils s’ouvriront le jour choisi.',
  },
  { style: 'corpsS', nom: 'Corps S — DM Sans 14', texte: 'Livré à 8 h, heure choisie par Lina' },
  { style: 'labelM', nom: 'Label M — DM Sans SemiBold 15', texte: 'Programmer le mot' },
  { style: 'labelS', nom: 'Label S — DM Sans Medium 12', texte: 'DANS 3 JOURS' },
  {
    style: 'manuscritL',
    nom: 'Manuscrit L — Caveat 30',
    texte: 'Bonjour toi, j’ai rêvé de la mer',
  },
  { style: 'manuscritM', nom: 'Manuscrit M — Caveat 23', texte: 'pense à moi en buvant ton café' },
  { style: 'chiffreCase', nom: 'Chiffre de case — Instrument Serif 30', texte: '12' },
]

const echelles = [1, 1.3, 2] as const

export function SectionTypo() {
  const { fontScale } = useWindowDimensions()
  const [echelle, setEchelle] = useState<(typeof echelles)[number]>(1)

  return (
    <Section titre="Typographie">
      <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
        Taille de texte du système : ×{fontScale.toFixed(2).replace('.', ',')}. Les puces simulent
        d’autres réglages pour vérifier que rien ne se chevauche.
      </Texte>
      <View style={styles.puces} accessibilityRole="radiogroup">
        {echelles.map((e) => (
          <Puce
            key={e}
            libelle={`×${String(e).replace('.', ',')}`}
            active={echelle === e}
            onPress={() => setEchelle(e)}
          />
        ))}
      </View>
      {exemples.map(({ style, nom, texte }) => {
        const base = typo[style]
        return (
          <View key={style} style={styles.exemple}>
            <Texte variante="labelS" couleur={couleurs.texte.encreDouce}>
              {nom}
            </Texte>
            {/* Simulation : on multiplie nous-mêmes, sans cumuler avec le réglage système. */}
            <Text
              allowFontScaling={echelle === 1}
              style={[
                base,
                { color: couleurs.texte.encre },
                echelle !== 1 && {
                  fontSize: base.fontSize * echelle,
                  lineHeight: base.lineHeight * echelle,
                },
              ]}
            >
              {texte}
            </Text>
          </View>
        )
      })}
    </Section>
  )
}

const styles = StyleSheet.create({
  puces: {
    flexDirection: 'row',
    gap: 8,
  },
  exemple: {
    gap: 4,
  },
})
