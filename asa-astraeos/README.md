# CMD Hosting — CMD Valhalla Extinction Astraeos (Windows local)

**Jeu :** ARK: Survival Ascended (ASA), serveur officiel SteamCMD app **2430930**.  
**Carte :** `Astraeos_WP` (édition officielle/DLC).  
**Nom :** CMD Valhalla Extinction Astraeos.  
**Mode :** RP à réglages PvE, crossplay **demandé** PC/PS5/Xbox (`-ServerPlatform=ALL`) ; compatibilité finale des 24 mods à contrôler sur les clients.  
**Capacité configurée :** 100 slots (`-WinLiveMaxPlayers=100`). Les performances pour 100 joueurs ne sont **pas garanties**.  
**Exclusivité :** ce profil partage un verrou local avec CMD Lux, CMD Namalsk, CMD Deer Isle et CMD Takistan Plus. **Un seul serveur DayZ OU ARK** doit fonctionner à la fois. Aucun jeu n'est hébergé sur Railway.

## Démarrage simple

1. Sur un **PC Windows 64 bits** avec suffisamment d'espace disque, décompresser toute l'archive CMD Hosting, installer **Node.js 22 ou supérieur**, puis lancer `CMD-5-SERVEURS-UN-SEUL.cmd`.
2. Choisir **5** puis **1** pour préparer les deux fichiers de configuration dans `C:\CMD-Servers\CMD-Valhalla-Extinction-Astraeos\`. Cette action n'installe **pas** un faux jeu.
3. Choisir **3** pour télécharger SteamCMD **depuis Valve** si nécessaire et le serveur officiel **ARK: Survival Ascended Dedicated Server** (2430930). Les conditions officielles s'appliquent. Aucune dépense ni abonnement n'est initié par l'outil.
4. Choisir **4** pour lancer le vrai serveur. Un mot de passe administrateur est demandé localement via PowerShell ; **aucun mot de passe GitHub/Railway**. Le mod **Moro's Livyatan** est Premium : posséder les droits nécessaires et le confirmer localement. Aucune licence n'est contournée.
5. Le serveur ARK charge les 24 IDs CurseForge via `-mods=...` et utilise `Astraeos_WP?listen`. Le téléchargement des mods est **assuré par le serveur ASA au lancement**, sous réserve que chaque mod soit disponible, compatible et que les droits soient valides. Le code ne fournit aucun fichier de mod propriétaire.
6. Autoriser le port du jeu **UDP 7777** selon les exigences de ton routeur/pare-feu. Garder **TCP 27020 RCON fermé à Internet** (utilisation sur `127.0.0.1` seulement). Tester visibilité dans la liste non-officielle sur **PC, Xbox et PS5**, pas seulement sous Steam.
7. Le PC hôte doit rester **allumé et en ligne** pour que le serveur soit accessible. Un simple site Railway ou un iPhone ne remplace pas une vraie machine d'hébergement.

## Réglages Valhalla

Les fichiers `Game.ini` et `GameUserSettings.ini` incluent :

- XP ×10, récolte ×3, taming ×1000 (quasi instantané selon l'espèce), maturation ×900, réapparition ressources ×0,5.
- Stack multiplicateur ×30000 (ce n'est **pas** une pile fixe de 30 000 pour chaque objet).
- Accélération du **défilement du jour** ×10 via `DayTimeSpeedScale=10` : le jour devient plus **court**. Pour rendre le jour **10 fois plus long**, utiliser `0.1`.
- Pas de dégradation automatique PvE des bâtiments; dinos non-interagis « 7 jours » restant à mesurer/ajuster in-game.
- Poids/crafting approchés par de **très grands multiplicateurs finis**, pas infinis au sens du moteur.
- Chutes : seuil de dommage fortement relevé avec `MaxFallSpeedMultiplier=100`, mais la suppression absolue de tous les dégâts n'est pas garantie.
- `DifficultyOffset=1` et `OverrideOfficialDifficulty=10` (max dinos sauvages visé **300**, Tek **360**, œufs de wyverne/drake **380**), plus `Custom Dino Levels` (`MaxLevel=30`, `MaxDrakeLevel=38`).
- Dinos/tamed et joueur : multiplicateurs par point définis, **non équivalents à des bonus fixes exacts** « +100 HP » sur toutes les espèces.
- Vitesse des dinos autorisée; torpeur `+20 par point` ne peut pas être garantie sans mod spécifique.
- Element transférable via **SCS** : dépend des paramètres du mod en jeu et de la configuration de cluster; puisque **un seul serveur tourne à la fois**, il n'y a **pas** de voyage cross-server en temps réel.

## Mods

Les **24 mods** demandés sont répertoriés avec leur ID CurseForge et leur lien officiel dans `manifest.json`. La liste inclut notamment S-Dino Variants, Shiny!, Runic Wyverns, Moro, ARKOLOGY, Mythological Creatures, Custom Dino Levels, SCS, Spawn Blocker, construction, RP, économie et outils administrateurs.

**Attention :** « Role Play Jobs » a été interprété comme **RolePlay Additions: Jobs** (projet 1362939). Vérifier qu'il s'agit bien du mod souhaité. **Moro's Livyatan (Freemium)** est classé **Premium** par CurseForge; aucune installation non autorisée n'est permise. Le statut « Crossplay demandé » ne certifie pas que les 24 mods sont publiés sur toutes les consoles ou fonctionnent tous ensemble.

## Arrêts automatiques à heure de Paris

Un seul lanceur local gère les horaires **08:00, 12:00, 22:00 en Europe/Paris** (DST inclus), pour **ce profil ARK actif**. À l'heure prévue, il tente un **SaveWorld** et **DoExit** via **RCON local**, puis redémarre le processus ARK seulement après fermeture. Si le RCON est inaccessible, il **n'arrête pas brutalement** la partie : vérifier localement le mot de passe et les logs. Le planning fonctionne **seulement tant que le lanceur reste ouvert**.

Ces redémarrages concernent **ARK Astraeos** uniquement. Les quatre profils DayZ conservent leur gestion propre.

## Protection des données

- Serveur ASA installé séparément dans `C:\CMD-Servers\cmd-asa-personnel\ark-asa`.
- Les deux INI sont écrits **une fois si absents**; les fichiers modifiés par un administrateur restent en place. Les modifications de mot de passe admin local déclenchent une sauvegarde à part.
- Les mondes persistants sont sous `ShooterGame\Saved`, sans commande de suppression.
- Aucun mot de passe, token, licence ni élément ARK/CurseForge protégé n'est enregistré dans le dépôt ou l'archive.
- Les **5 profils configurés ne sont pas 5 serveurs déjà installés et démarrés**.

## Ce qu'il reste à valider sur le vrai PC

Serveur officiel réellement installé, map Astraeos accessible selon les droits du DLC, téléchargement des 24 mods dans les builds WindowsServer, droits Premium, compatibilité PC/PS5/Xbox, stabilité avec 100 joueurs, XP et points exacts, restart RCON, réseau Internet et sauvegardes. Les tests GitHub valident les **configurations, interfaces et verrous**, pas le vrai serveur Unreal exécuté.
