# Mise en ligne de Billets doux

Cibles :

- **API** : https://api.billetsdoux.app (Heroku, dyno Basic, région Europe) ;
- **version web** : https://billetsdoux.app (Cloudflare Pages) ;
- **appli Android** : APK installable (profil EAS `preview`), paquet `com.webjuno.billetsdoux`.

Services :

- **MongoDB Atlas** : base `billets-doux` sur Cluster0 (AWS Paris), utilisateur dédié ;
- **Cloudflare R2** : bucket privé `billets-doux-medias-eu`, en juridiction UE (photos, vocaux,
  sauvegardes) ;
- **Cloudflare** : DNS, proxy, Pages, routage de `contact@billetsdoux.app` ;
- **Expo** : builds (EAS) et notifications, avec Firebase pour Android.

Les commandes se lancent depuis le dossier du projet. Les valeurs entre `<chevrons>` sont à remplacer.
Les secrets ne vont jamais dans un fichier ni dans l'historique du terminal : ils se tapent au moment
voulu, en saisie masquée (étape 5).

> **Règle des préversions.** Les préversions Pages (`*.billets-doux.pages.dev`) parlent à l'API de
> **production** : il n'en existe pas d'autre. On les teste **uniquement avec le duo de démo**, jamais
> avec nos vrais comptes.

---

## 0. Avant de commencer

- [ ] Le code à mettre en ligne est poussé sur GitHub (`Guiguizaure/billets-doux`).
- [ ] Le CLI Heroku est installé et connecté (`heroku login`), si vous préférez les commandes au
      tableau de bord.
- [ ] Secrets générés et rangés dans le gestionnaire de mots de passe :
  - `PAYLOAD_SECRET` de production : `openssl rand -hex 32` (jamais celui de dev) ;
  - `DEMO_MOT_DE_PASSE` : le mot de passe des deux comptes de démo ;
  - `EXPO_ACCESS_TOKEN` : expo.dev → _Account settings → Access tokens_.

---

## 1. MongoDB Atlas : base et utilisateur dédiés

Tout se fait sur **Cluster0**, dans le projet qui héberge déjà Frames et le Jardin d'Ana.

1. **Utilisateur** : _Security → Database Access → Add New Database User_, nom `billets-doux-app`.
   - _Database User Privileges_ : **Specific Privileges** → rôle **`readWrite`**, base
     **`billets-doux`**, collection vide. Aucun rôle global.
2. **Accès réseau** : la règle `0.0.0.0/0` existe déjà (les dynos Heroku n'ont pas d'adresse fixe).
3. **URI** : _Database → Connect → Drivers_. Ajoutez le nom de la base après `.mongodb.net/` :

   ```
   mongodb+srv://billets-doux-app:<mot-de-passe>@cluster0.<xxx>.mongodb.net/billets-doux?retryWrites=true&w=majority&appName=Cluster0
   ```

   Encodez les caractères spéciaux du mot de passe (`@` → `%40`, `:` → `%3A`…).

La base `billets-doux` apparaît d'elle-même au premier démarrage de l'API (collections et index).

---

## 2. Cloudflare R2 : bucket privé en Europe

1. _R2 → Create bucket_ : nom **`billets-doux-medias-eu`**, _Location_ : **juridiction Union
   européenne**. Le bucket reste privé : pas de domaine public, pas d'accès `r2.dev`.
2. _R2 → Manage API tokens → Create API token_ : permission **Object Read & Write**, limitée à ce
   bucket. Notez l'_Access Key ID_ et la _Secret Access Key_ (affichée une seule fois).
3. **Adresse S3** : _bucket → Settings → S3 API_. Pour un bucket en juridiction UE, elle contient
   `.eu.` : `https://<ID_DU_COMPTE>.eu.r2.cloudflarestorage.com`.
4. **CORS** : _bucket → Settings → CORS Policy → Edit_. Seule la version web en a besoin (envoi des
   photos) ; les téléphones n'y sont pas soumis.

   ```json
   [
     {
       "AllowedOrigins": [
         "https://billetsdoux.app",
         "https://billets-doux.pages.dev",
         "https://*.billets-doux.pages.dev"
       ],
       "AllowedMethods": ["GET", "PUT", "HEAD"],
       "AllowedHeaders": ["content-type"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

Le dossier `sauvegardes/` du bucket reçoit la sauvegarde de la nuit (étape 10). L'API ne signe jamais
d'URL vers ce dossier.

---

## 3. Heroku : l'API

### 3.1 Créer l'application

Tableau de bord : _New → Create new app_, région **Europe**. Ou :

```bash
heroku apps:create <nom-de-l-app> --region eu --stack heroku-24
heroku buildpacks:set heroku/nodejs -a <nom-de-l-app>
```

Le buildpack Node lit `engines.node` (24.21.0, la même version que `.nvmrc` pour Pages et
`eas.json` pour les builds Android) et `packageManager` (pnpm 11.3.0) dans `package.json`.
Il installe tout le dépôt, puis lance `heroku-postbuild`, qui ne construit que l'API (serveur
autonome Next, 76 Mo). `heroku-cleanup` supprime ensuite le reste (Expo, dépendances) : l'image
pèse environ 97 Mo. Le `Procfile` démarre `apps/api/.next/standalone/apps/api/server.js`.

### 3.2 Variables de configuration (avant le premier build)

_Settings → Config Vars_. Le serveur refuse de démarrer s'il en manque une, et le journal les nomme
(« Variables d'environnement manquantes en production : … »).

| Nom                    | Valeur                                                         | Obligatoire |
| ---------------------- | -------------------------------------------------------------- | ----------- |
| `DATABASE_URI`         | URI Atlas de l'étape 1                                         | oui         |
| `PAYLOAD_SECRET`       | secret de production (étape 0)                                 | oui         |
| `SERVER_URL`           | `https://api.billetsdoux.app`                                  | oui         |
| `PUBLIC_URL`           | `https://api.billetsdoux.app` (liens d'invitation)             | oui         |
| `WEB_URL`              | `https://billetsdoux.app`                                      | oui         |
| `CORS_ORIGINS`         | `https://billetsdoux.app,https://*.billets-doux.pages.dev`     | oui         |
| `S3_ENDPOINT`          | `https://<ID_DU_COMPTE>.eu.r2.cloudflarestorage.com`           | oui         |
| `S3_PUBLIC_ENDPOINT`   | la même valeur que `S3_ENDPOINT`                               | oui         |
| `S3_BUCKET`            | `billets-doux-medias-eu`                                       | oui         |
| `S3_ACCESS_KEY_ID`     | jeton R2 (étape 2)                                             | oui         |
| `S3_SECRET_ACCESS_KEY` | jeton R2 (étape 2)                                             | oui         |
| `DEMO_MOT_DE_PASSE`    | étape 0                                                        | oui         |
| `EXPO_ACCESS_TOKEN`    | étape 0                                                        | oui         |
| `S3_REGION`            | `auto` (valeur par défaut)                                     | non         |
| `APP_SCHEME`           | `billetsdoux` (valeur par défaut ; `billetsdoux-dev` en local) | non         |

À **ne pas** définir : `NODE_ENV` (déjà `production`), `TACHES_DESACTIVEES` (couperait les
notifications, la démo et les sauvegardes), `PORT`, `HOSTNAME`, `NODE_OPTIONS`.

La base doit être joignable dès le build : le build de Next charge la configuration de Payload.

### 3.3 GitHub et déploiement

_Deploy → Deployment method → GitHub_, dépôt `Guiguizaure/billets-doux` :

- pendant la mise en ligne : _Manual deploy_ de la branche en cours (`etape-9-mise-en-ligne`) ;
- une fois l'étape fusionnée : _Automatic deploys_ depuis **`main`**.

```bash
heroku logs --tail -a <nom-de-l-app>   # au démarrage : « ✓ Ready », sans variable manquante
heroku apps:info -a <nom-de-l-app>      # « Slug size » : environ 97 Mo
```

Une image proche de 500 Mo veut dire que `heroku-cleanup` n'a pas tourné (le journal du build doit
afficher « Running heroku-cleanup »).

### 3.4 Dyno Basic, domaine, certificat

```bash
heroku ps:type web=basic -a <nom-de-l-app>     # Basic : ne s'endort jamais (tâches chaque minute)
heroku domains:add api.billetsdoux.app -a <nom-de-l-app>
heroku domains -a <nom-de-l-app>               # « DNS Target » : <…>.herokudns.com
heroku certs:auto:enable -a <nom-de-l-app>
heroku certs:auto -a <nom-de-l-app>            # attendu : « Cert issued »
```

Les tâches planifiées démarrent avec le serveur (pas à la première requête) : annonces des mots
chaque minute, rappel doux, remise à zéro de la démo (3 h UTC), sauvegarde (3 h 30), archives
d'export de plus de 24 heures (3 h 45).

---

## 4. Cloudflare : DNS de l'API

Zone `billetsdoux.app`, _DNS → Records → Add record_ :

| Type    | Nom   | Cible                                      | Proxy           |
| ------- | ----- | ------------------------------------------ | --------------- |
| `CNAME` | `api` | la _DNS Target_ Heroku (`….herokudns.com`) | voir ci-dessous |

1. Créez l'enregistrement en **DNS only** (nuage gris) : le certificat Heroku se valide directement.
2. Attendez « Cert issued » (étape 3.4).
3. Repassez-le en **Proxied** (nuage orange).

_SSL/TLS → Overview_ : **Full (strict)**. _SSL/TLS → Edge Certificates_ : **Always Use HTTPS**
activé (sinon `http://` répond sans rediriger).

---

## 5. Base de production : administrateur et duo de démo

Les scripts affichent la base visée (hôte et nom, jamais les identifiants) et demandent une
confirmation avant d'écrire. Ils n'exécutent jamais de tâche planifiée, et refusent une base distante
avec le stockage local de dev.

Dans un terminal zsh, dans `apps/api` :

```zsh
# Saisie masquée : rien ne s'affiche, rien n'est écrit dans l'historique.
read -rs "DATABASE_URI?URI Atlas (base billets-doux) : " && echo && export DATABASE_URI
read -rs "PAYLOAD_SECRET?PAYLOAD_SECRET de production : " && echo && export PAYLOAD_SECRET

# 1. Premier compte administrateur : e-mail, puis mot de passe masqué, saisi deux fois,
#    12 caractères au minimum. Refusé si un administrateur existe déjà.
pnpm admin:creer

# 2. Duo de démo (ses photos et son vocal partent dans R2) : il faut aussi le stockage.
export S3_ENDPOINT=https://<ID_DU_COMPTE>.eu.r2.cloudflarestorage.com S3_BUCKET=billets-doux-medias-eu
read -rs "S3_ACCESS_KEY_ID?Access Key ID R2 : " && echo && export S3_ACCESS_KEY_ID
read -rs "S3_SECRET_ACCESS_KEY?Secret Access Key R2 : " && echo && export S3_SECRET_ACCESS_KEY
read -rs "DEMO_MOT_DE_PASSE?Mot de passe de la démo : " && echo && export DEMO_MOT_DE_PASSE
pnpm demo:creer

# 3. On efface les secrets de la session.
unset DATABASE_URI PAYLOAD_SECRET S3_ENDPOINT S3_BUCKET S3_ACCESS_KEY_ID S3_SECRET_ACCESS_KEY DEMO_MOT_DE_PASSE
```

Si « Base ciblée » affiche `127.0.0.1:27018`, la variable n'a pas été prise en compte : répondez
« non » et recommencez. Ensuite, la démo se remet à zéro toute seule chaque nuit.

---

## 6. Cloudflare Pages : la version web

_Workers & Pages → Create → Pages → Connect to Git_, dépôt `Guiguizaure/billets-doux` :

| Réglage                              | Valeur                                                          |
| ------------------------------------ | --------------------------------------------------------------- |
| Nom du projet                        | `billets-doux` (sinon, adaptez `CORS_ORIGINS` et le CORS de R2) |
| Branche de production                | `main` (toutes les autres en préversion)                        |
| Framework preset                     | None                                                            |
| Commande de build                    | `pnpm --filter @billets-doux/mobile build:web`                  |
| Dossier publié                       | `apps/mobile/dist`                                              |
| Root directory                       | vide (racine du dépôt)                                          |
| Variable (Production **et** Preview) | `EXPO_PUBLIC_API_URL` = `https://api.billetsdoux.app`           |

Node 24 vient de `.nvmrc`, pnpm 11 de `package.json`. Sans `EXPO_PUBLIC_API_URL`, le build s'arrête
avec un message clair. Les en-têtes (sécurité, cache, `noindex` sur `/lab`) viennent de
`apps/mobile/public/_headers` ; Pages ajoute `noindex` aux préversions.

**Domaine** (une fois l'API en ligne) : _projet → Custom domains_ → `billetsdoux.app`.
**www** : un enregistrement `CNAME www → billetsdoux.app` en _Proxied_, puis _Rules → Redirect
Rules_, modèle **« Redirect from WWW to root »** (301).

Rappel : les préversions se testent **uniquement avec le duo de démo**.

---

## 7. Adresse de contact

_Email → Email Routing_ : activez le routage (Cloudflare ajoute ses enregistrements MX et TXT), puis
_Routing rules → Create address_ : `contact@billetsdoux.app` → votre boîte personnelle (adresse de
destination à confirmer par e-mail). Cette adresse figure dans la confidentialité et les mentions
légales.

---

## 8. Appli Android

Deux applis cohabitent sur un même téléphone :

| Build         | Profil EAS    | Paquet                        | Nom                | API                               |
| ------------- | ------------- | ----------------------------- | ------------------ | --------------------------------- |
| Production    | `preview`     | `com.webjuno.billetsdoux`     | Billets doux       | `https://api.billetsdoux.app`     |
| Développement | `development` | `com.webjuno.billetsdoux.dev` | Billets doux (dev) | le Mac (Metro, `pnpm dev:mobile`) |

`google-services.json` (les deux applis Firebase) est envoyé à EAS en variable fichier
`GOOGLE_SERVICES_JSON`, pour les trois environnements. La clé FCM V1 est rattachée aux deux paquets
(`npx eas-cli credentials -p android`).

```bash
cd apps/mobile
npx eas-cli build -p android --profile preview
```

Le lien de l'APK s'affiche à la fin du build. Sur chaque téléphone : installer l'APK, autoriser les
notifications à la fin de l'écran 1.3.

**Notifications** : une fois `EXPO_ACCESS_TOKEN` dans Heroku, activez sur expo.dev _Project →
Settings → Enhanced security for push notifications_ : seule l'API peut alors envoyer des
notifications à l'appli.

---

## 9. Vérifications une fois en ligne

Depuis le Mac, à la racine du projet :

```bash
pnpm verifier:prod               # lectures seulement : API, version web, en-têtes, CORS, admin
pnpm verifier:prod --avec-demo   # en plus : photo de la démo servie par R2, CORS du bucket
                                 # (ouvre puis ferme une session de démo)
```

Chaque contrôle affiche ✓ ou ✗ avec la cause. Puis, sur les téléphones (vrais comptes, version de
production) :

- [ ] Inscription (case « J'ai 18 ans ou plus »), invitation par lien, choix de l'heure, trois
      cartes du principe.
- [ ] Un mot avec photo et vocal, programmé quelques minutes plus tard : notification à l'heure,
      rituel d'ouverture, lecture.
- [ ] Version web : connexion, lecture d'un mot ouvert, envoi d'une photo.
- [ ] Nous deux : export des souvenirs (archive téléchargée).
- [ ] Le lendemain : un dossier `sauvegardes/<date>/` dans le bucket, avec `manifeste.json`.
- [ ] Un compte jetable supprimé depuis `billetsdoux.app/supprimer-mon-compte`.
- [ ] `heroku logs --tail` sans erreur pendant ces essais.

---

## 10. Sauvegardes et restauration

Chaque nuit à 3 h 30 UTC, l'API sauvegarde la base dans `sauvegardes/<date>/` du bucket (un fichier
par collection, puis `manifeste.json`) et garde les **14 dernières**. Les médias ne sont pas copiés :
ils sont déjà dans le bucket.

Restaurer remplace des données : site en maintenance, sauvegarde de l'état actuel d'abord.

```zsh
heroku maintenance:on -a <nom-de-l-app>

cd apps/api
read -rs "DATABASE_URI?URI Atlas : " && echo && export DATABASE_URI
read -rs "PAYLOAD_SECRET?PAYLOAD_SECRET de production : " && echo && export PAYLOAD_SECRET
export S3_ENDPOINT=https://<ID_DU_COMPTE>.eu.r2.cloudflarestorage.com S3_BUCKET=billets-doux-medias-eu
read -rs "S3_ACCESS_KEY_ID?Access Key ID R2 : " && echo && export S3_ACCESS_KEY_ID
read -rs "S3_SECRET_ACCESS_KEY?Secret Access Key R2 : " && echo && export S3_SECRET_ACCESS_KEY

pnpm sauvegarde:faire                                # l'état actuel, au cas où
pnpm sauvegarde:restaurer --liste                    # les sauvegardes complètes, récentes d'abord
pnpm sauvegarde:restaurer <nom> --remplacer          # ex. 2026-10-08T03-30-00Z

unset DATABASE_URI PAYLOAD_SECRET S3_ENDPOINT S3_BUCKET S3_ACCESS_KEY_ID S3_SECRET_ACCESS_KEY
heroku maintenance:off -a <nom-de-l-app>
```

Sans `--remplacer`, la restauration refuse d'écrire dans une base qui a des données. Rien n'est écrit
tant que la sauvegarde n'a pas été entièrement lue et vérifiée.

---

## 11. Revenir en arrière

- **API** : _Activity_ → dernier déploiement sain → _Roll back to here_, ou
  `heroku releases -a <nom-de-l-app>` puis `heroku rollback v<N> -a <nom-de-l-app>`. La base n'est
  pas touchée. Le déploiement automatique depuis `main` reste actif : corrigez ou annulez d'abord
  sur `main` (`git revert`), ou désactivez-le le temps de corriger.
- **Version web** : _Pages → projet → Deployments_ → déploiement sain → _Rollback to this
  deployment_.
- **Données** : restauration d'une sauvegarde (étape 10).
- **Mettre l'API hors ligne sans rien supprimer** : `heroku maintenance:on` /
  `heroku maintenance:off`.
