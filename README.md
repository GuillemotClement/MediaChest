# MediaChest

Bibliothèque multimédia avec un frontend React/Vite et une API Express en JavaScript.

## Démarrage avec Docker Compose

Prérequis : Docker avec Docker Compose.

```sh
docker compose up --build -d
```

Ouvrir http://localhost:5173. Adminer est disponible sur http://localhost:8080.
Compose construit le front React et l’API. PostgreSQL doit être prêt avant que
l’API applique les migrations versionnées ; le front démarre lorsque l’API est saine.
Nginx sert les fichiers du front, gère les routes React et relaie `/api` vers l’API.
Les migrations sont vérifiées à chaque démarrage et ne sont appliquées qu’une fois.
Une migration en échec empêche le démarrage de l’API.

Les données PostgreSQL et le secret d’authentification généré automatiquement sont
conservés dans des volumes. `docker compose down` les conserve ;
`docker compose down -v` les supprime, y compris les comptes et sessions.
Un secret explicite peut être fourni avec `BETTER_AUTH_SECRET` (32 caractères minimum).

Pour changer l’adresse publique, définir dans le `.env` racine, par exemple :

```dotenv
FRONTEND_PORT=8090
APP_URL=http://localhost:8090
```

Pour un accès distant, utiliser l’adresse publique dans `APP_URL`.
Les variables `POSTGRES_USER`, `POSTGRES_PASSWORD` et `POSTGRES_DB` configurent
PostgreSQL et la connexion de l’API. Les caractères réservés d’URL dans les
identifiants doivent être encodés dans l’URL de connexion.

```sh
docker compose logs -f api
docker compose ps
```

## Développement local

Prérequis : Node.js 24 et pnpm (via Corepack).
Lancer uniquement les services de données puis les serveurs de développement :

```sh
docker compose up -d db adminer
cd api
cp .env.example .env
# Remplacer BETTER_AUTH_SECRET par un secret aléatoire d’au moins 32 caractères.
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

Le front écoute sur http://localhost:5173 et l’API locale sur http://localhost:3000.

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

## Recherche de films et séries (TMDB)

La page `/recherche`, réservée aux utilisateurs connectés, recherche automatiquement
un titre en français après 300 ms sans saisie. Le type est optionnel : Tous
(films et séries), Film ou Série. La liste affiche jusqu’à 10 résultats dans
l’ordre de pertinence TMDB, sans les personnes, et permet
d’ajouter un média à la liste personnelle, conservée dans PostgreSQL. Un même
média ne peut être ajouté qu’une fois par utilisateur et par type. L’accueil affiche la liste personnelle dans un tableau (nom, année, affiche et
type), avec une recherche instantanée par titre, sans distinction de casse ni
d’accents. La consultation de la liste ne nécessite pas d’appel à TMDB.

Créer un compte sur https://www.themoviedb.org puis demander un accès API dans
les paramètres : https://www.themoviedb.org/settings/api. Copier le **API Read
Access Token** dans le `.env` racine pour Docker :

```dotenv
TMDB_READ_ACCESS_TOKEN=votre_jeton
```

Puis relancer `docker compose up -d api`. En développement sans Docker, mettre
cette variable dans `api/.env`. Le jeton n’est jamais envoyé au navigateur.
Sans jeton, la page affiche une indisponibilité explicite ; aucun résultat de
démonstration n’est présenté comme une vraie recherche. Les données et images
proviennent de TMDB ; l’usage non commercial est gratuit avec attribution,
l’usage commercial nécessite une licence adaptée.


## Fiche d’un média

Depuis l’accueil, cliquer sur un média (ou son nom ou son affiche) ouvre
`/medias/:id`. L’API vérifie que l’entrée appartient à l’utilisateur connecté
avant de récupérer les détails TMDB en français. La fiche présente affiche,
résumé, date, genres, durée, réalisation ou créateurs, note et distribution
(jusqu’à dix acteurs). Pour les séries : saisons, épisodes, dernière diffusion
et distribution sur l’ensemble des saisons. Les informations manquantes sont
signalées ; un échec de TMDB permet de réessayer. Le jeton TMDB est requis.

## Statuts et épisodes vus

Chaque ajout (y compris les entrées existantes après migration) démarre « À voir ».
Le tableau et la fiche permettent de marquer un film ou toute une série « Vu » et
de revenir à « À voir ». Sur la fiche d’une série, sélectionner une saison puis
cocher/décocher les épisodes vus. Le compteur du tableau indique par exemple
`10/24 épisodes vus`. Les saisons spéciales (saison 0) sont exclues du suivi.
Le statut d’une série devient automatiquement « Vu » quand tous ses épisodes
sont cochés ; décocher un épisode la remet « À voir ». « Tout remettre à voir »
efface le suivi des épisodes ; « Tout marquer vu » coche toutes les saisons.
Le total est récupéré à l’ajout, actualisé à l’ouverture de la fiche et initialisé
pour les anciennes séries lors de la consultation de la liste. Si TMDB est
indisponible et le total encore inconnu, le tableau affiche `—` pour le total.
Les progressions sont privées et supprimées avec l’entrée de la liste.

## Compte administrateur et rôles

Au démarrage de l’API, après les migrations, le compte initial est créé :

- Identifiant : `gizmo`
- Email : `guillemot.clement35@gmail.com`
- Mot de passe initial : `password`
- Rôle : `admin`

Si le compte local `gizmo` existait avec une adresse interne `@users.invalid`,
il est converti une seule fois : sa liste et sa progression sont conservées,
l’email et le mot de passe initial ci-dessus sont appliqués, ses anciennes
sessions sont révoquées. Une fois administrateur, son mot de passe n’est plus
réinitialisé aux démarrages suivants. Un conflit avec un autre compte empêche
l’initialisation et est signalé dans les logs.

Toutes les inscriptions publiques reçoivent le rôle `user` ; ce rôle ne peut pas
être choisi par le client. Les comptes existants reçoivent également `user`
par migration, hormis `gizmo` lors de son initialisation. Les utilisateurs
conservent l’accès à la recherche, leur liste, les fiches et le suivi personnel.
Le rôle est retourné avec la session ; aucune interface de gestion
administrative n’est ajoutée à cette étape.

## Liste globale administrateur

`/administration/medias` regroupe les médias présents dans toutes les listes,
y compris celle de l’administrateur, une seule fois par paire (type, ID TMDB).
Le tableau indique les utilisateurs concernés et permet de modifier la
disponibilité globale : **À télécharger** (par défaut), **Téléchargé**, **Dispo**.
Ces statuts sont indépendants des statuts personnels À voir/Vu. La navigation
n’affiche l’administration que pour le rôle `admin` ; chaque lecture et mutation
est aussi protégée côté serveur avec vérification du rôle actuel en base.
La migration initialise les médias existants ; un déclencheur SQL initialise
les futurs ajouts, sans écraser un statut existant. Un média retiré de toutes
les listes disparaît du tableau ; sa disponibilité reste mémorisée s’il est
ajouté de nouveau. Aucun téléchargement automatique n’est déclenché.

La liste personnelle affiche une colonne **Disponibilité**, calculée à partir
du statut global administrateur : **Dispo** uniquement pour le statut Dispo ;
**Indisponible** pour À télécharger, Téléchargé ou un statut global absent.
La valeur est commune à tous les utilisateurs ayant ajouté le même média et
est relue au chargement de leur liste. Le statut personnel À voir/Vu reste séparé.
