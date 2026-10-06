import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import Lien from '@/assets/icons/Lien.svg'
import { apiUrl } from '@/lib/api'
import { reseau, useReseau } from '@/lib/reseau'

import { BandeauInfo } from './BandeauInfo'

/** Toutes les 10 s hors ligne, on vérifie si le réseau est revenu. */
const ESSAI_MS = 10_000

/** Réseau perdu en cours d'usage : un bandeau discret en haut, qui part tout seul au retour. */
export function BandeauReseau() {
  const etat = useReseau()
  const { top } = useSafeAreaInsets()

  useEffect(() => {
    if (etat !== 'hors_ligne') return
    const minuteur = setInterval(() => {
      fetch(`${apiUrl()}/api/health`)
        .then(() => reseau.signaler('ok'))
        .catch(() => undefined)
    }, ESSAI_MS)
    return () => clearInterval(minuteur)
  }, [etat])

  if (etat !== 'hors_ligne') return null
  return (
    <View style={[styles.place, { top: top + 8 }]} pointerEvents="box-none">
      <BandeauInfo
        Icone={Lien}
        message="Pas de réseau. Tes mots t’attendent : on réessaie tout seul."
      />
    </View>
  )
}

const styles = StyleSheet.create({
  place: {
    position: 'absolute',
    left: 16,
    right: 16,
    maxWidth: 448,
    alignSelf: 'center',
  },
})
