import { StyleSheet, View } from 'react-native'

import { couleurs } from '@/theme/tokens'

const BARRES = 38
const HAUTEUR = 35

/**
 * « Onde en direct » du Figma (3.3) : 38 barres de 3 px, les plus récentes à droite.
 * `niveaux` va de 0 à 1 ; `lecture` (0 à 1) colore la partie déjà écoutée.
 */
export function Onde({ niveaux, lecture }: { niveaux: number[]; lecture?: number }) {
  const visibles = echantillonner(niveaux)
  return (
    <View style={styles.onde} accessible={false} importantForAccessibility="no-hide-descendants">
      {visibles.map((n, i) => {
        const jouee = lecture === undefined || i / BARRES < lecture
        return (
          <View
            key={i}
            style={[
              styles.barre,
              {
                height: Math.max(4, n * HAUTEUR),
                backgroundColor: jouee ? couleurs.action.cachet : couleurs.decor.rose,
              },
            ]}
          />
        )
      })}
    </View>
  )
}

/** Ramène n'importe quel nombre de mesures à 38 barres (moyennes par tranche). */
function echantillonner(niveaux: number[]) {
  if (niveaux.length === 0) return Array.from({ length: BARRES }, () => 0)
  if (niveaux.length <= BARRES) {
    return [...Array.from({ length: BARRES - niveaux.length }, () => 0), ...niveaux]
  }
  const pas = niveaux.length / BARRES
  return Array.from({ length: BARRES }, (_, i) => {
    const tranche = niveaux.slice(Math.floor(i * pas), Math.floor((i + 1) * pas))
    return tranche.reduce((a, b) => a + b, 0) / Math.max(1, tranche.length)
  })
}

const styles = StyleSheet.create({
  onde: {
    height: HAUTEUR,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  barre: {
    width: 3,
    borderRadius: 2,
  },
})
