import { StyleSheet, View } from 'react-native'

import { Section } from '@/components/Section'
import { Texte } from '@/components/Texte'
import { ratioContraste } from '@/theme/contraste'
import { couleurs } from '@/theme/tokens'

type Pastille = { nom: string; hex: string; note: string }

/** Noms des variables Figma : papierOmbre → papier-ombre. */
const figma = (nom: string) => nom.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)

const ratio = (a: string, b: string) => `${ratioContraste(a, b).toFixed(1).replace('.', ',')}:1`

const groupes: { titre: string; pastilles: Pastille[] }[] = [
  {
    titre: 'Fonds',
    pastilles: Object.entries(couleurs.fond).map(([nom, hex]) => ({
      nom: `fond/${figma(nom)}`,
      hex,
      note: `encre ${ratio(hex, couleurs.texte.encre)} · encre douce ${ratio(hex, couleurs.texte.encreDouce)}`,
    })),
  },
  {
    titre: 'Texte et traits',
    pastilles: [
      ...Object.entries(couleurs.texte).map(([nom, hex]) => ({
        nom: `texte/${figma(nom)}`,
        hex,
        note:
          hex === couleurs.texte.surCachet
            ? `sur cachet ${ratio(hex, couleurs.action.cachet)}`
            : `sur papier ${ratio(hex, couleurs.fond.papier)}`,
      })),
      {
        nom: 'trait/ligne',
        hex: couleurs.trait.ligne,
        note: 'traits et bordures seulement',
      },
    ],
  },
  {
    titre: 'Action',
    pastilles: [
      {
        nom: 'action/cachet',
        hex: couleurs.action.cachet,
        note: `texte crème ${ratio(couleurs.action.cachet, couleurs.texte.surCachet)} · réservé aux actions`,
      },
    ],
  },
  {
    titre: 'Décor',
    pastilles: Object.entries(couleurs.decor).map(([nom, hex]) => ({
      nom: `decor/${figma(nom)}`,
      hex,
      note: 'jamais de texte dessus',
    })),
  },
]

export function SectionPalette() {
  return (
    <Section titre="Palette">
      {groupes.map((groupe) => (
        <View key={groupe.titre} style={styles.groupe}>
          <Texte variante="labelM">{groupe.titre}</Texte>
          <View style={styles.grille}>
            {groupe.pastilles.map((p) => (
              <View
                key={p.nom}
                style={styles.pastille}
                accessible
                accessibilityLabel={`${p.nom}, ${p.hex}, ${p.note}`}
              >
                <View style={[styles.echantillon, { backgroundColor: p.hex }]} />
                <Texte variante="labelM">{p.nom}</Texte>
                <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
                  {p.hex} — {p.note}
                </Texte>
              </View>
            ))}
          </View>
        </View>
      ))}
    </Section>
  )
}

const styles = StyleSheet.create({
  groupe: {
    gap: 12,
  },
  grille: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  pastille: {
    width: 160,
    gap: 4,
  },
  echantillon: {
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
    marginBottom: 4,
  },
})
