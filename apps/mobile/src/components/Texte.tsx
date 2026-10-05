import { Text, type TextProps } from 'react-native'

import { couleurs, typo, type StyleTexte } from '@/theme/tokens'

type Props = TextProps & {
  variante?: StyleTexte
  couleur?: string
}

/** Texte aux styles du Figma. Respecte la taille de texte du système (allowFontScaling). */
export function Texte({
  variante = 'corpsM',
  couleur = couleurs.texte.encre,
  style,
  ...props
}: Props) {
  return <Text style={[typo[variante], { color: couleur }, style]} {...props} />
}
