import { StyleSheet, View } from 'react-native'

import TimbreLune from '@/assets/illustrations/timbre-lune.svg'
import { useSession } from '@/session/SessionProvider'
import { couleurs } from '@/theme/tokens'

import { Bouton } from './Bouton'
import { Ecran } from './Ecran'
import { LienTexte } from './LienTexte'
import { Texte } from './Texte'

/** Le compte existe mais l'API ne répond pas (pas de réseau, serveur arrêté). */
export function HorsLigne() {
  const { reessayer, deconnecter } = useSession()
  return (
    <Ecran actions={<Bouton libelle="Réessayer" pleineLargeur onPress={reessayer} />}>
      <View style={styles.contenu}>
        <TimbreLune width={72} height={88} />
        <Texte variante="titreL" style={styles.centre} accessibilityRole="header">
          Billets doux ne répond pas
        </Texte>
        <Texte variante="corpsM" couleur={couleurs.texte.encreDouce} style={styles.centre}>
          Vérifie ta connexion, puis réessaie. Tes mots t’attendent.
        </Texte>
        <LienTexte libelle="Se déconnecter" onPress={() => void deconnecter()} />
      </View>
    </Ecran>
  )
}

const styles = StyleSheet.create({
  contenu: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  centre: {
    textAlign: 'center',
  },
})
