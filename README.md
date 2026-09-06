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

## Déploiement sur Railway

1. Créer un nouveau projet dans Railway.
2. Choisir **Deploy from GitHub repo**.
3. Sélectionner ce dépôt.
4. Laisser Railway détecter automatiquement l'application Next.js.

Les commandes déjà définies dans `package.json` sont :

- Build : `npm run build`
- Démarrage : `npm run start`

Aucune variable d'environnement n'est requise pour le déploiement actuel.

## Sources

Les données sportives proviennent de sources publiques, notamment Sofascore. Les actualités et photographies sont issues des publications officielles de l'Union Touarga Sport.
