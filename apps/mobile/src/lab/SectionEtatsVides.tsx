import { StyleSheet, View } from 'react-native'

import Horloge from '@/assets/icons/Horloge.svg'
import Lien from '@/assets/icons/Lien.svg'
import Photo from '@/assets/icons/Photo.svg'
import BoiteSouvenirs from '@/assets/illustrations/boite-souvenirs.svg'
import FilEntreNous from '@/assets/illustrations/fil-entre-nous.svg'
import LuneDormeuse from '@/assets/illustrations/lune-dormeuse.svg'
import OiseauMessager from '@/assets/illustrations/oiseau-messager.svg'
import { BandeauInfo } from '@/components/BandeauInfo'
import { Bouton } from '@/components/Bouton'
import { CasesFantomes } from '@/components/CasesFantomes'
import { EtatVide } from '@/components/EtatVide'
import { Section } from '@/components/Section'
import { Texte } from '@/components/Texte'
import { couleurs, rayons } from '@/theme/tokens'

/** Étape 8 : textes des états vides et des erreurs, à valider avant intégration. */
export function SectionEtatsVides() {
  return (
    <Section titre="Étape 8 · États vides, chargement et erreurs (textes à valider)">
      <View style={styles.grille}>
        <Fiche titre="Pour moi, rien encore">
          <EtatVide
            illustration={<OiseauMessager width={144} height={120} />}
            titre="Le calendrier se remplit bientôt"
            texte="Les mots de Lina apparaîtront ici, case par case. Tu verras le jour, jamais le contenu avant l’heure."
          />
        </Fiche>
        <Fiche titre="Pour toi, duo tout neuf">
          <EtatVide
            illustration={<FilEntreNous width={192} height={90} />}
            titre="Un premier mot pour Léo ?"
            texte="Écris-le maintenant et choisis le jour où il s’ouvrira."
            action={<Bouton libelle="Écrire un premier mot" pleineLargeur />}
          />
        </Fiche>
        <Fiche titre="Souvenirs, rien encore">
          <EtatVide
            illustration={<BoiteSouvenirs width={121} height={99} />}
            titre="Pas encore de souvenir"
            texte="Chaque mot ouvert, le tien comme celui de Lina, viendra se ranger ici."
          />
        </Fiche>
        <Fiche titre="Lettres « Ouvre quand… » reçues">
          <EtatVide
            illustration={<LuneDormeuse width={90} height={90} />}
            titre="Aucune lettre pour l’instant"
            texte="Lina peut t’écrire des lettres sans date, à ouvrir au moment voulu."
          />
        </Fiche>
        <Fiche titre="Chargement d’un calendrier (au lieu de la roue)">
          <CasesFantomes nombre={6} />
        </Fiche>
        <Fiche titre="Bandeaux">
          <View style={styles.bandeaux}>
            <BandeauInfo
              Icone={Lien}
              message="Pas de réseau. Tes mots t’attendent : on réessaie tout seul."
            />
            <BandeauInfo
              Icone={Horloge}
              message="Ta session a expiré. Reconnecte-toi pour retrouver tes mots."
            />
            <BandeauInfo
              Icone={Photo}
              message="La photo n’est pas partie."
              action={{ libelle: 'Réessayer', onPress: () => undefined }}
            />
          </View>
        </Fiche>
      </View>
    </Section>
  )
}

function Fiche({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <View style={styles.fiche}>
      <Texte variante="labelM">{titre}</Texte>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  grille: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  fiche: {
    flexGrow: 1,
    flexBasis: 320,
    gap: 6,
    padding: 16,
    borderRadius: rayons.carte,
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
    backgroundColor: couleurs.fond.papier,
  },
  bandeaux: {
    gap: 10,
  },
})
