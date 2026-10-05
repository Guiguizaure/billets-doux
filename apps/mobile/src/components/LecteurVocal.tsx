import { formaterDuree } from '@billets-doux/shared'
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio'
import { Pressable, StyleSheet, View } from 'react-native'

import Lecture from '@/assets/icons/Lecture.svg'
import Pause from '@/assets/icons/Pause.svg'
import { useUrlMedia } from '@/lib/useUrlMedia'
import { couleurs, rayons } from '@/theme/tokens'

import { Texte } from './Texte'

/** Lecteur compact d'un vocal (média distant ou fichier local tout juste enregistré). */
export function LecteurVocal({
  mediaId = null,
  uriLocale = null,
  duree,
}: {
  mediaId?: string | null
  uriLocale?: string | null
  duree: number
}) {
  const { url, erreur } = useUrlMedia(mediaId, uriLocale)
  const lecteur = useAudioPlayer(url ? { uri: url } : null)
  const statut = useAudioPlayerStatus(lecteur)
  const total = statut.duration > 0 ? statut.duration : duree
  const avancement = total > 0 ? Math.min(1, statut.currentTime / total) : 0

  const basculer = () => {
    if (statut.playing) {
      lecteur.pause()
      return
    }
    if (statut.didJustFinish || statut.currentTime >= total - 0.1) void lecteur.seekTo(0)
    lecteur.play()
  }

  return (
    <View style={styles.lecteur}>
      <Pressable
        onPress={basculer}
        disabled={!url}
        accessibilityRole="button"
        accessibilityLabel={statut.playing ? 'Mettre en pause' : 'Écouter le vocal'}
        style={({ pressed }) => [styles.bouton, (pressed || !url) && styles.attente]}
      >
        {statut.playing ? (
          <Pause width={18} height={18} color={couleurs.texte.surCachet} />
        ) : (
          <Lecture width={18} height={18} color={couleurs.texte.surCachet} />
        )}
      </Pressable>
      <View style={styles.piste}>
        <View style={[styles.avance, { width: `${avancement * 100}%` }]} />
      </View>
      <Texte variante="labelS" couleur={couleurs.texte.encreDouce}>
        {erreur ? 'indisponible' : formaterDuree(statut.playing ? statut.currentTime : total)}
      </Texte>
    </View>
  )
}

const styles = StyleSheet.create({
  lecteur: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bouton: {
    width: 40,
    height: 40,
    borderRadius: rayons.pilule,
    backgroundColor: couleurs.action.cachet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attente: {
    opacity: 0.6,
  },
  piste: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: couleurs.trait.ligne,
    overflow: 'hidden',
  },
  avance: {
    height: 4,
    backgroundColor: couleurs.action.cachet,
  },
})
