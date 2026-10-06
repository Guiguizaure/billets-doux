import { router } from 'expo-router'
import { StyleSheet, View } from 'react-native'

import Boite from '@/assets/icons/Boite.svg'
import Plus from '@/assets/icons/Plus.svg'
import LuneDormeuse from '@/assets/illustrations/lune-dormeuse.svg'
import { Bouton } from '@/components/Bouton'
import { Ecran } from '@/components/Ecran'
import { LienTexte } from '@/components/LienTexte'
import { Texte } from '@/components/Texte'
import { useSession } from '@/session/SessionProvider'
import { couleurs } from '@/theme/tokens'

/**
 * Le duo est fermé (par l'un ou l'autre) : on le dit simplement, sans détail. Les souvenirs
 * restent ; une nouvelle invitation ne se crée que si la personne le demande.
 */
export default function DuoFerme() {
  const { moi, deconnecter } = useSession()
  const partenaire = moi?.duo?.partenaire?.prenom
  return (
    <Ecran
      actions={
        <>
          <Bouton
            libelle="Mes souvenirs"
            Icone={Boite}
            variante="secondaire"
            pleineLargeur
            onPress={() => router.push('/mes-souvenirs')}
          />
          <Bouton
            libelle="Inviter quelqu’un"
            Icone={Plus}
            pleineLargeur
            onPress={() => router.replace('/inviter')}
          />
        </>
      }
    >
      <View style={styles.contenu}>
        {/* Illu/lune-dormeuse (180 × 180) à 70 %. */}
        <LuneDormeuse width={126} height={126} />
        <Texte variante="titreL" style={styles.centre} accessibilityRole="header">
          Le duo est fermé
        </Texte>
        <Texte variante="corpsM" couleur={couleurs.texte.encreDouce} style={styles.centre}>
          {partenaire
            ? `Les mots déjà ouverts avec ${partenaire} restent dans tes souvenirs.`
            : 'Les mots déjà ouverts restent dans tes souvenirs.'}
        </Texte>
      </View>
      <View style={styles.liens}>
        <LienTexte
          libelle="Supprimer mon compte"
          onPress={() => router.push('/compte/supprimer')}
        />
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
    maxWidth: 320,
  },
  liens: {
    gap: 8,
  },
})
