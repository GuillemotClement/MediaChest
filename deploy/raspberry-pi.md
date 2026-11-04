# Production sur Raspberry Pi — réseau local

Cette configuration est indépendante du Compose de développement. Elle crée
une base neuve et des volumes propres au projet `mediachest-prod`. Elle ne
transfère pas la bibliothèque de votre machine de développement.

## Préparer le Raspberry

- Raspberry Pi avec système **64 bits** : `uname -m` doit afficher `aarch64`.
  Les images sont construites nativement en ARM64 sur le Raspberry.
- Docker Engine et le plugin Docker Compose installés ; `docker compose version`
  doit fonctionner. Pour Raspberry Pi OS 64 bits, suivre les instructions Debian
  ARM64 : https://docs.docker.com/engine/install/debian/.
- Utilisateur autorisé à lancer Docker ; les commandes ci-dessous supposent
  cet accès déjà configuré. Docker doit être activé au démarrage du système.
- Réserver une adresse IP au Pi dans le DHCP du routeur. Un SSD est préférable
  pour les données PostgreSQL et pour limiter l’usure de la carte SD.
- Le port proposé est **8081**, afin de laisser notamment Jellyfin sur 8096.
  Aucun port du routeur n’est à rediriger pour cet accès local.

Le modèle et la mémoire du Pi ne sont pas encore connus. Un système 32 bits
n’est pas pris en charge par cette configuration. La première compilation peut
prendre plusieurs minutes ; prévoir de l’espace pour les images et PostgreSQL.

## Transférer les sources

Copier le projet sur le Pi sans les secrets ni les dépendances locales. Depuis
le dossier MediaChest de votre ordinateur, par exemple :

```sh
rsync -av --exclude=.git --exclude=node_modules --exclude=dist \
  --exclude=.env --exclude='.env.*' --exclude=backups \
  ./ gizmo@IP_DU_RASPBERRY:~/MediaChest/
```

Un clone Git est également possible si les changements de production ont été
commités et poussés. Les fichiers `.env` locaux ne doivent pas être transférés.
Les anciens secrets suivis par Git restent dans l’historique : s’ils ont été
partagés, renouveler les valeurs concernées.

## Initialiser et démarrer

Sur le Raspberry :

```sh
cd ~/MediaChest
sh scripts/prod-init.sh http://IP_DU_RASPBERRY:8081
nano .env.prod
```

Le script génère des mots de passe et un secret d’authentification aléatoires,
avec un fichier lisible uniquement par son propriétaire. Il refuse d’écraser
un `.env.prod` existant. Ajouter **TMDB_READ_ACCESS_TOKEN** dans ce fichier.
Les secrets ne sont jamais intégrés aux images Docker.

`APP_URL` doit correspondre exactement à l’URL utilisée dans le navigateur,
sans slash final. Ex. `http://192.168.1.50:8081`. Changer `APP_PORT` également
si un autre port est choisi. `BIND_ADDRESS` peut être l’IP locale du Pi pour
restreindre l’écoute à cette interface ; `0.0.0.0` écoute toutes ses interfaces.
Les valeurs PostgreSQL générées sont hexadécimales afin d’être utilisables dans
l’URL de connexion sans encodage supplémentaire.

```sh
sh scripts/prod-compose.sh config --quiet
sh scripts/prod-compose.sh up --build -d --wait
sh scripts/prod-compose.sh ps
sh scripts/prod-compose.sh logs --tail 50 api
```

Ouvrir `APP_URL` sur un appareil du même réseau local. Un seul port est publié :
celui du front. L’API et PostgreSQL restent dans le réseau Docker, et Adminer
n’est pas lancé. Les migrations s’appliquent avant le démarrage de l’API.

Connexion initiale : identifiant **gizmo**, email
**guillemot.clement35@gmail.com**, mot de passe **ADMIN_INITIAL_PASSWORD**
consigné dans `.env.prod`. Le mot de passe `password` reste uniquement la valeur
par défaut en développement. La production exige un mot de passe initial d’au
moins 12 caractères pour un compte à créer ; les démarrages suivants ne le
réinitialisent pas. Une base neuve contient ce compte sans médias associés.

Le service redémarre automatiquement après le redémarrage de Docker. Les logs
sont limités à trois fichiers de 10 Mo par service. Les contrôles de santé
vérifient le front, l’API et la connexion PostgreSQL.

L’accès local utilise HTTP : les cookies de session fonctionnent avec cette
configuration. Ne pas publier ce port sur Internet. Si une exposition Internet
est souhaitée ensuite, ajouter HTTPS et revoir la configuration du proxy.

## Sauvegarder

```sh
sh scripts/prod-backup.sh
```

Le script crée un fichier PostgreSQL au format custom dans `backups/`, après
vérification de l’archive. Il comprend les comptes, listes, épisodes vus,
rôles et disponibilités. Copier les sauvegardes **hors du Raspberry** et
conserver aussi `.env.prod` à l’abri ; la sauvegarde SQL ne contient pas les
secrets de configuration. Aucun planificateur n’est installé automatiquement.

Le volume Docker est persistant, mais ne remplace pas une sauvegarde. Ne pas
utiliser `down -v` sur le projet de production.

## Mettre à jour

Sauvegarder avant de remplacer les sources ou d’appliquer de nouvelles migrations :

```sh
sh scripts/prod-backup.sh
# Mettre à jour les sources (git pull ou transfert depuis l’ordinateur).
sh scripts/prod-compose.sh up --build -d --wait
sh scripts/prod-compose.sh ps
```

Les migrations sont versionnées et ne sont pas rejouées si déjà appliquées.
En cas d’échec, consulter les logs ; ne pas effacer le volume pour le contourner.
Une restauration de base peut être nécessaire pour revenir à une version dont
le schéma est incompatible : garder aussi la version des sources correspondante.
Ne pas régénérer les secrets à chaque mise à jour. Changer POSTGRES_PASSWORD
dans `.env.prod` seul ne modifie pas le mot de passe d’une base déjà initialisée.

## Restaurer

Cette commande **remplace la base** de ce projet. Faire une sauvegarde préalable,
conserver les sources compatibles avec l’archive et le même `.env.prod` :

```sh
sh scripts/prod-restore.sh --replace backups/mediachest-DATE.dump
```

L’archive est vérifiée, le front et l’API arrêtés, puis la base recréée et
restaurée avant de relancer l’application et ses migrations. Si la restauration
échoue, l’application reste arrêtée pour ne pas servir une base partielle.
Une base restaurée conserve les médias et les comptes de la sauvegarde.

## Diagnostic rapide

```sh
sh scripts/prod-compose.sh ps
sh scripts/prod-compose.sh logs --tail 100 api front db
curl --fail http://IP_DU_RASPBERRY:8081/api/health
```

- URL ou port modifié : adapter `APP_URL` et `APP_PORT`, puis relancer Compose.
- Connexion impossible : utiliser exactement le nom d’hôte/IP indiqué dans APP_URL.
- Recherche indisponible : vérifier le jeton TMDB et l’accès Internet sortant du Pi.
- Après un remplacement de l’API, Nginx actualise son adresse Docker sous dix
  secondes ; les migrations doivent avoir terminé et l’API être saine.
- Pas d’images pour l’architecture ou échec natif de compilation : vérifier
  `uname -m` et utiliser Raspberry Pi OS 64 bits.

Les scripts acceptent `PROD_ENV_FILE` pour un fichier de configuration distinct
et `COMPOSE_PROJECT_NAME` pour un projet isolé (par exemple pour une restauration
de test). Ces valeurs doivent rester identiques pour toutes les commandes du
même déploiement, y compris sauvegarde et restauration.
