# CMD Hosting — Mods multi-jeux (19 octobre 2026)

## Ce qui est réellement disponible en production

- Site propriétaire : https://cmd-hosting-web-production.up.railway.app/
- Dans le Dashboard, rubrique **Gestionnaire de mods**, bouton **Mods autres jeux · FS25, Minecraft, Conan, Factorio…**.
- Catalogue multi-jeux : https://cmd-hosting-mods-api-production.up.railway.app/mods/autres-jeux
- API : `GET /api/mods/games`, `GET /api/mods/games/catalogue`, `GET /api/mods/games/profile?game=...`, `GET /api/mods/games/search?game=...&q=...`.
- **173 jeux** du catalogue de CMD Hosting inspectables par nom. **54 fiches de jeux** disposent d'une source de mods PC reconnue (API ou procédure guidée). **11 entrées DayZ/Arma/ARK** conservent leurs intégrations déjà présentes. Le reste est en revue de compatibilité : aucune API ni installation inventée.
- L'écran est une consultation **en lecture seule** : `autoInstall:false`; aucun serveur, joueur, abonnement, achat, base de données ou mod existant n'est modifié par l'API.

## Fournisseur réellement utilisé suivant le jeu

| Jeu/famille | Recherche ou lien proposé | Limite réelle |
| --- | --- | --- |
| Farming Simulator 25 / 22 / 19 | GIANTS ModHub officiel ; accès au gestionnaire natif du serveur dédié | Pas d'API publique ModHub générale confirmée. Les fichiers ZIP doivent correspondre à la version et à la licence. |
| Minecraft Java | API publique Modrinth : filtres serveurs | Vérifier version, chargeur Fabric/Forge/NeoForge, licence, dépendances. |
| Factorio | API publique du Mod Portal, navigation par page | Le filtre local ne cherche que dans la page renvoyée ; téléchargements nécessitant une autorisation officielle. |
| Conan, Project Zomboid, Garry's Mod, Unturned, Space Engineers, Starbound, etc. | Steam Workshop via la clé Steam Web API déjà associée au backend | IDs de jeux explicitement autorisés et recherche par nom. L'importation Steam n'est pas encore automatisée. |
| Valheim, V Rising, Risk of Rain 2 | Liens guidés Thunderstore | Vérifier versions et mod loader sur les clients et le serveur. |
| 7 Days to Die, Rust, Satisfactory, Terraria, FiveM, RedM, ETS2 et autres | Guides et lien éditeur, importation manuelle contrôlée | API universelle non supposée ; rien n'est installé automatiquement. |
| DayZ, Arma Reforger / Arma, ARK | **Intégrations existantes, volontairement exclues** | Aucune altération de leurs workflows. |
| Jeux non vérifiés, plateformes PS/Xbox/cross-play sans support prouvé | État « à vérifier » | Pas de bouton d'installation dangereux. |

## Import ZIP local : uniquement sur le PC Windows hôte, sans données d'authentification

Un outil indépendant, `scripts/CMDHosting-Import-ModZIP.ps1`, est fourni pour **FS19, FS22, FS25 et Factorio**. C'est un import de ZIP déjà obtenu légalement, pas une API de téléchargement, ni un agent lié au Dashboard.

Prévisualisation sans modifier le serveur :

```powershell
./scripts/CMDHosting-Import-ModZIP.ps1 -Game FS25 -ModsDirectory "D:\FS25\mods" -ModZip "D:\Téléchargements\FS25_Mod.zip"
```

Si le serveur dédié est réellement arrêté et que l'utilisateur a vérifié les droits d'utilisation :

```powershell
./scripts/CMDHosting-Import-ModZIP.ps1 -Game FS25 -ModsDirectory "D:\FS25\mods" -ModZip "D:\Téléchargements\FS25_Mod.zip" -Apply -PublisherApproved -ServerStopped
```

Le script vérifie les entrées du ZIP, évite les chemins de sortie dangereux, exige `modDesc.xml` pour FS ou `info.json` dans l'arborescence Factorio, vérifie le SHA-256, met en attente dans un fichier temporaire et sauvegarde l'archive précédente dans `CMDHostingModBackups`. La responsabilité du choix correct du dossier, de l'arrêt complet du bon serveur et de la licence reste à l'opérateur. Ne pas l'exécuter sur un serveur actif.

## Vérifications effectuées

- Tests unitaires Bun de la nouvelle API et des anciennes routes DayZ/CurseForge : **10 tests OK**.
- Contrôle réseau de la production : catalogue **173**, ModHub FS25 (méthode native), DayZ préservé et nouvel écran accessible (HTTP 200).
- Recherche live : **Factorio 200**, **Modrinth Minecraft Java 200**, **Steam Conan Exiles 200** pour la requête testée (aucun mod correspondant sur cette requête précise).
- Chrome headless sur le **vrai CMD Hosting** : bouton multi-jeux trouvé dans `#cmdMods`, effets 3D fonctionnels, aucune erreur JavaScript relevée.
- Test PowerShell Windows : aperçu non destructif, refus sans autorisation, import validé et sauvegarde d'une version précédente — **SUCCESS**.

## Pour aller jusqu'au clic « Installer » depuis CMD Hosting

Étapes restant à développer et à tester sur chaque machine : authentification de l'agent relié au serveur, vérification des droits de téléchargement, sauvegarde du monde et des mods, mise à l'arrêt effective, stratégie de redémarrage sans joueurs, validation des versions/dépendances et rapport d'erreur/retour arrière. Ne pas assimiler la présence du catalogue à un mod installé. Les API Discord/DayZ/Arma/ARK déjà en place restent isolées.

Railway : `cmd-hosting-mods-api` est déployé indépendamment de `cmd-hosting-web`. Le projet comporte aussi des **modifications préexistantes en attente** pour d'autres services : elles ne doivent pas être approuvées globalement sans examen.
