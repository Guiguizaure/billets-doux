import { ajouterJours, jourLocal, libellesJour } from '@billets-doux/shared'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import Calendrier from '@/assets/icons/Calendrier.svg'
import { messageErreur } from '@/lib/formulaires'
import { useSession } from '@/session/SessionProvider'

import { Alerte } from './Alerte'
import { Bouton } from './Bouton'
import { CalendrierMois } from './CalendrierMois'
import { Feuille } from './Feuille'
import { Texte } from './Texte'

/** Choisir (ou effacer) le jour des retrouvailles : demain → dans un an. */
export function FeuilleRetrouvailles({
  visible,
  onFermer,
}: {
  visible: boolean
  onFermer: () => void
}) {
  const { moi, api, appliquer } = useSession()
  const actuelle = moi?.duo?.retrouvailles ?? null
  const aujourdhui = jourLocal(new Date(), moi?.utilisateur.fuseauHoraire ?? 'Europe/Paris')
  const premierJour = ajouterJours(aujourdhui, 1)
  const [jour, setJour] = useState<string | null>(actuelle)
  const [vue, setVue] = useState(() => {
    const l = libellesJour(actuelle ?? premierJour)
    return { annee: l.annee, mois: l.mois }
  })
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const enregistrer = async (valeur: string | null) => {
    setEnCours(true)
    setErreur(null)
    try {
      appliquer(await api.fixerRetrouvailles({ jour: valeur }))
      onFermer()
    } catch (e) {
      setErreur(messageErreur(e))
    } finally {
      setEnCours(false)
    }
  }

  return (
    <Feuille visible={visible} onFermer={onFermer}>
      <View style={styles.tete}>
        <Texte variante="titreM" accessibilityRole="header">
          Le jour où l’on se revoit
        </Texte>
        <Texte variante="corpsS">
          {jour ? libellesJour(jour).long : 'Choisis un jour dans l’année qui vient.'}
        </Texte>
      </View>
      <CalendrierMois
        annee={vue.annee}
        mois={vue.mois}
        onMois={(annee, mois) => setVue({ annee, mois })}
        selection={jour}
        onSelection={setJour}
        aujourdhui={aujourdhui}
        premierJour={premierJour}
        dernierJour={ajouterJours(aujourdhui, 365)}
        joursPris={new Set()}
      />
      {erreur ? <Alerte message={erreur} /> : null}
      <Bouton
        libelle={jour ? `Retrouvailles le ${libellesJour(jour).court}` : 'Choisis un jour'}
        Icone={Calendrier}
        pleineLargeur
        desactive={!jour}
        enCours={enCours}
        onPress={() => void enregistrer(jour)}
      />
      {actuelle ? (
        <Bouton
          libelle="Effacer la date"
          variante="discret"
          pleineLargeur
          onPress={() => void enregistrer(null)}
        />
      ) : null}
    </Feuille>
  )
}

const styles = StyleSheet.create({
  tete: {
    gap: 6,
  },
})
