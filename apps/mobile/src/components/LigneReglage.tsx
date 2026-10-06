import type { FC, ReactNode } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import type { SvgProps } from 'react-native-svg'

import Suivant from '@/assets/icons/Suivant.svg'
import { couleurs, rayons } from '@/theme/tokens'

import { Texte } from './Texte'

/**
 * Une ligne des cartes de réglages (Figma 5.1) : icône dans une pastille, titre, détail,
 * et à droite un chevron (ligne touchable) ou un interrupteur.
 */
export function LigneReglage({
  Icone,
  titre,
  detail,
  droite,
  onPress,
  danger,
  derniere,
}: {
  Icone: FC<SvgProps>
  titre: string
  detail?: string | null
  /** Un interrupteur, par exemple ; sinon un chevron si la ligne est touchable. */
  droite?: ReactNode
  onPress?: () => void
  /** « Fermer le duo » : titre en rouge cachet (4,7:1 sur carte), pastille rose. */
  danger?: boolean
  derniere?: boolean
}) {
  const contenu = (
    <>
      <View style={[styles.pastille, danger && styles.pastilleDanger]}>
        <Icone width={18} height={18} color={couleurs.texte.encre} />
      </View>
      <View style={styles.texte}>
        <Texte variante="labelM" couleur={danger ? couleurs.action.cachet : couleurs.texte.encre}>
          {titre}
        </Texte>
        {detail ? (
          <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
            {detail}
          </Texte>
        ) : null}
      </View>
      {droite ?? (onPress ? <Suivant width={18} height={18} color={couleurs.texte.encre} /> : null)}
    </>
  )
  const style = [styles.ligne, !derniere && styles.separateur]
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={detail ? `${titre}, ${detail}` : titre}
        style={({ pressed }) => [...style, pressed && styles.presse]}
      >
        {contenu}
      </Pressable>
    )
  }
  return <View style={style}>{contenu}</View>
}

/** Une carte de lignes de réglages. */
export function CarteReglages({ children }: { children: ReactNode }) {
  return <View style={styles.carte}>{children}</View>
}

const styles = StyleSheet.create({
  carte: {
    paddingHorizontal: 17,
    borderRadius: rayons.carte,
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
    backgroundColor: couleurs.fond.carte,
  },
  ligne: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  separateur: {
    borderBottomWidth: 1,
    borderBottomColor: couleurs.trait.ligne,
  },
  pastille: {
    width: 36,
    height: 36,
    borderRadius: rayons.pilule,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: couleurs.fond.papierOmbre,
  },
  pastilleDanger: {
    backgroundColor: couleurs.decor.rose,
  },
  texte: {
    flex: 1,
    gap: 1,
  },
  presse: {
    opacity: 0.7,
  },
})
