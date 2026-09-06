# Union Touarga Sport

Site moderne et responsive consacré à l'Union Touarga Sport. Les matchs et le classement sont synchronisés avec des APIs sportives publiques; les joueurs, le staff, les actualités, les médias et les textes du site sont publiés depuis MySQL.

## Fonctionnalités

- Calendrier et résultats de l'équipe première
- Classement de la Botola Pro
- Effectif classé par poste et staff par département
- Actualités et galerie de photos officielles, avec textes, résumés et images modifiables
- Histoire et identité du club
- Dashboard administrateur pour gérer les textes, joueurs, staff, actualités, médias et tous les visuels globaux
- Super-administrateur MySQL pour créer, suspendre, promouvoir et supprimer les autres comptes
- Remplissage initial unique depuis l'ancien site officiel, déclenché par le super-administrateur
- Publication, masquage et ordre d'affichage des contenus importés ou créés dans le dashboard
- Photos officielles initiales conservées localement dans `public/content-images`
- Aperçu et remplacement direct des images depuis le dashboard
- Tables MySQL relationnelles dédiées; aucun fallback public pour les contenus administrables
- Interface responsive aux couleurs de l'UTS
- Revalidation automatique des données toutes les cinq minutes

## Développement local

Prérequis : Node.js 20 ou version ultérieure.

```bash
npm install
npm run db:prepare
npm run dev
```

Le site est alors accessible sur [http://localhost:8080](http://localhost:8080).

### Administration

Copier `.env.example` vers `.env.local`, puis renseigner :

- `MYSQL_URL` : URL de connexion MySQL. `DATABASE_URL` est également acceptée.
- `PORT` : port HTTP du service, `8080` par défaut.
- `ADMIN_USERNAME` : identifiant de secours utilisé par le bootstrap applicatif.
- `ADMIN_DISPLAY_NAME` : nom affiché du compte de secours.
- `ADMIN_PASSWORD` : mot de passe de secours facultatif, d'au moins 12 caractères.
- `ADMIN_SESSION_SECRET` : secret aléatoire d'au moins 32 caractères, distinct du mot de passe.

Le dashboard est accessible sur [http://localhost:8080/admin](http://localhost:8080/admin). Le schéma est créé automatiquement; sa définition complète est disponible dans `db/schema.sql`.

`npm run db:prepare` applique uniquement le schéma et les migrations. La migration SQL `005_sql_super_admin` crée ou restaure une seule fois le compte `admin` avec le rôle `super_admin`; elle ne réinitialise jamais ce compte lors des exécutions suivantes. Les identifiants temporaires de cette installation sont conservés uniquement dans le fichier local ignoré `initial-admin-credentials.txt`. Après la première connexion, changez immédiatement le mot de passe dans **Compte**. Cette commande ne remplit et ne synchronise aucun contenu éditorial.

Après la première connexion, le super-administrateur utilise **Remplir le site une première fois** sur la vue d'ensemble. Cette action importe en une seule opération les joueurs, le staff, les actualités et les médias. Son état est enregistré dans `content_imports`; après réussite, le bouton disparaît et l'import ne peut plus être relancé. Les déploiements suivants ne modifient jamais ces contenus.

Les photos présentes au moment de l'import sont déjà copiées dans `public/content-images` et associées aux contenus par `src/data/initial-image-manifest.json`. Toutes les URL d'image et leurs textes alternatifs restent modifiables dans le dashboard, y compris les écussons, les bannières, les visuels de l'accueil et l'image de connexion. Chaque champ affiche l'image actuelle et permet soit de conserver ou modifier son URL, soit d'importer un nouveau fichier JPEG, PNG, WebP ou GIF de 8 Mo maximum. Les nouveaux fichiers sont validés côté serveur et stockés dans `media_assets` en MySQL afin de rester disponibles après un redéploiement Railway. `npm run assets:download` sert uniquement à renouveler les fichiers sources du premier import avant un commit; cette commande ne fait pas partie du déploiement.

Le bootstrap applicatif avec `ADMIN_USERNAME`, `ADMIN_DISPLAY_NAME` et `ADMIN_PASSWORD` reste disponible comme solution de secours. Ces variables ne réinitialisent jamais un compte existant. Le super-administrateur peut ensuite changer son mot de passe dans `/admin/compte` et gérer les autres accès dans `/admin/administrateurs`; les mots de passe sont hachés avec bcrypt et les opérations sensibles sont consignées dans `admin_audit_log`.

### Structure MySQL

- `players` : identité, poste, statistiques, publication et provenance des joueurs
- `staff_members` : staff technique, médical, direction et autres membres
- `news_articles` : titres, résumés, liens, dates et visuels des actualités
- `media_items` : médias et miniatures
- `media_assets` : fichiers image importés depuis le dashboard
- `site_content` : textes, liens et visuels globaux du site
- `club_milestones` : jalons historiques ordonnés
- `admin_users` : comptes, rôles, état et version de session
- `content_imports` : verrou et résultat du remplissage initial unique
- `admin_audit_log` : journal des opérations de sécurité
- `schema_migrations` : migrations déjà appliquées

Il n'existe volontairement aucune table de matchs ou de classement : ces deux rubriques restent alimentées par les APIs sportives publiques.

Sans MySQL, les matchs et le classement restent disponibles via les APIs publiques, mais les rubriques éditoriales affichent un état vide. L'administration signale la base hors ligne et refuse proprement les écritures.

## Vérifications

```bash
npm run lint
npm run build
```

Pour tester la version de production :

```bash
npm run start
```

Le serveur écoute sur [http://localhost:8080](http://localhost:8080) par défaut. Si Railway fournit `PORT`, le serveur utilise automatiquement sa valeur.

## Déploiement sur Railway

1. Créer un nouveau projet dans Railway.
2. Choisir **Deploy from GitHub repo**.
3. Sélectionner ce dépôt.
4. Laisser Railway détecter automatiquement l'application Next.js.

Si le dépôt n'apparaît pas dans Railway :

1. Ouvrir la page [Install Railway App](https://github.com/apps/railway-app/installations/new) sur GitHub.
2. Sélectionner le compte `musiquelew-hash`.
3. Autoriser tous les dépôts ou ajouter explicitement `union-touarga-sport` aux dépôts sélectionnés.
4. Revenir dans Railway puis choisir **Add > GitHub Repository > Refresh**.

Le fichier `railway.json` configure explicitement Railpack, la commande de build, la commande de démarrage et le healthcheck HTTP.

Les commandes déjà définies dans `package.json` sont :

- Build : `npm run build`
- Pré-déploiement : `npm run db:prepare`
- Démarrage : `npm run start`

### Ajouter MySQL et activer le dashboard

1. Dans le même projet Railway, choisir **Add > Database > MySQL**.
2. Ouvrir le service Next.js puis **Variables**.
3. Ajouter une référence vers l'URL MySQL sous le nom `MYSQL_URL`. Railway expose généralement `${{MySQL.MYSQL_URL}}` lorsque le service s'appelle `MySQL`.
4. Ajouter `PORT=8080`.
5. Ajouter `ADMIN_SESSION_SECRET` comme variable privée d'au moins 32 caractères. Les variables `ADMIN_USERNAME`, `ADMIN_DISPLAY_NAME` et `ADMIN_PASSWORD` sont seulement nécessaires au bootstrap de secours.
6. Redéployer le service puis ouvrir `/admin`.

Railway exécute automatiquement `npm run db:prepare` avant chaque démarrage grâce à `railway.json`. Le déploiement applique donc le schéma et garantit le premier super-administrateur, sans importer ni modifier les contenus éditoriaux. Après le tout premier déploiement, ouvrez `/admin` avec ce compte et cliquez une seule fois sur **Remplir le site une première fois**.

## Sources

- Calendrier et résultats : APIs publiques TheSportsDB et Sofascore
- Classement : Sofascore, avec le tableau public du site officiel comme seconde source sportive
- Données sportives complémentaires : Sofascore lorsqu'il est disponible
- Joueurs, staff, actualités, médias, textes et références d'images : MySQL
- Remplissage éditorial initial unique : ancien site WordPress officiel de l'Union Touarga Sport
- Images du remplissage initial : fichiers locaux versionnés dans `public/content-images`

Les données sportives sont remises à jour automatiquement par Next.js. Après le remplissage initial, les contenus éditoriaux et leurs images sont administrés exclusivement dans le dashboard et ne sont jamais réimportés au déploiement.
