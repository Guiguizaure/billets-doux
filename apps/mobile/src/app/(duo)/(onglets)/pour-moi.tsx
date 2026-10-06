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
import { Pressable, StyleSheet, View } from 'react-native'

import Calendrier from '@/assets/icons/Calendrier.svg'
import Cloche from '@/assets/icons/Cloche.svg'
import Joker from '@/assets/icons/Joker.svg'
import Lune from '@/assets/icons/Lune.svg'
import Sablier from '@/assets/icons/Sablier.svg'
import Suivant from '@/assets/icons/Suivant.svg'
import Surprise from '@/assets/icons/Surprise.svg'
import EnveloppeCachet from '@/assets/illustrations/enveloppe-cachet.svg'
import OiseauMessager from '@/assets/illustrations/oiseau-messager.svg'
import TimbreLune from '@/assets/illustrations/timbre-lune.svg'
import { Alerte } from '@/components/Alerte'
import { BandeauPause } from '@/components/BandeauPause'
import { Bouton } from '@/components/Bouton'
import { BoutonRond } from '@/components/BoutonRond'
import { CasesFantomes } from '@/components/CasesFantomes'
import { Case, type EtatCase } from '@/components/Case'
import { Ecran } from '@/components/Ecran'
import { EtatVide } from '@/components/EtatVide'
import { useConfirmer } from '@/components/Dialogue'
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
import { messageErreur } from '@/lib/formulaires'
import {
  demanderNotifications,
  type EtatNotifications,
  etatNotifications,
} from '@/lib/notifications'
import { rituel } from '@/lib/rituel'
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

/** « Plus tard » sur la carte des notifications : elle revient au lancement suivant. */
let carteNotificationsMasquee = false

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
  const { moi, actualiser } = useSession()
  const fuseau = moi?.utilisateur.fuseauHoraire ?? 'Europe/Paris'
  const [cal, setCal] = useState<CalendrierDestinataire | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [periodeChoisie, setPeriodeChoisie] = useState<string | null>(null)
  const [scellee, setScellee] = useState<CaseRecue | null>(null)
  const confirmer = useConfirmer()
  const [notifications, setNotifications] = useState<EtatNotifications | null>(null)

  useFocusEffect(
    useCallback(() => {
      let annule = false
      // L'autre a pu mettre le duo en pause ou le fermer.
      void actualiser()
      // Relu à chaque retour sur l'écran : la personne a pu les activer dans les réglages.
      void etatNotifications().then((e) => {
        if (!annule) setNotifications(e)
      })
      api
        .pourMoi()
        .then((c) => {
          if (annule) return
          setCal(c)
          setErreur(null)
          if (rituel.aProposer()) {
            rituel.marquerPropose()
            ouvrirRituel(resumerRecu(c).aOuvrir)
          }
        })
        .catch((e: unknown) => {
          if (!annule) setErreur(messageErreur(e))
        })
      return () => {
        annule = true
      }
    }, [actualiser]),
  )

  if (!cal) {
    return <Ecran bas={false}>{erreur ? <Alerte message={erreur} /> : <CasesFantomes />}</Ecran>
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
    // La feuille se ferme d'abord : jamais deux fenêtres l'une sur l'autre.
    setScellee(null)
    const ok = await confirmer({
      titre: 'Utiliser ton joker ?',
      message: `Tu en as un par mois. ${prenom} verra que tu as ouvert ce mot en avance.`,
      action: 'Ouvrir',
    })
    if (ok) ouvrirRituel([kase.id], true)
    else setScellee(kase)
  }

  // Rien encore de l'autre : ni case, ni surprise, ni lettre.
  const vide = cal.cases.length === 0 && cal.surprises === 0 && cal.lettres.length === 0
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

      {notifications &&
      ['a_demander', 'bloque'].includes(notifications) &&
      !carteNotificationsMasquee ? (
        <CarteNotifications
          prenom={prenom}
          bloque={notifications === 'bloque'}
          onActiver={async () => setNotifications(await demanderNotifications())}
          onPlusTard={() => {
            carteNotificationsMasquee = true
            setNotifications(null)
          }}
        />
      ) : null}

      {vide ? null : (
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
      )}

      {erreur ? <Alerte message={erreur} /> : null}

      <BandeauPause />

      {moi?.duo?.retrouvailles ? (
        <Pressable
          onPress={() => router.push('/retrouvailles')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.surprises, pressed && styles.presse]}
        >
          <Calendrier width={18} height={18} color={couleurs.texte.encreDouce} />
          <Texte variante="corpsS" couleur={couleurs.texte.encreDouce} style={styles.flex}>
            {ligneRetrouvailles(moi.duo.retrouvailles, cal.aujourdhui)}
          </Texte>
        </Pressable>
      ) : null}

      {/* Le pendant de la ligne de l'auteur : une surprise arrive, jamais le jour. */}
      {surprises ? (
        <View style={styles.surprises}>
          <Surprise width={18} height={18} color={couleurs.texte.encreDouce} />
          <Texte variante="corpsS" couleur={couleurs.texte.encreDouce} style={styles.flex}>
            {surprises}
          </Texte>
        </View>
      ) : null}

      {vide ? (
        <EtatVide
          illustration={<OiseauMessager width={144} height={120} />}
          titre="Le calendrier se remplit bientôt"
          texte={`Les mots de ${prenom} apparaîtront ici, case par case. Tu verras le jour, jamais le contenu avant l’heure.`}
        />
      ) : (
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
      )}

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

/** « 16 jours avant de se revoir · samedi 31 octobre ». */
function ligneRetrouvailles(jour: string, aujourdhui: string) {
  const reste = Math.max(0, ecartEnJours(aujourdhui, jour))
  return reste === 0
    ? 'C’est le jour des retrouvailles'
    : `${reste} jour${reste > 1 ? 's' : ''} avant de se revoir · ${libellesJour(jour).long}`
}

/** Rappel discret : sans notification, on rate le moment où un mot s'ouvre. */
function CarteNotifications({
  prenom,
  bloque,
  onActiver,
  onPlusTard,
}: {
  prenom: string
  bloque: boolean
  onActiver: () => Promise<void>
  onPlusTard: () => void
}) {
  return (
    <View style={styles.encartNotifications}>
      <View style={styles.encartLigne}>
        <BoutonRond Icone={Cloche} fond={couleurs.decor.soleil} />
        <View style={styles.flex}>
          <Texte variante="labelM">Être prévenu quand un mot t’attend</Texte>
          <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
            {bloque
              ? 'Active les notifications de Billets doux dans les réglages du téléphone.'
              : `Une notification quand un mot de ${prenom} s’ouvre, sans rien dévoiler.`}
          </Texte>
        </View>
      </View>
      <View style={styles.encartBoutons}>
        <View style={styles.flex}>
          <Bouton
            libelle="Plus tard"
            variante="secondaire"
            pleineLargeur
            compact
            onPress={onPlusTard}
          />
        </View>
        <View style={styles.flex}>
          <Bouton
            libelle={bloque ? 'Réglages' : 'Activer'}
            pleineLargeur
            compact
            onPress={() => void onActiver()}
          />
        </View>
      </View>
    </View>
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
  encartNotifications: {
    gap: 14,
    padding: 14,
    borderRadius: rayons.carte,
    backgroundColor: couleurs.fond.papierOmbre,
  },
  encartLigne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  encartBoutons: {
    flexDirection: 'row',
    gap: 10,
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
