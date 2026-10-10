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
