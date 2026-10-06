import { type CalendrierAuteur, libellesJour, type Rythme } from '@billets-doux/shared'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { AccessibilityInfo, ActivityIndicator, StyleSheet, View } from 'react-native'

import Boite from '@/assets/icons/Boite.svg'
import Cloche from '@/assets/icons/Cloche.svg'
import Lune from '@/assets/icons/Lune.svg'
import Plus from '@/assets/icons/Plus.svg'
import Suivant from '@/assets/icons/Suivant.svg'
import Valider from '@/assets/icons/Valider.svg'
import { Alerte } from '@/components/Alerte'
import { Bouton } from '@/components/Bouton'
import { BoutonRond } from '@/components/BoutonRond'
import { Case, type EtatCase } from '@/components/Case'
import { Ecran } from '@/components/Ecran'
import { LienTexte } from '@/components/LienTexte'
import { Puce } from '@/components/Puce'
import { REACTIONS } from '@/components/Reactions'
import { Texte } from '@/components/Texte'
import { type CaseAuteur, construireCases, resumer } from '@/lib/calendrier'
import { api } from '@/lib/client'
import { messageErreur } from '@/lib/formulaires'
import { messageFlash } from '@/lib/messageFlash'
import { TYPES_DE_MOT } from '@/lib/typesDeMot'
import { couleurs, rayons } from '@/theme/tokens'

const RYTHMES: { valeur: Rythme; libelle: string }[] = [
  { valeur: 'jour', libelle: 'Chaque jour' },
  { valeur: 'semaine', libelle: 'Chaque semaine' },
  { valeur: 'mois', libelle: 'Chaque mois' },
]

/** Correspondance avec les états du composant Figma « Case du calendrier ». */
const ETAT_CASE: Record<CaseAuteur['etat'], EtatCase> = {
  ouverte: 'ouverte',
  prete: 'prete',
  libre: 'vide',
  passee: 'vide',
}

/** Écran 3.1 Mon calendrier pour Lina (onglet « Pour toi »). */
export default function PourToi() {
  const [cal, setCal] = useState<CalendrierAuteur | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      let annule = false
      // Retour d'Écrire après une programmation directe : « Programmé pour mercredi 7 à 8 h ».
      const flash = messageFlash.prendre()
      let effacer: ReturnType<typeof setTimeout> | undefined
      if (flash) {
        setConfirmation(flash)
        AccessibilityInfo.announceForAccessibility(flash)
        effacer = setTimeout(() => setConfirmation(null), 5000)
      }
      api
        .calendrier()
        .then((c) => {
          if (!annule) {
            setCal(c)
            setErreur(null)
          }
        })
        .catch((e: unknown) => {
          if (!annule) setErreur(messageErreur(e))
        })
      return () => {
        annule = true
        if (effacer) clearTimeout(effacer)
      }
    }, []),
  )

  const changerRythme = async (rythme: Rythme) => {
    if (!cal || cal.rythme === rythme) return
    setCal({ ...cal, rythme })
    try {
      setCal(await api.changerRythme(rythme))
    } catch (e) {
      setErreur(messageErreur(e))
    }
  }

  if (!cal) {
    return (
      <Ecran bas={false}>
        {erreur ? <Alerte message={erreur} /> : <ActivityIndicator color={couleurs.texte.encre} />}
      </Ecran>
    )
  }

  const prenom = cal.destinataire.prenom
  const resume = resumer(cal)
  const cases = construireCases(cal)

  const ouvrirCase = (c: CaseAuteur) => {
    // Case lue : on relit le mot, avec la réaction et la réponse (d'abord celui qui en a une).
    const lu =
      c.etat === 'ouverte'
        ? (c.mots.find((m) => m.reponse?.texte || m.reponse?.vocal || m.reponse?.reaction) ??
          c.mots.at(-1))
        : undefined
    if (lu) {
      router.push({ pathname: '/mot/[id]', params: { id: lu.id } })
      return
    }
    const premier = c.mots.find((m) => !m.ouvertLe)
    if (premier) router.push({ pathname: '/ecrire', params: { id: premier.id } })
    else if (c.jourCible) router.push({ pathname: '/ecrire', params: { jour: c.jourCible } })
  }

  return (
    <Ecran
      bas={false}
      actions={
        <View style={styles.actions}>
          <View style={styles.action}>
            <Bouton
              libelle={`Réserve (${cal.brouillons})`}
              Icone={Boite}
              variante="secondaire"
              pleineLargeur
              onPress={() => router.push('/reserve')}
            />
          </View>
          <View style={styles.action}>
            <Bouton
              libelle="Nouveau mot"
              Icone={Plus}
              pleineLargeur
              onPress={() => router.push('/ecrire')}
            />
          </View>
        </View>
      }
    >
      <View style={styles.entete}>
        <Texte variante="labelS" couleur={couleurs.texte.encreDouce}>
          MON CALENDRIER
        </Texte>
        <Texte variante="titreL" accessibilityRole="header">
          Pour <Texte variante="titreItaliqueL">{prenom}</Texte>
        </Texte>
      </View>

      <View style={styles.rythmes} accessibilityRole="radiogroup" accessibilityLabel="Rythme">
        {RYTHMES.map((r) => (
          <Puce
            key={r.valeur}
            libelle={r.libelle}
            active={cal.rythme === r.valeur}
            onPress={() => void changerRythme(r.valeur)}
          />
        ))}
      </View>

      {erreur ? <Alerte message={erreur} /> : null}
      {confirmation ? (
        <View style={styles.confirmation} accessibilityLiveRegion="polite">
          <BoutonRond Icone={Valider} fond={couleurs.decor.sauge} />
          <Texte variante="labelM" style={styles.flex}>
            {confirmation}
          </Texte>
        </View>
      ) : null}

      {resume.prets > 0 && resume.jusquAu ? (
        <View
          style={styles.carte}
          accessible
          accessibilityLabel={`${resume.prets} mots prêts, jusqu’au ${libellesJour(resume.jusquAu).date}`}
        >
          <View style={styles.legende}>
            <Texte variante="labelM">
              {resume.prets} mot{resume.prets > 1 ? 's' : ''} prêt{resume.prets > 1 ? 's' : ''}
            </Texte>
            <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
              jusqu’au {libellesJour(resume.jusquAu).date}
            </Texte>
          </View>
          <View style={styles.piste}>
            <View style={[styles.avance, { width: `${Math.round(resume.progression * 100)}%` }]} />
          </View>
        </View>
      ) : null}

      {/* Encart validé : papier ombre (pas de texte sur une couleur de décor). */}
      <View style={styles.encart}>
        <BoutonRond Icone={Cloche} fond={couleurs.decor.soleil} />
        <View style={styles.encartTexte}>
          <Texte variante="labelM">
            {resume.semaineProchaine > 0
              ? `Semaine prochaine : ${resume.semaineProchaine} mot${resume.semaineProchaine > 1 ? 's' : ''} prêt${resume.semaineProchaine > 1 ? 's' : ''}.`
              : 'Semaine prochaine : rien de prévu pour l’instant.'}
          </Texte>
          <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
            Rien ne presse, un jour vide reste une surprise.
          </Texte>
        </View>
      </View>

      {resume.dansLaSemaine.map((f) => (
        <Texte key={f.debut} variante="corpsS" couleur={couleurs.texte.encreDouce}>
          Quelque part entre le {libellesJour(f.debut).date} et le {libellesJour(f.fin).date} :{' '}
          {f.nombre} mot{f.nombre > 1 ? 's' : ''} surprise
        </Texte>
      ))}

      <View style={styles.cases}>
        {cases.map((c) => {
          const premier = c.mots[0]
          return (
            <Case
              key={c.cle}
              etat={ETAT_CASE[c.etat]}
              jourSemaine={c.titre}
              jour={c.chiffre}
              info={c.info}
              Icone={
                c.reaction
                  ? REACTIONS[c.reaction].Icone
                  : premier
                    ? TYPES_DE_MOT[premier.type].Icone
                    : undefined
              }
              libelleAccessible={c.libelleAccessible}
              onPress={c.etat === 'passee' ? undefined : () => ouvrirCase(c)}
            />
          )
        })}
      </View>

      <LigneOuvreQuand nombre={resume.lettres} />
    </Ecran>
  )
}

function LigneOuvreQuand({ nombre }: { nombre: number }) {
  return (
    <View style={styles.ouvreQuand}>
      <BoutonRond Icone={Lune} fond={couleurs.decor.lavande} />
      <View style={styles.encartTexte}>
        <Texte variante="labelM">Lettres « Ouvre quand… »</Texte>
        <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
          {nombre === 0
            ? 'Des lettres sans date, pour les moments où l’autre en a besoin.'
            : `${nombre} lettre${nombre > 1 ? 's' : ''}`}
        </Texte>
      </View>
      <LienTexte libelle="Voir" onPress={() => router.push('/ouvre-quand')} />
      <Suivant width={16} height={16} color={couleurs.texte.encre} />
    </View>
  )
}

const styles = StyleSheet.create({
  entete: {
    gap: 14,
  },
  rythmes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  carte: {
    gap: 10,
    padding: 16,
    borderRadius: rayons.carte,
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
    backgroundColor: couleurs.fond.carte,
  },
  legende: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  piste: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: couleurs.trait.ligne,
  },
  avance: {
    height: 8,
    borderRadius: 4,
    backgroundColor: couleurs.decor.sauge,
  },
  encart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: rayons.carte,
    backgroundColor: couleurs.fond.papierOmbre,
  },
  encartTexte: {
    flex: 1,
    gap: 2,
  },
  cases: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  ouvreQuand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: rayons.carte,
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
    backgroundColor: couleurs.fond.carte,
  },
  confirmation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: rayons.carte,
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
    backgroundColor: couleurs.fond.carte,
  },
  flex: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  action: {
    flex: 1,
  },
})
