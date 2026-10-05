import { type FC, type ReactNode, useState } from 'react'
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native'
import type { SvgProps } from 'react-native-svg'

import { familles } from '@/theme/polices'
import { couleurs } from '@/theme/tokens'

import { Texte } from './Texte'

type Props = TextInputProps & {
  libelle: string
  erreur?: string
  aide?: string
  /** Élément à droite de la saisie (ex. : afficher le mot de passe). */
  accessoire?: ReactNode
  /** Icône à gauche de la saisie (ex. : l'indice, Figma 3.4). */
  icone?: FC<SvgProps>
}

/**
 * Champ de saisie (absent du Figma, construit avec ses tokens).
 * Le rouge cachet sur papier n'atteint que 4,3:1 : l'erreur s'écrit en encre,
 * et le rouge ne sert qu'à la bordure et à la pastille.
 */
export function Champ({
  libelle,
  erreur,
  aide,
  accessoire,
  icone: Icone,
  onFocus,
  onBlur,
  ...props
}: Props) {
  const [focus, setFocus] = useState(false)
  return (
    <View style={styles.bloc}>
      <Texte variante="labelS" couleur={couleurs.texte.encreDouce} accessible={false}>
        {libelle.toUpperCase()}
      </Texte>
      <View style={[styles.cadre, focus && styles.focus, erreur ? styles.enErreur : null]}>
        {Icone ? <Icone width={18} height={18} color={couleurs.texte.encreDouce} /> : null}
        <TextInput
          accessibilityLabel={libelle}
          accessibilityHint={erreur ?? aide}
          placeholderTextColor={couleurs.texte.encreDouce}
          selectionColor={couleurs.texte.encre}
          style={styles.saisie}
          onFocus={(e) => {
            setFocus(true)
            onFocus?.(e)
          }}
          onBlur={(e) => {
            setFocus(false)
            onBlur?.(e)
          }}
          {...props}
        />
        {accessoire}
      </View>
      {erreur ? (
        <View style={styles.ligneErreur} accessibilityLiveRegion="polite">
          <View style={styles.pastilleErreur} />
          <Texte variante="corpsS" style={styles.texteErreur}>
            {erreur}
          </Texte>
        </View>
      ) : aide ? (
        <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
          {aide}
        </Texte>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  bloc: {
    gap: 8,
  },
  cadre: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: couleurs.trait.ligne,
    backgroundColor: couleurs.fond.carte,
    paddingHorizontal: 16,
    gap: 10,
  },
  focus: {
    borderColor: couleurs.texte.encre,
  },
  enErreur: {
    borderColor: couleurs.action.cachet,
  },
  saisie: {
    flex: 1,
    paddingVertical: 14,
    fontFamily: familles.corps,
    fontSize: 16,
    color: couleurs.texte.encre,
    backgroundColor: 'transparent',
    // Pas de contour du navigateur : le cadre change déjà de couleur au focus.
    outlineWidth: 0,
    outlineColor: 'transparent',
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
  texteErreur: {
    flex: 1,
  },
})
