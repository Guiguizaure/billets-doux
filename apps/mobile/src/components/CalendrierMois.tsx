import { grilleDuMois, libellesJour } from '@billets-doux/shared'
import { Pressable, StyleSheet, View } from 'react-native'

import Retour from '@/assets/icons/Retour.svg'
import Suivant from '@/assets/icons/Suivant.svg'
import { couleurs, rayons } from '@/theme/tokens'

import { Texte } from './Texte'

const ENTETES = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const NOMS_ENTETES = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

type Props = {
  annee: number
  mois: number
  onMois: (annee: number, mois: number) => void
  selection: string | null
  onSelection: (jour: string) => void
  aujourdhui: string
  premierJour: string
  dernierJour: string
  /** Jours où un mot est déjà prévu (petit point sauge). */
  joursPris: Set<string>
}

/** Calendrier du mois de l'écran 3.5 (cases de 41 × 36, semaine du lundi au dimanche). */
export function CalendrierMois({
  annee,
  mois,
  onMois,
  selection,
  onSelection,
  aujourdhui,
  premierJour,
  dernierJour,
  joursPris,
}: Props) {
  const nomMois = libellesJour(`${annee}-${String(mois).padStart(2, '0')}-01`).nomMois
  const titre = `${nomMois.charAt(0).toUpperCase()}${nomMois.slice(1)} ${annee}`
  const precedent = mois === 1 ? { a: annee - 1, m: 12 } : { a: annee, m: mois - 1 }
  const suivant = mois === 12 ? { a: annee + 1, m: 1 } : { a: annee, m: mois + 1 }
  const premierDuMois = `${annee}-${String(mois).padStart(2, '0')}-01`
  const peutReculer = premierDuMois > premierJour.slice(0, 8) + '01'
  const peutAvancer = `${suivant.a}-${String(suivant.m).padStart(2, '0')}-01` <= dernierJour

  return (
    <View style={styles.carte}>
      <View style={styles.mois}>
        <Pressable
          onPress={() => onMois(precedent.a, precedent.m)}
          disabled={!peutReculer}
          accessibilityRole="button"
          accessibilityLabel="Mois précédent"
          hitSlop={10}
          style={!peutReculer && styles.inactif}
        >
          <Retour width={20} height={20} color={couleurs.texte.encre} />
        </Pressable>
        <Texte variante="titreM" accessibilityRole="header">
          {titre}
        </Texte>
        <Pressable
          onPress={() => onMois(suivant.a, suivant.m)}
          disabled={!peutAvancer}
          accessibilityRole="button"
          accessibilityLabel="Mois suivant"
          hitSlop={10}
          style={!peutAvancer && styles.inactif}
        >
          <Suivant width={20} height={20} color={couleurs.texte.encre} />
        </Pressable>
      </View>

      <View style={styles.semaine}>
        {ENTETES.map((lettre, i) => (
          <View key={i} style={styles.jour} accessibilityLabel={NOMS_ENTETES[i]}>
            <Texte variante="labelS" couleur={couleurs.texte.encreDouce}>
              {lettre}
            </Texte>
          </View>
        ))}
      </View>
      {grilleDuMois(annee, mois).map((semaine, i) => (
        <View key={i} style={styles.semaine}>
          {semaine.map((jour, j) => {
            if (!jour) return <View key={j} style={styles.jour} />
            const possible = jour >= premierJour && jour <= dernierJour
            const choisi = jour === selection
            const pris = joursPris.has(jour)
            const l = libellesJour(jour)
            return (
              <Pressable
                key={jour}
                onPress={() => onSelection(jour)}
                disabled={!possible}
                accessibilityRole="button"
                accessibilityLabel={`${l.long}${pris ? ', un mot déjà prévu' : ''}${jour === aujourdhui ? ', aujourd’hui' : ''}`}
                accessibilityState={{ selected: choisi, disabled: !possible }}
                style={[
                  styles.jour,
                  jour === aujourdhui && !choisi && styles.aujourdhui,
                  choisi && styles.choisi,
                ]}
              >
                <Texte
                  variante="labelM"
                  couleur={
                    choisi
                      ? couleurs.texte.surCachet
                      : possible || jour === aujourdhui
                        ? couleurs.texte.encre
                        : couleurs.texte.encreDouce
                  }
                >
                  {l.jourDuMois}
                </Texte>
                {pris && !choisi ? <View style={styles.point} /> : null}
              </Pressable>
            )
          })}
        </View>
      ))}

      <View style={styles.legende}>
        <View style={[styles.point, styles.pointLegende]} />
        <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
          un mot déjà prévu ce jour-là
        </Texte>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  carte: {
    gap: 4,
    padding: 18,
    borderRadius: rayons.carte,
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
    backgroundColor: couleurs.fond.carte,
  },
  mois: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  inactif: {
    opacity: 0.3,
  },
  semaine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  jour: {
    width: 41,
    height: 36,
    borderRadius: rayons.pilule,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  aujourdhui: {
    borderWidth: 1.5,
    borderColor: couleurs.texte.encre,
  },
  choisi: {
    backgroundColor: couleurs.action.cachet,
  },
  point: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: couleurs.decor.sauge,
  },
  legende: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  pointLegende: {
    width: 6,
    height: 6,
  },
})
