import { StyleSheet, View } from 'react-native'

import Pause from '@/assets/icons/Pause.svg'
import { useSession } from '@/session/SessionProvider'
import { couleurs, rayons } from '@/theme/tokens'

import { LienTexte } from './LienTexte'
import { Texte } from './Texte'

/**
 * Duo en pause : affiché en haut de « Pour moi » et « Pour toi ». Seule la personne qui a mis
 * la pause peut la lever ; l'autre voit seulement qui l'a mise.
 */
export function BandeauPause() {
  const { moi, api, appliquer } = useSession()
  const pause = moi?.duo?.pause
  if (!pause) return null
  return (
    <View style={styles.bandeau} accessibilityRole="summary">
      <Pause width={18} height={18} color={couleurs.texte.encre} />
      <View style={styles.texte}>
        <Texte variante="labelM">
          {pause.parMoi ? 'Tu as mis le duo en pause' : `${pause.prenom} a mis le duo en pause`}
        </Texte>
        <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
          Les mots s’ouvrent toujours, sans notification.
        </Texte>
      </View>
      {pause.parMoi ? (
        <LienTexte
          libelle="Reprendre"
          onPress={() =>
            void api
              .reprendre()
              .then(appliquer)
              .catch(() => undefined)
          }
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  bandeau: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: rayons.carte,
    backgroundColor: couleurs.fond.papierOmbre,
  },
  texte: {
    flex: 1,
    gap: 2,
  },
})
