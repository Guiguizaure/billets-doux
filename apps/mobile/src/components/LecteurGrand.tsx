import { formaterDuree } from '@billets-doux/shared'
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio'
import { useMemo } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import Lecture from '@/assets/icons/Lecture.svg'
import Pause from '@/assets/icons/Pause.svg'
import { useUrlMedia } from '@/lib/useUrlMedia'
import { couleurs, rayons } from '@/theme/tokens'

import { Onde } from './Onde'
import { Texte } from './Texte'

/** Onde décorative, toujours la même pour un vocal donné (on n'a pas ses niveaux). */
function ondeDe(id: string) {
  let graine = [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
  return Array.from({ length: 38 }, () => {
    graine = (graine * 1_103_515_245 + 12_345) >>> 0
    return 0.2 + ((graine >>> 16) % 1000) / 1250
  })
}

/** Lecteur d'un vocal ouvert (Figma 2.5) : onde, temps, −10 s, lecture, +10 s. */
export function LecteurGrand({ mediaId, duree }: { mediaId: string; duree: number }) {
  const { url, erreur } = useUrlMedia(mediaId)
  const lecteur = useAudioPlayer(url ? { uri: url } : null)
  const statut = useAudioPlayerStatus(lecteur)
  const total = statut.duration > 0 ? statut.duration : duree
  const position = Math.min(total, statut.currentTime)
  const niveaux = useMemo(() => ondeDe(mediaId), [mediaId])

  const basculer = () => {
    if (statut.playing) {
      lecteur.pause()
      return
    }
    if (statut.didJustFinish || position >= total - 0.1) void lecteur.seekTo(0)
    lecteur.play()
  }
  const decaler = (secondes: number) =>
    void lecteur.seekTo(Math.max(0, Math.min(total, position + secondes)))

  return (
    <View style={styles.carte}>
      <View style={styles.onde}>
        <Onde niveaux={niveaux} lecture={total > 0 ? position / total : 0} />
      </View>
      <View style={styles.temps}>
        <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
          {formaterDuree(position)}
        </Texte>
        <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
          {erreur ? 'indisponible' : formaterDuree(total)}
        </Texte>
      </View>
      <View style={styles.commandes}>
        <Pressable
          onPress={() => decaler(-10)}
          disabled={!url}
          accessibilityRole="button"
          accessibilityLabel="Reculer de 10 secondes"
          hitSlop={12}
        >
          <Texte variante="corpsS">−10 s</Texte>
        </Pressable>
        <Pressable
          onPress={basculer}
          disabled={!url}
          accessibilityRole="button"
          accessibilityLabel={statut.playing ? 'Mettre en pause' : 'Écouter le vocal'}
          style={({ pressed }) => [styles.lecture, (pressed || !url) && styles.attente]}
        >
          {statut.playing ? (
            <Pause width={28} height={28} color={couleurs.texte.surCachet} />
          ) : (
            <Lecture width={28} height={28} color={couleurs.texte.surCachet} />
          )}
        </Pressable>
        <Pressable
          onPress={() => decaler(10)}
          disabled={!url}
          accessibilityRole="button"
          accessibilityLabel="Avancer de 10 secondes"
          hitSlop={12}
        >
          <Texte variante="corpsS">+10 s</Texte>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  carte: {
    gap: 14,
    padding: 21,
    borderRadius: rayons.carte,
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
    backgroundColor: couleurs.fond.carte,
  },
  onde: {
    alignItems: 'center',
  },
  temps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  commandes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  lecture: {
    width: 68,
    height: 68,
    borderRadius: rayons.pilule,
    backgroundColor: couleurs.action.cachet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attente: {
    opacity: 0.6,
  },
})
