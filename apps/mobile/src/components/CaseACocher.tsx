import { Pressable, StyleSheet, View } from 'react-native'

import Valider from '@/assets/icons/Valider.svg'
import { couleurs } from '@/theme/tokens'

import { Texte } from './Texte'

/**
 * Case à cocher (absente du Figma), dans le style des champs : cadre « ligne », cochée en
 * rouge cachet avec Icône/Valider. Toute la ligne est touchable (48 dp au moins) ; l'erreur
 * s'affiche dessous comme pour un champ.
 */
export function CaseACocher({
  coche,
  onChange,
  libelle,
  erreur,
}: {
  coche: boolean
  onChange: (coche: boolean) => void
  libelle: string
  erreur?: string
}) {
  return (
    <View style={styles.bloc}>
      <Pressable
        onPress={() => onChange(!coche)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: coche }}
        accessibilityLabel={libelle}
        accessibilityHint={erreur}
        style={({ pressed }) => [styles.ligne, pressed && styles.presse]}
      >
        <View style={[styles.case, coche && styles.cochee, erreur && !coche && styles.enErreur]}>
          {coche ? <Valider width={16} height={16} color={couleurs.texte.surCachet} /> : null}
        </View>
        <Texte variante="corpsM" style={styles.flex}>
          {libelle}
        </Texte>
      </Pressable>
      {erreur ? (
        <View style={styles.ligneErreur} accessibilityLiveRegion="polite">
          <View style={styles.pastilleErreur} />
          <Texte variante="corpsS" style={styles.flex}>
            {erreur}
          </Texte>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  bloc: {
    gap: 8,
  },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
  },
  presse: {
    opacity: 0.75,
  },
  case: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: couleurs.trait.ligne,
    backgroundColor: couleurs.fond.carte,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cochee: {
    borderColor: couleurs.action.cachet,
    backgroundColor: couleurs.action.cachet,
  },
  enErreur: {
    borderColor: couleurs.action.cachet,
  },
  flex: {
    flex: 1,
  },
  ligneErreur: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  pastilleErreur: {
    width: 8,
    height: 8,
    marginTop: 6,
    borderRadius: 4,
    backgroundColor: couleurs.action.cachet,
  },
})
