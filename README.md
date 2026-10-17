# CMD Hosting

**CMD Hosting** est un projet de plateforme française de gestion et d’hébergement de serveurs de jeux.

Site web : https://cmd-hosting-web-production.up.railway.app

## Objectif

Proposer un panneau de gestion des serveurs de jeux et des outils de découverte et d’administration de mods, notamment pour **ARK: Survival Ascended**, **DayZ** et les jeux pris en charge par les fournisseurs.

Le projet vise à faciliter la consultation des mods et de leurs versions, les informations de compatibilité, ainsi que les opérations autorisées par les éditeurs et les auteurs des mods.

## Code disponible dans ce dépôt

- `services/mods-api/index.ts` — copie du code source de la fonction Railway **cmd-hosting-mods-api** (passerelle Steam Workshop / CurseForge et outils de préproduction), exportée le 11 octobre 2026.
- `.env.example` — noms des paramètres de configuration attendus, **sans identifiants ni secrets**.

**Limite importante :** ce dépôt ne contient **pas encore le code source complet du panneau web CMD Hosting**. Son code n’était pas récupérable au format texte exploitable lors de l’export de la fonction Railway. Il ne faut pas considérer ce dépôt comme une sauvegarde intégrale de la plateforme.

Les services Railway actuels restent indépendants de ce dépôt ; créer ce dépôt n'entraîne aucun déploiement.

## API CurseForge

L’intégration CurseForge est prévue afin de rechercher et présenter les mods éligibles et leurs métadonnées. Son utilisation nécessite une **clé API officielle**, des autorisations et le respect des règles de CurseForge et des créateurs, notamment pour toute distribution ou installation de fichiers.

Cette présence de code ne signifie **pas** que l’accès à l’API a déjà été approuvé.

## Configuration

Les clés et identifiants sont fournis uniquement dans les variables d’environnement de l’hébergeur (jamais dans GitHub). Voir `.env.example`.

## English — Project overview

CMD Hosting is a French game-server management platform project. This repository currently contains the source of its separate mods gateway for Steam Workshop and CurseForge-related integration, plus non-secret configuration documentation. The main hosting web panel is **not** included here yet. CurseForge integration depends on approved API access and compliance with content creators' permissions and the CurseForge terms of use.

## Préparation des futures machines (11 octobre 2026)

- `services/provisioning/game-installers.ts` : registre de préparation. `buildProvisioningRegistry(catalogue)` produit un profil pour **chaque jeu du catalogue courant**, sans inventer de serveur dédié pour les jeux non vérifiés. Les versions PC, console et les systèmes d'exploitation sont distingués.
- `scripts/Install-CMDGameServer.ps1` : préparateur Windows. **Simulation par défaut** ; téléchargement officiel SteamCMD pour huit serveurs connus seulement lorsque l'administrateur de la future machine fournit explicitement `-Install -AcceptPublisherTerms`, un identifiant de serveur, un répertoire isolé et le chemin de SteamCMD.
- `tests/provisioning.test.mjs` : tests des identifiants Steam, des restrictions de plateformes, des jeux inconnus et des protections de fichiers.

**État réel :** profils et script enregistrés sur GitHub, **aucune installation lancée sur le PC actuel**, pas de liaison automatique entre commande client et machine de location. Le site et l'API Railway de production demeurent distincts de ce dépôt : ces fichiers ne sont pas encore déployés dans le flux de location. La future connexion devra authentifier le loueur, vérifier les droits du serveur, l'éditeur, l'espace disque et les licences, puis appeler l'agent Windows sous un compte dédié.

Les cartes moddées nécessitent une source vérifiée et des dépendances compatibles. Pour Arma Reforger, `game.scenarioId` et `game.mods` sont gérés par le serveur/Workshop Bohemia ; pour Arma 3, ce sont les missions `.pbo` et les dossiers `@mod` autorisés. Les serveurs consoles peuvent imposer un prestataire spécifique et ne sont pas installés avec SteamCMD PC.

Tests à exécuter sur un ordinateur Node.js compatible : `node --experimental-strip-types --test tests/provisioning.test.mjs`.


## Reprise Agent Mods V4 — 11 octobre 2026

L'agent Windows enrichi est enregistré dans GitHub, indépendamment du runtime Railway.

- scripts/cmd-hosting-mods-agent-v4.ps1 : conserve les parcours DayZ PC et ARK ASA ; prépare les GUIDs Bohemia Workshop d'Arma Reforger dans le fichier config.json sauvegardé et ajoute le téléchargement SteamCMD pour Arma 3 (Workshop app 107410, @CMD_ID et .bikey).
- scripts/Update-CMDModsAgentV4.ps1 : mise à jour non destructive de l'agent déjà appairé ; sauvegarde le script précédent et préserve settings.json, son jeton chiffré et servers.json.
- scripts/Installer-Agent-Mods-V4.cmd : lanceur Windows de l'outil de mise à jour.

Les fichiers doivent être exécutés sur le PC Windows déjà appairé, pas sur Railway. L'outil ne stocke pas le mot de passe Steam.

### Limites connues

- Pas de connexion récente de l'agent principal PC confirmée lors de cette reprise. Aucune installation sur le PC n'a été réalisée ici.
- La V4 reste sur GitHub. Le script embarqué dans la fonction principale Railway dépassait les limites de démarrage ; la version précédente a été restaurée, et le déploiement Railway est revenu au statut SUCCESS.
- Arma Reforger : les GUIDs présents dans game.mods seront téléchargés par le serveur au prochain démarrage. Pour le scénario, un scénarioId exact et approuvé doit être renseigné dans l'entrée du serveur ; confirmer les téléchargements dans les logs.
- Arma 3 : SteamCMD peut exiger un compte Steam et les droits d'utilisation. Les missions .pbo exigent une source officielle ou autorisée et ne sont pas installées par cette V4.
- Les fiches de tous les jeux du catalogue sont préparées, pas automatiquement installées. Les consoles ne peuvent pas être gérées par un SteamCMD Windows universel.
- L'installation automatique déclenchée par une location requiert encore un backend de commandes authentifiées par loueur et serveur, une file de provisionnement et un hôte en ligne ; ne pas afficher un succès fictif.

### Validation restante

Tests statiques réussis (parcours présents, structure équilibrée). Un test PowerShell Windows est indispensable : effectuer le diagnostic sur le PC et vérifier ensuite une synchronisation des mods et un démarrage réel du serveur.


## Migration GitHub et thème Premium (16 octobre 2026)

Le **panneau principal** CMD Hosting fonctionne encore depuis une fonction Railway et sa source originale n'est pas récupérable par le connecteur actuel. La migration complète vers GitHub **n'est pas terminée** ; aucun déploiement du web à partir du dépôt n'a été effectué.

- [État et étapes de migration](docs/MIGRATION_RAILWAY_GITHUB_20261016.md)
- [Feuille de style Premium vectorielle 16K-ready](ui/premium-16k.css)
- [Chargeur d'icônes SVG et de thème](ui/premium-16k.js)
- [Tests de non-régression du thème](tests/premium-ui.test.mjs)

Les sources des services Mods API et Cloud Agents présentes dans ce dépôt correspondent au code actuellement déployé sur Railway au 16 octobre 2026. Les variantes **staged** sur Railway ne sont pas encore appliquées. Le dépôt est actuellement **public** ; ne jamais y enregistrer des secrets.

### Snapshot frontal en lecture seule — 17 octobre 2026

Une sauvegarde des pages et scripts **publics** est préparée par [le workflow GitHub Actions](.github/workflows/cmd-hosting-public-recovery.yml) et [le script de capture](scripts/recover-hosting-public.mjs). Elle ne remplace pas la fonction serveur Railway : l'original de `cmd-hosting-web` reste à récupérer via l'éditeur Function/Code. Ne pas relier encore la production à ce dépôt.

### Frontend public restauré dans GitHub — 17 octobre 2026

Le dossier [`web/public/`](web/public/) contient maintenant une copie de la page principale et de ses ressources publiques, automatiquement récupérées depuis Railway et contrôlées avant import. La copie est stylisée avec [le thème Premium CMD 16K](web/public/ui/premium-16k.css) et [ses icônes SVG](web/public/ui/premium-16k.js). La copie originale sans cette couche graphique reste dans [la branche de sauvegarde](https://github.com/znationcmd/Cmd-hosting-/tree/recovery/cmd-hosting-public-ui-20261017).

Les **13 fichiers JS** de l'interface copiés ont été vérifiés syntaxiquement, et les références locales de la page sont présentes. Les tests de régression sont dans [`tests/restored-web.test.mjs`](tests/restored-web.test.mjs). Cette restauration constitue **le frontend public uniquement**. La fonction Bun backend, les données clients, la base PostgreSQL et les variables d'environnement ne sont pas migrées ; n'utilisez pas le dossier statique comme remplacement direct du service Railway en production. La source backend doit être récupérée de manière fiable avant le basculement.
