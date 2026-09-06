# Union Touarga Sport

Site moderne et responsive consacré à l'Union Touarga Sport. Il centralise les matchs, résultats, classement, effectif, actualités et médias du club à partir de sources publiques mises à jour automatiquement.

## Fonctionnalités

- Calendrier et résultats de l'équipe première
- Classement de la Botola Pro
- Effectif classé par poste
- Actualités et galerie de photos officielles
- Histoire et identité du club
- Interface responsive aux couleurs de l'UTS
- Revalidation automatique des données toutes les cinq minutes

## Développement local

Prérequis : Node.js 20 ou version ultérieure.

```bash
npm install
npm run dev
```

Le site est alors accessible sur [http://localhost:3000](http://localhost:3000).

## Vérifications

```bash
npm run lint
npm run build
```

Pour tester la version de production sur le port utilisé par Railway :

```powershell
$env:PORT=8080
npm run start
```

Le serveur écoute alors sur [http://localhost:8080](http://localhost:8080).

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

Aucune variable d'environnement n'est requise pour le déploiement actuel.

## Sources

Les données sportives proviennent de sources publiques, notamment Sofascore. Les actualités et photographies sont issues des publications officielles de l'Union Touarga Sport.
