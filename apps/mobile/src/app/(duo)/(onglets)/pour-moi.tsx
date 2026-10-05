import {
  type CalendrierDestinataire,
  type CaseRecue,
  compteARebours,
  ecartEnJours,
  formaterHeure,
  heureLocale,
  libellesJour,
} from '@billets-doux/shared'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'

import Joker from '@/assets/icons/Joker.svg'
import Lune from '@/assets/icons/Lune.svg'
import Sablier from '@/assets/icons/Sablier.svg'
import Suivant from '@/assets/icons/Suivant.svg'
import Surprise from '@/assets/icons/Surprise.svg'
import EnveloppeCachet from '@/assets/illustrations/enveloppe-cachet.svg'
import TimbreLune from '@/assets/illustrations/timbre-lune.svg'
import { Alerte } from '@/components/Alerte'
import { Bouton } from '@/components/Bouton'
import { BoutonRond } from '@/components/BoutonRond'
import { Case, type EtatCase } from '@/components/Case'
import { Ecran } from '@/components/Ecran'
import { Feuille } from '@/components/Feuille'
import { Puce } from '@/components/Puce'
import { Texte } from '@/components/Texte'
import {
  type CaseJour,
  construireCasesRecues,
  ligneSurprises,
  periodeParDefaut,
  periodesRecues,
  phraseAttente,
  resumerRecu,
} from '@/lib/calendrierRecu'
import { api } from '@/lib/client'
import { confirmer } from '@/lib/dialogue'
import { messageErreur } from '@/lib/formulaires'
import { TYPES_DE_MOT } from '@/lib/typesDeMot'
import { useSession } from '@/session/SessionProvider'
import { couleurs, rayons } from '@/theme/tokens'

/** Correspondance avec les états du composant Figma « Case du calendrier ». */
const ETAT_CASE: Record<CaseJour['etat'], EtatCase> = {
  lu: 'ouverte',
  a_ouvrir: 'aujourdhui',
  scelle: 'verrouillee',
  vide: 'vide',
}

/**
 * Le rituel se propose une fois par lancement de l'appli, si un mot attend :
 * « Plus tard » le repousse au lancement suivant.
 */
let rituelPropose = false

const ouvrirRituel = (ids: string[], joker = false) => {
  const [id, ...suite] = ids
  if (!id) return
  router.push({
    pathname: '/ouverture/[id]',
    params: { id, suite: suite.join(','), ...(joker ? { joker: '1' } : {}) },
  })
}

/** Écran 2.1 Mon calendrier (onglet « Pour moi »). */
export default function PourMoi() {
  const { moi } = useSession()
  const fuseau = moi?.utilisateur.fuseauHoraire ?? 'Europe/Paris'
  const [cal, setCal] = useState<CalendrierDestinataire | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [periodeChoisie, setPeriodeChoisie] = useState<string | null>(null)
  const [scellee, setScellee] = useState<CaseRecue | null>(null)

  useFocusEffect(
    useCallback(() => {
      let annule = false
      api
        .pourMoi()
        .then((c) => {
          if (annule) return
          setCal(c)
          setErreur(null)
          if (!rituelPropose) {
            rituelPropose = true
            ouvrirRituel(resumerRecu(c).aOuvrir)
          }
        })
        .catch((e: unknown) => {
          if (!annule) setErreur(messageErreur(e))
        })
      return () => {
        annule = true
      }
    }, []),
  )

  if (!cal) {
    return (
      <Ecran bas={false}>
        {erreur ? <Alerte message={erreur} /> : <ActivityIndicator color={couleurs.texte.encre} />}
      </Ecran>
    )
  }

  const prenom = cal.expediteur.prenom
  const periodes = periodesRecues(cal)
  const periode = periodes.find((p) => p.cle === periodeChoisie) ?? periodeParDefaut(periodes)
  const cases = periode ? construireCasesRecues(cal, periode) : []
  const resume = resumerRecu(cal)
  const surprises = ligneSurprises(cal.surprises)

  const toucher = (c: CaseJour) => {
    if (c.etat === 'a_ouvrir') {
      ouvrirRituel(c.mots.filter((m) => m.etat === 'a_ouvrir').map((m) => m.id))
    } else if (c.etat === 'scelle') {
      setScellee(c.mots.find((m) => m.etat === 'scelle') ?? null)
    } else if (c.etat === 'lu' && c.mots[0]) {
      router.push({ pathname: '/mot/[id]', params: { id: c.mots[0].id } })
    }
  }

  const utiliserJoker = async (kase: CaseRecue) => {
    const ok = await confirmer(
      'Utiliser ton joker ?',
      `Tu en as un par mois. ${prenom} verra que tu as ouvert ce mot en avance.`,
      'Ouvrir maintenant',
    )
    if (!ok) return
    setScellee(null)
    ouvrirRituel([kase.id], true)
  }

  const lettresFermees = cal.lettres.filter((l) => l.etat === 'scelle').length

  return (
    <Ecran bas={false}>
      <View style={styles.titre}>
        <View style={styles.titreTexte}>
          <Texte variante="labelS" couleur={couleurs.texte.encreDouce}>
            {libellesJour(cal.aujourdhui).long.toUpperCase()}
          </Texte>
          <Texte variante="titreL" accessibilityRole="header">
            De la part de <Texte variante="titreItaliqueL">{prenom}</Texte>
          </Texte>
        </View>
        <TimbreLune width={39.6} height={48.4} />
      </View>

      <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
        {resume.ligne}
      </Texte>

      <View style={styles.periodes} accessibilityRole="radiogroup" accessibilityLabel="Période">
        {periodes.map((p) => (
          <Puce
            key={p.cle}
            libelle={p.libelle}
            active={p.cle === periode?.cle}
            onPress={() => setPeriodeChoisie(p.cle)}
          />
        ))}
      </View>

      {erreur ? <Alerte message={erreur} /> : null}

      {/* Le pendant de la ligne de l'auteur : une surprise arrive, jamais le jour. */}
      {surprises ? (
        <View style={styles.surprises}>
          <Surprise width={18} height={18} color={couleurs.texte.encreDouce} />
          <Texte variante="corpsS" couleur={couleurs.texte.encreDouce} style={styles.flex}>
            {surprises}
          </Texte>
        </View>
      ) : null}

      <View style={styles.cases}>
        {cases.map((c) => (
          <Case
            key={c.jour}
            etat={ETAT_CASE[c.etat]}
            jourSemaine={c.titre}
            jour={c.chiffre}
            info={c.info}
            Icone={c.mots[0] ? TYPES_DE_MOT[c.mots[0].type].Icone : undefined}
            libelleAccessible={c.libelleAccessible}
            onPress={c.etat === 'vide' ? undefined : () => toucher(c)}
          />
        ))}
      </View>

      {cal.lettres.length > 0 ? (
        <Pressable
          onPress={() => router.push('/lettres')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.lettres, pressed && styles.presse]}
        >
          <BoutonRond Icone={Lune} fond={couleurs.decor.lavande} />
          <View style={styles.flex}>
            <Texte variante="labelM">
              {cal.lettres.length} lettre{cal.lettres.length > 1 ? 's' : ''} « Ouvre quand… »
            </Texte>
            <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
              {lettresFermees > 0
                ? 'À ouvrir quand tu en as besoin'
                : 'Toutes ouvertes, à relire quand tu veux'}
            </Texte>
          </View>
          <Suivant width={20} height={20} color={couleurs.texte.encre} />
        </Pressable>
      ) : null}

      <Feuille visible={scellee !== null} onFermer={() => setScellee(null)}>
        {scellee ? (
          <CaseScellee
            kase={scellee}
            prenom={prenom}
            aujourdhui={cal.aujourdhui}
            fuseau={fuseau}
            jokersRestants={cal.jokersRestants}
            onAttendre={() => setScellee(null)}
            onJoker={() => void utiliserJoker(scellee)}
          />
        ) : null}
      </Feuille>
    </Ecran>
  )
}

/** 2.2 Case scellée : date, type, compte à rebours, indice, et le joker du mois. */
function CaseScellee({
  kase,
  prenom,
  aujourdhui,
  fuseau,
  jokersRestants,
  onAttendre,
  onJoker,
}: {
  kase: CaseRecue
  prenom: string
  aujourdhui: string
  fuseau: string
  jokersRestants: number
  onAttendre: () => void
  onJoker: () => void
}) {
  const heure = formaterHeure(heureLocale(new Date(kase.unlockAt), fuseau))
  return (
    <>
      <View style={styles.tete}>
        <EnveloppeCachet width={100} height={75} />
        <View style={styles.flex}>
          <Texte variante="labelS" couleur={couleurs.texte.encreDouce}>
            {`${libellesJour(kase.jour).long} · ${heure}`.toUpperCase()}
          </Texte>
          <Texte variante="titreM" accessibilityRole="header">
            {phraseAttente(kase.type)}
          </Texte>
          <View style={styles.rebours}>
            <Sablier width={16} height={16} color={couleurs.action.cachet} />
            {/* Cachet sur carte : 4,7:1. */}
            <Texte variante="labelM" couleur={couleurs.action.cachet}>
              {compteARebours(ecartEnJours(aujourdhui, kase.jour))}
            </Texte>
          </View>
        </View>
      </View>
      {kase.indice ? (
        <View style={styles.indice}>
          <Texte variante="labelS" couleur={couleurs.texte.encreDouce}>
            {`L’indice de ${prenom}`.toUpperCase()}
          </Texte>
          <Texte variante="manuscritM">« {kase.indice} »</Texte>
        </View>
      ) : null}
      <Bouton libelle="D’accord, j’attends" pleineLargeur onPress={onAttendre} />
      <Bouton
        libelle={
          jokersRestants > 0 ? 'Utiliser mon joker (1 ce mois-ci)' : 'Joker déjà utilisé ce mois-ci'
        }
        Icone={Joker}
        variante="secondaire"
        pleineLargeur
        desactive={jokersRestants === 0}
        accessibilityHint="Ouvre ce mot avant son jour. Un joker par mois."
        onPress={onJoker}
      />
    </>
  )
}

const styles = StyleSheet.create({
  titre: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titreTexte: {
    flex: 1,
    gap: 4,
  },
  periodes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  surprises: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flex: {
    flex: 1,
  },
  cases: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  lettres: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    paddingVertical: 28,
    borderRadius: rayons.carte,
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
    backgroundColor: couleurs.fond.carte,
  },
  presse: {
    opacity: 0.8,
  },
  tete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  rebours: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  indice: {
    gap: 6,
    padding: 16,
    borderRadius: rayons.carte,
    backgroundColor: couleurs.fond.papierOmbre,
  },
})
