# MediaChest

Bibliothèque multimédia avec un frontend React/Vite et une API Express en JavaScript.

## Démarrage local

Prérequis : Node.js 24, pnpm (via Corepack) et Docker Compose.

```sh
# À la racine : PostgreSQL et Adminer
docker compose up -d

# API
cd api
cp .env.example .env
# Remplacer BETTER_AUTH_SECRET par une valeur aléatoire :
# node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
corepack pnpm install
corepack pnpm db:migrate
corepack pnpm dev
```

Dans un deuxième terminal :

```sh
cd front
corepack pnpm install
corepack pnpm dev
```

Ouvrir http://localhost:5173. L’API écoute sur http://localhost:3000 et Adminer sur http://localhost:8080.
Le fichier `api/.env` local est déjà configuré avec un secret généré ; il est ignoré par Git.

## Authentification

- Inscription : identifiant unique (3 à 30 lettres, chiffres, points ou underscores) et mot de passe (8 à 128 caractères).
- Connexion par identifiant, sans distinction de majuscules. L’inscription ouvre immédiatement une session.
- `/connexion` et `/inscription` sont publiques. Toutes les autres pages nécessitent une session.
- La déconnexion révoque la session côté serveur. Les mots de passe sont hachés par Better Auth ; les sessions utilisent ses cookies HttpOnly.
- Better Auth exige une adresse email interne : l’API génère une adresse aléatoire `@users.invalid`. Aucun email n’est demandé ni envoyé. La récupération par email n’est pas activée.
- Le frontend conserve uniquement le client Better Auth. Drizzle, PostgreSQL et la configuration serveur Better Auth sont dans `api/`.

Vite relaie `/api` vers Express ; utiliser le même nom d’hôte (`localhost`) pour le front et l’API.
Pour déployer, servir le front et relayer `/api` vers Express sous la même origine HTTPS, puis adapter `BETTER_AUTH_URL`, `FRONTEND_URL` et `DATABASE_URL`.
La limitation des tentatives est en mémoire et utilise l’adresse du socket. Derrière un proxy, elle regroupe les clients par proxy ; adapter les proxys de confiance et le stockage partagé pour un déploiement multi-instance.

## Base de données

`api/.env` utilise le PostgreSQL de `compose.yml` : `postgres://pg:pg@localhost:5432/mediachest`.
Adapter cette URL si les variables `POSTGRES_USER`, `POSTGRES_PASSWORD` ou `POSTGRES_DB` du Compose changent.
Les migrations versionnées se trouvent dans `api/drizzle/`.

```sh
cd api
corepack pnpm db:generate # Après modification du schéma
corepack pnpm db:migrate
corepack pnpm test
```

La migration initiale accepte aussi les anciennes tables créées depuis le frontend et les conserve.
Si des comptes antérieurs existent sans identifiant, un identifiant unique `legacy_…` leur est attribué.
Les tests HTTP créent puis suppriment une base temporaire ; le rôle PostgreSQL de test doit avoir le droit `CREATEDB` (c’est le cas du rôle du Compose).

Endpoints :

- `GET /api/health` : état du serveur (public).
- `/api/auth/*` : endpoints Better Auth, notamment inscription, connexion par identifiant, session et déconnexion.
- `GET /api/me` : session courante ; réponse `401` sans authentification.
- Ajouter les futurs endpoints privés après le middleware de session dans `api/src/app.js`.

## Jellyfin

La configuration indépendante est dans `jellyfin/compose.yml`.

Transfert depuis Windows :

```sh
scp -r "C:\Users\gizmo\Videos\Mon Film (2024)" gizmo@IP_DU_RASPBERRY:/home/gizmo/docker/jellyfin/media/films/
```

Tests navigateur (Chromium, base PostgreSQL temporaire séparée) :

```sh
cd front
corepack pnpm exec playwright install chromium
corepack pnpm test:e2e
```
