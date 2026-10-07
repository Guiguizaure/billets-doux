import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import Boite from '@/assets/icons/Boite.svg'
import Calendrier from '@/assets/icons/Calendrier.svg'
import Duo from '@/assets/icons/Duo.svg'
import Mot from '@/assets/icons/Mot.svg'
import Photo from '@/assets/icons/Photo.svg'
import Plume from '@/assets/icons/Plume.svg'
import Vocal from '@/assets/icons/Vocal.svg'
import { Bulle, LARGEUR_BULLE } from '@/components/Bulle'
import { Case } from '@/components/Case'
import { Section } from '@/components/Section'
import { Texte } from '@/components/Texte'
import { bulleOnglet, type CibleVisite, VISITE_DEMO } from '@/lib/tutoriel'
import { couleurs } from '@/theme/tokens'

/** Maquette d'écran : 380 × 620, positions connues des éléments visés. */
const L = 380
const H = 620
type Cadre = { x: number; y: number; l: number; h: number }
const CIBLES: Record<NonNullable<CibleVisite>, Cadre> = {
  titre: { x: 12, y: 28, l: 230, h: 44 },
  caseScellee: { x: 254, y: 96, l: 111, h: 128 },
  ongletPourToi: { x: 95, y: H - 62, l: 95, h: 56 },
  ongletSouvenirs: { x: 190, y: H - 62, l: 95, h: 56 },
}

/** Étape 8 : le style de bulle retenu, sur la vraie visite guidée de la démo. */
export function SectionTutoriel() {
  return (
    <Section titre="Étape 8 · Tutoriel (style retenu)">
      <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
        Carte pointée, voile léger et anneau sur l’élément, timbre-lune et phrase manuscrite. Visite
        guidée de la démo (5 bulles), puis une bulle d’onglet. « Passer » recommence ici la visite,
        pour pouvoir la rejouer.
      </Texte>
      <Demo />
    </Section>
  )
}

function Demo() {
  const [etape, setEtape] = useState(0)
  const visite = etape < VISITE_DEMO.length
  const pas = VISITE_DEMO[Math.min(etape, VISITE_DEMO.length - 1)]!
  const cible = visite && pas.cible ? CIBLES[pas.cible] : null
  const enBas = cible ? cible.y > H / 2 : false

  // La bulle se place sous l'élément (ou au-dessus pour les onglets), la flèche pointe dessus.
  const centreCible = cible ? cible.x + cible.l / 2 : L / 2
  const gauche = Math.min(Math.max(centreCible - LARGEUR_BULLE / 2, 10), L - LARGEUR_BULLE - 10)
  const flecheX = centreCible - (gauche + LARGEUR_BULLE / 2)

  return (
    <View style={styles.fiche}>
      <View style={styles.ecran}>
        <Maquette />
        <View style={styles.voile} pointerEvents="none" />
        {cible ? (
          <View
            pointerEvents="none"
            style={[
              styles.anneau,
              { left: cible.x - 4, top: cible.y - 4, width: cible.l + 8, height: cible.h + 8 },
            ]}
          />
        ) : null}
        <View
          key={etape}
          style={[
            styles.place,
            { left: gauche, width: LARGEUR_BULLE },
            !cible
              ? { top: visite ? H / 2 - 90 : 96 + 128 + 4 }
              : enBas
                ? { bottom: H - cible.y + 6 }
                : { top: cible.y + cible.h + 6 },
          ]}
        >
          {visite ? (
            <Bulle
              texte={pas.texte}
              etape={etape + 1}
              total={VISITE_DEMO.length}
              fleche={cible ? (enBas ? 'bas' : 'haut') : null}
              flecheX={flecheX}
              libelleSuivant={etape === VISITE_DEMO.length - 1 ? 'Terminer' : 'Suivant'}
              onSuivant={() => setEtape(etape + 1)}
              onPasser={() => setEtape(0)}
            />
          ) : (
            <Bulle
              texte={bulleOnglet('pourMoi', 'Lina', '8 h')}
              fleche={null}
              libelleSuivant="Compris"
              onSuivant={() => setEtape(0)}
              onPasser={() => setEtape(0)}
            />
          )}
        </View>
      </View>
    </View>
  )
}

/** Un écran « Pour moi » simplifié, avec de vraies cases et une barre d'onglets. */
function Maquette() {
  return (
    <>
      <View style={styles.entete}>
        <Texte variante="labelS" couleur={couleurs.texte.encreDouce}>
          MARDI 6 OCTOBRE
        </Texte>
        <Texte variante="titreL">
          De la part de <Texte variante="titreItaliqueL">Lina</Texte>
        </Texte>
      </View>
      <View style={styles.cases}>
        <Case
          etat="ouverte"
          jourSemaine="lun."
          jour="5"
          info="lu"
          Icone={Photo}
          libelleAccessible="Lundi 5, lu"
        />
        <Case
          etat="aujourdhui"
          jourSemaine="mar."
          jour="6"
          info="à ouvrir"
          Icone={Mot}
          libelleAccessible="Mardi 6, à ouvrir"
        />
        <Case
          etat="verrouillee"
          jourSemaine="mer."
          jour="7"
          info="demain"
          Icone={Vocal}
          libelleAccessible="Mercredi 7, demain"
        />
      </View>
      <View style={styles.onglets}>
        {[
          { Icone: Calendrier, libelle: 'Pour moi' },
          { Icone: Plume, libelle: 'Pour toi' },
          { Icone: Boite, libelle: 'Souvenirs' },
          { Icone: Duo, libelle: 'Nous deux' },
        ].map(({ Icone, libelle }) => (
          <View key={libelle} style={styles.onglet}>
            <Icone width={20} height={20} color={couleurs.texte.encreDouce} />
            <Texte variante="labelS" couleur={couleurs.texte.encreDouce}>
              {libelle}
            </Texte>
          </View>
        ))}
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  fiche: {
    gap: 8,
  },
  ecran: {
    width: L,
    height: H,
    overflow: 'hidden',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
    backgroundColor: couleurs.fond.papier,
  },
  entete: {
    position: 'absolute',
    left: 12,
    top: 12,
    gap: 4,
  },
  cases: {
    position: 'absolute',
    left: 12,
    top: 96,
    flexDirection: 'row',
    gap: 10,
  },
  onglets: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 62,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: couleurs.trait.ligne,
    backgroundColor: couleurs.fond.carte,
  },
  onglet: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  voile: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(42, 35, 70, 0.28)',
  },
  anneau: {
    position: 'absolute',
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: couleurs.action.cachet,
  },
  place: {
    position: 'absolute',
  },
})
