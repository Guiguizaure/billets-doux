import { formaterHeure, HEURE_PAR_DEFAUT, HEURES_PROPOSEES } from '@billets-doux/shared'
import { router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import Calendrier from '@/assets/icons/Calendrier.svg'
import { Alerte } from '@/components/Alerte'
import { Bouton } from '@/components/Bouton'
import { DuoTimbres } from '@/components/DuoTimbres'
import { Ecran } from '@/components/Ecran'
import { Puce } from '@/components/Puce'
import { Texte } from '@/components/Texte'
import { messageErreur } from '@/lib/formulaires'
import { useSession } from '@/session/SessionProvider'
import { couleurs, rayons } from '@/theme/tokens'

/** Écran 1.3 Le duo est créé : chacun choisit l'heure à laquelle ses mots s'ouvrent. */
export default function Heure() {
  const { moi, api, appliquer } = useSession()
  const [heure, setHeure] = useState(moi?.utilisateur.heureDecouverte ?? HEURE_PAR_DEFAUT)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  const confirmer = async () => {
    setEnCours(true)
    setErreur(null)
    try {
      appliquer(await api.mettreAJour({ heureDecouverte: heure }))
      router.replace('/pour-moi')
    } catch (e) {
      setErreur(messageErreur(e))
      setEnCours(false)
    }
  }

  return (
    <Ecran
      actions={
        <Bouton
          libelle="Ouvrir mon calendrier"
          Icone={Calendrier}
          pleineLargeur
          enCours={enCours}
          onPress={() => void confirmer()}
        />
      }
    >
      <View style={styles.contenu}>
        <DuoTimbres
          moi={moi?.utilisateur.prenom ?? ''}
          partenaire={moi?.duo?.partenaire?.prenom ?? ''}
        />
        <Texte variante="titreXL" style={styles.centre} accessibilityRole="header">
          Vous voilà à deux
        </Texte>
        <Texte variante="corpsM" couleur={couleurs.texte.encreDouce} style={styles.explication}>
          Chacun prépare un calendrier pour l’autre. Tu verras les cases se remplir, jamais leur
          contenu avant le jour J.
        </Texte>
        {erreur ? <Alerte message={erreur} /> : null}
        <View style={styles.carte}>
          <Texte variante="labelS" couleur={couleurs.texte.encreDouce}>
            À QUELLE HEURE VEUX-TU DÉCOUVRIR TES MOTS ?
          </Texte>
          <View style={styles.heures} accessibilityRole="radiogroup">
            {HEURES_PROPOSEES.map((h) => (
              <Puce
                key={h}
                libelle={formaterHeure(h)}
                active={heure === h}
                onPress={() => setHeure(h)}
              />
            ))}
          </View>
          <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
            Tu pourras la changer quand tu veux.
          </Texte>
        </View>
      </View>
    </Ecran>
  )
}

const styles = StyleSheet.create({
  contenu: {
    alignItems: 'center',
    gap: 20,
    paddingTop: 44,
  },
  centre: {
    textAlign: 'center',
  },
  explication: {
    textAlign: 'center',
    maxWidth: 320,
  },
  carte: {
    alignSelf: 'stretch',
    gap: 14,
    padding: 20,
    borderRadius: rayons.carte,
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
    backgroundColor: couleurs.fond.carte,
  },
  heures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
})
