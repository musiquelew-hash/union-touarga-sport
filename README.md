# Union Touarga Sport

Site moderne et responsive consacré à l'Union Touarga Sport. Les matchs et le classement sont synchronisés avec des APIs sportives publiques; les joueurs, le staff, les actualités, les médias et les textes du site sont publiés depuis MySQL.

## Fonctionnalités

- Calendrier et résultats de l'équipe première
- Classement de la Botola Pro
- Effectif classé par poste et staff par département
- Actualités et galerie de photos officielles
- Histoire et identité du club
- Dashboard administrateur pour gérer les textes, joueurs, staff, actualités et médias
- Super-administrateur MySQL pour créer, suspendre, promouvoir et supprimer les autres comptes
- Publication, masquage, ordre d'affichage et import ponctuel de l'ancien site officiel
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
- `ADMIN_USERNAME` : identifiant de connexion, `admin` par défaut.
- `ADMIN_DISPLAY_NAME` : nom affiché du premier super-administrateur.
- `ADMIN_PASSWORD` : mot de passe initial d'au moins 12 caractères.
- `ADMIN_SESSION_SECRET` : secret aléatoire d'au moins 32 caractères, distinct du mot de passe.

Le dashboard est accessible sur [http://localhost:8080/admin](http://localhost:8080/admin). Le schéma est créé automatiquement; sa définition complète est disponible dans `db/schema.sql`.

`npm run db:prepare` applique les migrations, crée le premier super-administrateur si `admin_users` est vide, initialise les textes et synchronise l'ancien site officiel. Une ligne modifiée depuis le dashboard passe sous contrôle manuel et n'est plus écrasée par les synchronisations de déploiement. Le bouton **Importer l’ancien site** reste une réinitialisation explicite de la rubrique.

Le premier compte est créé avec `ADMIN_USERNAME`, `ADMIN_DISPLAY_NAME` et `ADMIN_PASSWORD`. Ces variables ne réinitialisent jamais un compte existant. Le super-administrateur peut ensuite gérer les autres accès dans `/admin/administrateurs`; les mots de passe sont hachés avec bcrypt et les opérations sensibles sont consignées dans `admin_audit_log`.

### Structure MySQL

- `players` : identité, poste, statistiques, publication et provenance des joueurs
- `staff_members` : staff technique, médical, direction et autres membres
- `news_articles` : actualités et visuels
- `media_items` : médias et miniatures
- `site_content` : textes et liens globaux du site
- `club_milestones` : jalons historiques ordonnés
- `admin_users` : comptes, rôles, état et version de session
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
5. Ajouter `ADMIN_USERNAME`, `ADMIN_DISPLAY_NAME`, `ADMIN_PASSWORD` et `ADMIN_SESSION_SECRET` comme variables privées.
6. Redéployer le service puis ouvrir `/admin`.

Railway exécute automatiquement `npm run db:prepare` avant chaque démarrage grâce à `railway.json`. Le déploiement applique donc le schéma, garantit le premier super-admin et met à jour les lignes encore liées à la source officielle. Aucun seed manuel n'est nécessaire.

## Sources

- Calendrier et résultats : APIs publiques TheSportsDB et Sofascore
- Classement : Sofascore, avec le tableau public du site officiel comme seconde source sportive
- Données sportives complémentaires : Sofascore lorsqu'il est disponible
- Joueurs, staff, actualités, médias et textes : MySQL
- Synchronisation éditoriale initiale et de déploiement : ancien site WordPress officiel de l'Union Touarga Sport

Les données sportives sont remises à jour automatiquement par Next.js. Les contenus éditoriaux officiels sont réconciliés à chaque déploiement; toute ligne modifiée dans le dashboard reste ensuite protégée des mises à jour automatiques.
