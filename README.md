# Union Touarga Sport

Site moderne et responsive consacré à l'Union Touarga Sport. Les matchs et le classement sont synchronisés avec des APIs sportives publiques; les joueurs, le staff, les actualités, les médias et les textes du site sont publiés depuis MySQL.

## Fonctionnalités

- Calendrier et résultats de l'équipe première
- Classement de la Botola Pro
- Effectif classé par poste et staff par département
- Actualités et galerie de photos officielles
- Histoire et identité du club
- Dashboard administrateur pour gérer les textes, joueurs, staff, actualités et médias
- Publication, masquage, ordre d'affichage et import ponctuel de l'ancien site officiel
- Stockage éditorial MySQL; aucun fallback public pour les contenus administrables
- Interface responsive aux couleurs de l'UTS
- Revalidation automatique des données toutes les cinq minutes

## Développement local

Prérequis : Node.js 20 ou version ultérieure.

```bash
npm install
npm run db:seed
npm run dev
```

Le site est alors accessible sur [http://localhost:8080](http://localhost:8080).

### Administration

Copier `.env.example` vers `.env.local`, puis renseigner :

- `MYSQL_URL` : URL de connexion MySQL. `DATABASE_URL` est également acceptée.
- `PORT` : port HTTP du service, `8080` par défaut.
- `ADMIN_USERNAME` : identifiant de connexion, `admin` par défaut.
- `ADMIN_PASSWORD` : mot de passe administrateur unique d'au moins 12 caractères.
- `ADMIN_SESSION_SECRET` : secret aléatoire d'au moins 32 caractères, distinct du mot de passe.

Le dashboard est accessible sur [http://localhost:8080/admin](http://localhost:8080/admin). Le schéma est créé automatiquement lors de la première connexion à MySQL; une copie déclarative est disponible dans `db/schema.sql`.

`npm run db:seed` récupère une fois les joueurs, le staff, les actualités et les médias de l'ancien site officiel, puis les enregistre dans MySQL. La commande remplace ces quatre collections. Elle initialise les textes du site seulement s'ils n'existent pas encore, afin de ne jamais écraser les modifications éditoriales.

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
- Démarrage : `npm run start`

### Ajouter MySQL et activer le dashboard

1. Dans le même projet Railway, choisir **Add > Database > MySQL**.
2. Ouvrir le service Next.js puis **Variables**.
3. Ajouter une référence vers l'URL MySQL sous le nom `MYSQL_URL`. Railway expose généralement `${{MySQL.MYSQL_URL}}` lorsque le service s'appelle `MySQL`.
4. Ajouter `PORT=8080`.
5. Ajouter `ADMIN_USERNAME`, `ADMIN_PASSWORD` et `ADMIN_SESSION_SECRET` comme variables privées.
6. Redéployer le service puis ouvrir `/admin`.

Après le premier déploiement, exécuter `npm run db:seed` avec `MYSQL_URL` configurée, ou utiliser **Importer l’ancien site** dans le dashboard. Les contenus éditoriaux restent ensuite modifiables exclusivement dans l'administration.

## Sources

- Calendrier et résultats : APIs publiques TheSportsDB et Sofascore
- Classement : Sofascore, avec le tableau public du site officiel comme seconde source sportive
- Données sportives complémentaires : Sofascore lorsqu'il est disponible
- Joueurs, staff, actualités, médias et textes : MySQL
- Import initial éditorial : ancien site WordPress officiel de l'Union Touarga Sport, uniquement sur action explicite

Seules les données sportives sont remises à jour automatiquement par Next.js. Les contenus éditoriaux changent uniquement après une action dans le dashboard ou un nouveau seed explicite.
