# Billets doux — brief de départ pour Claude Code

## Le projet en deux phrases
Billets doux est une appli mobile pour **deux personnes seulement** (un duo exclusif). Chacun prépare à l'avance, pour l'autre, un calendrier de petits mots (texte, poème, photo, vocal) qui ne s'ouvrent qu'au jour choisi.

Maquette de référence (22 écrans, design system, illustrations provisoires) : Figma « Billets doux — maquette », https://www.figma.com/design/5atwB71CcVb0Z4d6XYT3ZA. Les pages « Fondations » (variables, styles de texte, composants) et « Écrans » (5 parcours) font foi pour l'interface.

Objectif : une bêta utilisable par un vrai couple **et** une pièce de portfolio qui montre une appli mobile native, avec une version web de démonstration.

## Règles de travail (non négociables)
- Toujours travailler sur une branche ; un commit par étape logique ; `tsc`, lint et build doivent passer avant chaque commit.
- Ne jamais pousser `main` sans mon accord explicite.
- Aucune écriture dans une base de production sans mon accord.
- Identifiants de production (Atlas, R2, Apple, Expo) : c'est moi qui les tape, dans mon terminal. Tu prépares les scripts, je les lance.
- Serveurs arrêtés par PID ou par port, jamais `pkill` par motif.
- Choix visuels (police, palette, animations, navigation) : une page de test temporaire, non indexée, qui montre les variantes côte à côte, à valider en local.
- Avant chaque étape : annonce ce que tu vas faire. À la fin : ce qui marche, ce qui reste, comment je teste.

## Architecture
Un seul dépôt (pnpm workspaces) :

```
apps/mobile   Expo (Expo Router) → iOS, Android et web à partir du même code
apps/api      Next.js + Payload CMS 3 (API REST, auth, admin, tâches planifiées)
packages/shared  types TypeScript, schémas zod, client d'API, règles de dates
```

- **apps/mobile** : dernière version stable du SDK Expo, Expo Router, TypeScript strict. Styles avec NativeWind ou StyleSheet (propose les deux sur la page de test, je choisis). Animations : Reanimated. Modules Expo : `expo-notifications`, `expo-audio`, `expo-image-picker`, `expo-image-manipulator`, `expo-secure-store`, `expo-font`, `react-native-svg`.
- **apps/api** : même stack que mes autres projets (Next 16.3.x, Payload 3.90.x, MongoDB). Médias sur Cloudflare R2 dans un **bucket privé dédié** (pas celui de webjuno).
- **packages/shared** : aucun composant d'interface. React en `peerDependency` seulement, pour éviter deux versions de React entre Next et Expo. Vérifie les versions de React imposées par le SDK Expo et isole-les si besoin.
- La version web d'Expo est une **démo** : tout doit s'afficher et se lire, mais notifications et enregistrement vocal peuvent être désactivés avec un message clair. Sur grand écran, l'appli s'affiche centrée dans un cadre de téléphone.

### Trois règles pour pouvoir évoluer
1. **Toute la logique vit dans l'API** (verrouillage, programmation, droits, jokers). L'appli ne fait qu'afficher.
2. **Une seule fonction `notify(user, event)` côté serveur**, pour pouvoir changer de service de notification sans toucher au reste.
3. **Les médias ne sont jamais publics** : URL signées, de courte durée, générées par l'API uniquement si l'utilisateur a le droit de voir le contenu.

## Modèle de données (Payload)
- **users** : email, mot de passe (auth Payload), prénom, fuseau horaire, heure de découverte (ex. 08:00), jetons de notification (par appareil), réglages (rappel doux, indices visibles).
- **duos** : deux membres, statut (`invitation`, `actif`, `pause`, `ferme`), code d'invitation + expiration (7 jours), date de création, date des retrouvailles (optionnelle), rythme du calendrier de chacun (`jour`, `semaine`, `mois`).
- **mots** : duo, auteur, destinataire, type (`mot`, `poeme`, `photo`, `vocal`, combinaisons possibles), texte, médias (photo, vocal), indice, mode (`date`, `semaine_hasard`, `ouvre_quand`, `brouillon`), `unlockAt` (calculé), titre « Ouvre quand… », statut (`brouillon`, `programme`, `ouvert`), `openedAt`, ouvert grâce au joker (booléen), `notifiedAt`.
- **reponses** : mot, auteur, réaction (`coeur`, `lune`, `etoile`, `etincelle`) et/ou texte (140 signes max) et/ou vocal (30 s max).
- **medias** : upload vers R2 privé, propriétaire, type, durée (vocal), taille.

## Règles métier
- **Duo exclusif** : un utilisateur a au plus un duo actif ou en pause. Rejoindre un duo par code ou lien ; le code expire après 7 jours.
- **Verrouillage côté serveur** : avant `unlockAt`, le destinataire ne reçoit que date, type, indice (si activé) et compte à rebours. Jamais le texte, jamais d'URL de média. Teste-le avec un test automatisé.
- **Calcul de `unlockAt`** : date choisie + heure de découverte **du destinataire**, dans **son** fuseau horaire.
- **« Cette semaine, au hasard »** : le serveur tire le jour au moment de la programmation ; l'auteur voit seulement « cette semaine ».
- **Ouvre quand…** : pas de date, s'ouvre une seule fois à la demande du destinataire, puis rejoint les souvenirs.
- **Rythme du calendrier** (jour, semaine ou mois) : réglage du calendrier de l'auteur, qui détermine les cases affichées. Ne pas implémenter le bloc « Répéter » de l'écran 3.5 pour l'instant.
- **Joker** : un par mois et par destinataire, permet d'ouvrir une case avant sa date ; renouvelé le 1er du mois (fuseau du destinataire).
- **Rappel doux** : si moins de 2 mots programmés dans les 7 jours, une notification discrète à l'auteur, au plus une fois par semaine, désactivable.
- **Pause** : plus aucune notification, les cases continuent de s'ouvrir.
- **Fermer le duo** : les mots non ouverts sont supprimés (médias compris) ; chacun garde les mots déjà ouverts dans ses souvenirs ; l'autre reçoit simplement « le duo est fermé ». Export de ses souvenirs proposé avant.
- **Suppression du compte** disponible dans l'appli (exigence Apple) : supprime les données et les médias.

## Notifications
- Natif : Expo Push (jetons `ExponentPushToken`) via `expo-server-sdk`, derrière `notify()`.
- Une tâche planifiée Payload (toutes les 5 minutes) trouve les mots avec `unlockAt <= maintenant` et `notifiedAt` vide, envoie « Lina t'a écrit » **sans aucun contenu du mot**, puis remplit `notifiedAt`.
- Web : pas de notification dans la démo.

## Médias
- Upload direct du téléphone vers R2 avec une URL signée fournie par l'API.
- Photos : redimensionnées et compressées avant envoi (largeur max 1600 px).
- Vocaux : `expo-audio`, format m4a/AAC sur iOS et Android ; durée max 3 min (mot) et 30 s (réponse). Vérifier la lecture sur le web.
- Lecture : URL signée de quelques minutes, uniquement si le mot est ouvert pour cet utilisateur.

## Design
- Reprendre les variables de la page Fondations du Figma en tokens dans le code : fond papier `#F8F1E3`, papier ombre `#EEE2C9`, carte `#FFFBF3`, encre `#2A2346`, encre douce `#6B6385`, ligne `#D9CBAE`, cachet (actions) `#C8442C`, décors corail `#E4573D`, rose `#F4A7B9`, soleil `#F6C453`, lavande `#A99BE8`, nuit `#34408F`, sauge `#8CC09A`.
- Polices : Instrument Serif (titres), DM Sans (interface), Caveat (mots manuscrits).
- Illustrations : export SVG des composants « Illu/… » du Figma, rendus avec `react-native-svg`, **aux mêmes noms**, dans `apps/mobile/assets/illustrations/`. Elles sont provisoires : je les redessinerai à la main.
- Le texte crème sur rouge cachet est à 4,7:1 ; ne jamais mettre de texte sur les couleurs de décor.
- Accessibilité : libellés pour lecteur d'écran sur toutes les cases et boutons, tailles de texte dynamiques respectées, réduction des animations si le système la demande.

## Hors périmètre (pour l'instant)
Livre imprimé, calendrier cadeau, paiement, publication sur les stores, notifications web.

## Étapes
Chaque étape se termine par un commit, une démonstration sur téléphone et sur le web, et la liste de ce qui reste.

1. **Socle** : dépôt pnpm, `apps/api` (Payload + Mongo local), `apps/mobile` (Expo Router, web activé), `packages/shared`, tokens de design, polices, page de test des styles. Lancement des trois cibles en local.
2. **Comptes et duo** : inscription, connexion, jeton en `expo-secure-store` (repli web), invitation par code ou lien, création du duo, choix de l'heure de découverte (écrans 1.1 à 1.3).
3. **Écrire** : mot, poème, photo, vocal, indice, réserve « quand j'y pense » (écrans 3.2 à 3.4), uploads R2.
4. **Programmer** : date précise, cette semaine au hasard, Ouvre quand, rythme du calendrier, calendrier « Pour toi » (écrans 3.1, 3.5, 3.6).
5. **Recevoir** : calendrier « Pour moi », case scellée, joker, moment d'ouverture, lecture poème / vocal / photo, réactions et réponse (écrans 2.1 à 2.7). Tests automatisés du verrouillage.
6. **Notifications** : jetons, tâche planifiée, `notify()`, rappel doux. Test sur un vrai téléphone.
7. **Durer** : souvenirs, compte à rebours des retrouvailles, réglages, pause, fermeture du duo, export, suppression du compte (écrans 4.1, 4.2, 5.1, 5.2).
8. **Finitions** : animations, accessibilité, états vides et erreurs, version web en cadre de téléphone, performance.
9. **Mise en ligne** : API sur Heroku, Atlas avec un utilisateur dédié, bucket R2 privé, build de l'appli (TestFlight ou APK selon nos téléphones). Scripts prêts, c'est moi qui les lance.

## Pour commencer
Lis ce brief, pose-moi tes questions s'il y a un point ambigu, puis propose le plan détaillé de l'étape 1 avant d'écrire du code.
