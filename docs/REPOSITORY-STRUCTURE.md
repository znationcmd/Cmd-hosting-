# CMD Hosting — Organisation des fichiers

Ce répertoire peut contenir plusieurs composants liés à des serveurs de jeux. Les chemins de production ont été **conservés**.

| Répertoire | Fonction |
|---|---|
| `web/` | Site et ressources publiques |
| `local-panel/` | Panneau et mise à jour locale des fichiers |
| `services/` | Services et API |
| `provisioning/` | Configuration de déploiement des services de jeux |
| `dayz-worlds/` | Configurations et manifestes DayZ |
| `asa-astraeos/`, `ark-valhalla/` | Configurations de serveurs ARK |
| `scripts/` | Scripts de contrôle et d'automatisation |
| `tests/` | Tests et vérifications |
| `diagnostics/` | Outils et captures de diagnostic historiques |
| `docs/` | Guides de maintenance |
| `.github/workflows/` | Contrôles automatisés |

## Règles

1. Ne pas déplacer `web/public/`, `local-panel/` ou les fichiers `*.cmd` de lancement sans modifier et tester leurs références.
2. Ne pas supprimer les diagnostics ou versions historiques avant de vérifier qu'aucune restauration n'en dépend.
3. Conserver les configurations des serveurs et les données utilisateur indépendamment des fichiers applicatifs.
4. Conserver les fichiers `.env.example` comme exemples, et exclure les fichiers `.env` privés.
5. Vérifier le bon fonctionnement des déploiements Railway et des lanceurs locaux après toute réorganisation.

Ce document fournit une carte des répertoires. Il n'autorise aucune suppression automatique.
