import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { StyleSheet, View } from 'react-native'

import Boite from '@/assets/icons/Boite.svg'
import Plume from '@/assets/icons/Plume.svg'
import { Bouton } from '@/components/Bouton'
import { EcranProvisoire } from '@/components/EcranProvisoire'
import { Texte } from '@/components/Texte'
import { api } from '@/lib/client'
import { useSession } from '@/session/SessionProvider'
import { couleurs } from '@/theme/tokens'

/** Onglet « Pour toi » : le calendrier arrive à l'étape 4 ; d'ici là, écrire et la réserve. */
export default function PourToi() {
  const { moi } = useSession()
  const partenaire = moi?.duo?.partenaire?.prenom ?? 'ta personne'
  const [nombre, setNombre] = useState<number | null>(null)

  useFocusEffect(
    useCallback(() => {
      let annule = false
      api
        .reserve()
        .then(({ mots }) => {
          if (!annule) setNombre(mots.length)
        })
        .catch(() => undefined)
      return () => {
        annule = true
      }
    }, []),
  )

  return (
    <EcranProvisoire
      titre={`Pour ${partenaire}`}
      etape="Le calendrier arrive à l’étape 4"
      texte={`Prépare tes mots pour ${partenaire} : ils attendent dans ta réserve jusqu’à ce que tu choisisses quand les offrir.`}
    >
      {nombre !== null ? (
        <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
          {nombre === 0
            ? 'Ta réserve est vide pour l’instant.'
            : `${nombre} brouillon${nombre > 1 ? 's' : ''} dans ta réserve.`}
        </Texte>
      ) : null}
      <View style={styles.actions}>
        <Bouton
          libelle="Écrire"
          Icone={Plume}
          pleineLargeur
          onPress={() => router.push('/ecrire')}
        />
        <Bouton
          libelle="Ma réserve"
          Icone={Boite}
          variante="secondaire"
          pleineLargeur
          onPress={() => router.push('/reserve')}
        />
      </View>
    </EcranProvisoire>
  )
}

const styles = StyleSheet.create({
  actions: {
    gap: 10,
  },
})
