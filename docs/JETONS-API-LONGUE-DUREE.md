# CMD Hosting — Jetons API longue durée

État du développement : API Cloud Agents v2.0.5, tests PostgreSQL réels du 11 octobre 2026 (émission avec contrôle des services à valider via le futur tableau de bord utilisateur).

## Fonctionnement

CMD Hosting prend en charge des jetons API longue durée (1, 3, 5 ou 10 ans) conçus pour les intégrations, applications ou scripts autorisés. Ce mécanisme est **distinct** des jetons d'association des agents V5 et Mods, ainsi que des éventuels jetons délivrés par un hébergeur externe.

- Clé aléatoire indépendante, 36 octets / 288 bits, préfixée par `cmd_llt_`.
- Un seul affichage du secret au moment de la création ou d'une rotation. Il n'est pas récupérable ensuite.
- Empreinte SHA-256 seulement en base de données ; ne pas copier les clés dans des logs, des tickets ou des captures d'écran.
- Limitation possible à un `accountId` et un `serviceId` (gameId).
- Autorisations limitées aux routes réellement compatibles :
  - `account:read` pour `GET /v1/tokens/account`.
  - `services:read` pour `GET /v1/tokens/services`.
  - `rentals:read` pour `GET /v1/tokens/rentals`.
- `GET /v1/tokens/me` permet de vérifier les métadonnées du jeton courant sans montrer le secret.
- 20 jetons actifs au maximum par compte, selon la politique actuelle.
- Rotation : la clé précédente est invalidée immédiatement et la date d'expiration reste inchangée.
- Révocation immédiate ; les jetons expirés ou révoqués ne peuvent plus lire les données.
- Les jetons ne permettent pas d'installer un jeu, exécuter des commandes, gérer les finances ou changer des serveurs : ces opérations requièrent un autre processus sécurisé.

## Endpoints administrateur (backend privé uniquement)

Le backend de CMD Hosting authentifié doit contrôler l'identité de l'utilisateur et vérifier sa propriété du compte avant d'appeler les endpoints suivants avec sa propre autorisation sécurisée. **Ne jamais exposer la clé principale CMD Hosting dans du JavaScript côté client ni la placer dans une URL.**

Base : `https://cmd-hosting-cloud-agents-production.up.railway.app`.

- `POST /v1/tokens/long-life` — créer : `{"accountId":"...","label":"Bot stats","years":5,"scopes":["rentals:read"],"serviceId":null}`. Le compte doit déjà exister dans les services du catalogue ; la réponse contient `accessToken` une seule fois.
- `GET /v1/tokens/long-life?accountId=...` — liste des jetons et dates (jamais les secrets).
- `POST /v1/tokens/long-life/rotate` — `{"accountId":"...","id":"<uuid>"}`. Réponse : nouveau secret une seule fois.
- `POST /v1/tokens/long-life/revoke` — `{"accountId":"...","id":"<uuid>"}`. Clé immédiatement inutilisable.

Les appels administrateur nécessitent `Authorization: Bearer <secret cloud maître>` sur serveur uniquement ; ce secret n'est pas interchangeable avec un token créé par l'utilisateur.

## Endpoints des jetons clients

Utiliser le jeton reçu comme en-tête `Authorization: Bearer cmd_llt_...`.

- `GET /v1/tokens/me`
- `GET /v1/tokens/account`
- `GET /v1/tokens/services`
- `GET /v1/tokens/rentals`

Chaque lecture reste limitée au compte déclaré et, si précisé, au service unique lié à la clé. Une permission absente renvoie HTTP 403, une clé invalide ou révoquée HTTP 401.

## Tests effectués

- Tests unitaires exécutés sur Windows, macOS et Linux dans GitHub Actions : génération unique, empreintes, limitations de durée, permissions autorisées, compte/service, révocation et absence de fuite de secret.
- Test contre une véritable base Railway/PostgreSQL avec compte **synthétique uniquement** : association d'une clé, lecture et séparation des données, liste sans secrets, rotation, rejet de l'ancienne clé, révocation et suppression de l'entrée de test. Aucun serveur de jeu ni client réel modifié.
- Les quatre services Railway sont restés opérationnels lors des tests.

## Ce qui reste distinct

L'API cloud est déployée et testée, mais **le tableau de bord utilisateur du site CMD Hosting n'est pas encore raccordé aux routes de création, liste, rotation et suppression**. Il doit appeler le backend authentifié avec contrôle strict de propriétaire. Il serait dangereux de mettre une clé cloud maître dans le navigateur pour simuler ce menu.

Un jeton de CMD Hosting n'est pas un jeton d'une plateforme d'hébergement tierce ; l'import des secrets tiers nécessite une liaison chiffrée distincte et les permissions officielles du fournisseur.
