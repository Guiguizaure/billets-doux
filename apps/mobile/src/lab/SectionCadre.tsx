import { Platform, StyleSheet, View } from 'react-native'

import { Section } from '@/components/Section'
import { Texte } from '@/components/Texte'
import { couleurs } from '@/theme/tokens'
import type { VarianteCadre } from '@/web/CadreTelephone'
import { PageDemo } from '@/web/PageDemo'

const ECHELLE = 0.42
const PAGE = { largeur: 880, hauteur: 920 }

const VARIANTES: { valeur: VarianteCadre; titre: string }[] = [
  { valeur: 'telephone', titre: 'A · Téléphone (bordure encre)' },
  { valeur: 'carte', titre: 'B · Carte crème, fine bordure' },
  { valeur: 'timbre', titre: 'C · Timbre perforé' },
]

/** Étape 8 : la version web sur grand écran, trois cadres au choix (aperçus réduits). */
export function SectionCadre() {
  return (
    <Section titre="Étape 8 · Version web sur grand écran (cadre à choisir)">
      {Platform.OS !== 'web' ? (
        <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
          À voir sur la version web, dans un navigateur.
        </Texte>
      ) : (
        <>
          <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
            Aperçus réduits à {Math.round(ECHELLE * 100)} %. L’appli tourne vraiment dans chaque
            cadre. Le bouton « Découvrir avec un duo de démo » connecte au duo de démo.
          </Texte>
          <View style={styles.grille}>
            {VARIANTES.map((v) => (
              <View key={v.valeur} style={styles.fiche}>
                <Texte variante="labelM">{v.titre}</Texte>
                <View style={styles.cadre}>
                  <View style={styles.reduit}>
                    <PageDemo variante={v.valeur} chemin="/" echelle={1} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </Section>
  )
}

const styles = StyleSheet.create({
  grille: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  fiche: {
    gap: 8,
  },
  cadre: {
    width: PAGE.largeur * ECHELLE,
    height: PAGE.hauteur * ECHELLE,
    overflow: 'hidden',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
  },
  // La réduction se fait autour du centre : des marges négatives ramènent l'aperçu en haut à gauche.
  reduit: {
    width: PAGE.largeur,
    height: PAGE.hauteur,
    marginLeft: (-PAGE.largeur * (1 - ECHELLE)) / 2,
    marginTop: (-PAGE.hauteur * (1 - ECHELLE)) / 2,
    transform: [{ scale: ECHELLE }],
  },
})
