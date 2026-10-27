# CMD Hosting — Mes serveurs et fichiers réels (sans Railway)

Application **autonome** à lancer directement sur la machine qui héberge les vrais jeux. Technologie : Node.js 22, HTML/CSS/JS. Aucune dépendance NPM, aucun serveur Railway, aucun abonnement et aucun fichier factice.

**Installation Windows** : décompresser le paquet ZIP entier dans un dossier puis double-cliquer sur `DEMARRER-CMD-HOSTING-FICHIERS.cmd`. Node.js 22 ou supérieur doit être installé (https://nodejs.org/). Une clé secrète administrateur est affichée dans la fenêtre de démarrage; la copier dans le formulaire du panneau. Le panneau s'ouvre sur http://127.0.0.1:8788.

Par défaut, l'application lit les installations réelles sous `C:\CMD-Servers`. Elle cherche jusqu'à trois niveaux les exécutables officiels DayZ PC, ARK ASA/ASE, Arma Reforger/3, 7DTD, Palworld et Satisfactory. Exemple : `C:\CMD-Servers\cmd-dayz-personnel\dayz\` (installateur personnel DayZ existant). Une installation est **détectée** uniquement lorsqu'un exécutable correspondant existe; ceci **ne prouve pas** qu'elle est complète, en cours de fonctionnement ou joignable depuis Internet.

Dans `Mes serveurs`, cliquer sur le serveur pour ouvrir **son vrai répertoire** : dossiers, fichiers, configurations, téléchargements. Les fichiers texte de configuration (`.cfg`, `.ini`, `.xml`, `.json`, `.c`, etc.) peuvent être édités après confirmation que le serveur est arrêté. Les anciennes versions sont archivées séparément sous `~/.cmdhosting/files-panel/backups`; aucun dossier de partie n'est supprimé. Les fichiers binaires peuvent être téléchargés mais non modifiés arbitrairement par le navigateur. Pour Palworld Windows, l’import contrôlé de mods déjà téléchargés par Steam est disponible dans le panneau, sans accepter de ZIP ni de commandes arbitraires.

Pour DayZ, le panneau liste les **missions installées** dans `mpmissions`, vérifie les fichiers `init.c` et `db/types.xml`, puis peut modifier **uniquement** la valeur `template` du fichier `serverDZ.cfg`, avec sauvegarde. Il n'installe ni Chernarus, ni Livonia, ni Sakhal par simple sélection : les contenus officiels ou autorisés doivent réellement se trouver sur le disque.

Pour ARK, Arma et les autres jeux, le navigateur affiche leurs dossiers et les fichiers réellement installés. Les différentes maps ARK sont des niveaux et contenus éditeurs; afficher une liste ne suffit pas à les installer. Les mods doivent être récupérés depuis leurs sources officielles avec les licences nécessaires.

**Tous les jeux du catalogue** peuvent être associés via le formulaire `+ Associer un serveur existant` dès lors que leur installation se trouve sous `C:\CMD-Servers`. Aucun jeu non installé ne peut fournir magiquement des fichiers. Les jeux consoles et services managés demandent leurs APIs ou fournisseurs officiels; ce panneau local n'y accède pas.

### Sécurité

- Serveur lié à `127.0.0.1` par défaut (uniquement sur le PC).
- Accès depuis un téléphone du même Wi-Fi : choisir le mode `2` dans le lanceur pour activer le réseau privé. L'adresse est `http://IP-LOCALE-DU-PC:8788`. **HTTP sur LAN n'est pas chiffré** : utiliser un réseau privé de confiance, ne jamais publier ce port sur Internet, et de préférence utiliser un tunnel HTTPS/VPN authentifié pour un accès extérieur.
- Toutes les APIs nécessitent une clé administrateur aléatoire gardée sur la machine, jamais enregistrée par le navigateur.
- Isolation stricte par serveur; blocage des chemins absolus, `..`, liens symboliques et dossiers de données hors du répertoire de jeux autorisé.
- Les fichiers sensibles de connexion sont exclus. Pas de suppression et pas d'exécution de commandes à distance.
- Depuis ce même PC Windows uniquement, le panneau peut maintenant **préparer les quatre profils DayZ + CMD Valhalla Astraeos**, puis lancer un profil compatible dont les vrais exécutables et mods sont validés. Aucun shell ni chemin d'exécution arbitraire exposé au navigateur.
- Les appels provenant d'un téléphone ou d'un autre ordinateur ne peuvent **pas** lancer un jeu. Depuis un téléphone sur Wi-Fi, le panneau peut afficher l'état et les fichiers autorisés après connexion.
- Le démarrage du gestionnaire n'est pas une preuve que des joueurs peuvent rejoindre le serveur : vérifier les journaux du jeu, le pare-feu, les ports et la connexion en jeu. Les machines doivent rester allumées pour un accès 24/24.
- Le téléchargement des binaires officiels nécessite toujours l'installateur SteamCMD et les licences appropriées ; le panneau ne crée pas de fichiers de jeu imaginaires.

### Développement / tests

```bash
node --test local-panel/server.test.mjs
node local-panel/server.mjs
```

Variables optionnelles : `CMD_SERVERS_ROOT` (dossier contenant les jeux), `CMD_FILES_STATE_DIR` (clé/manifest/backups, séparé du dossier de jeux), `CMD_FILES_LISTEN_HOST` (défaut localhost), `CMD_FILES_PORT` (défaut 8788).

Les tests GitHub Actions fabriquent leurs propres dossiers **factices uniquement pendant les tests**, dans un répertoire temporaire : jamais de serveur fictif dans une installation utilisateur. L'archive distribuée contient uniquement le gestionnaire de fichiers; les jeux officiels sont téléchargés séparément sur l'hôte.

Ce module est volontairement isolé de la fonction Bun Railway principale, de PostgreSQL, des comptes, des prix et des agents de location. Il ne modifie aucun de ces services.

### Cinq profils CMD dans « Mes serveurs »

Le gestionnaire affiche **CMD Lux, CMD Namalsk, CMD Deer Isle, CMD Takistan Plus** (DayZ PC) et **CMD Valhalla Astraeos** (ARK ASA), chacun avec 100 slots **configurés**, sans prétendre accueillir 100 joueurs tant que la machine et les mods ne sont pas testés. Les mods de chaque monde restent séparés. Le panneau utilise les gestionnaires `dayz-worlds/manager.mjs` et `asa-astraeos/manager.mjs` déjà présents, avec le verrou exclusif commun `local-panel/exclusive-game-lock.mjs`.

Dans la rubrique « Mes serveurs CMD », clique « Préparer » (génère les configurations sans écraser les existantes), puis installe le serveur officiel et ses cartes/mods légalement via SteamCMD. « Démarrer » n'est autorisé **que depuis ce PC Windows** et reste bloqué si les fichiers attendus, les mods ou les autorisations locales manquent. La machine ne passe jamais par Railway pour faire fonctionner le jeu.

Si l'écran indique zéro **serveur installé**, cela n'efface pas les cinq **profils prévus** : ces compteurs sont volontairement séparés, car une installation ne peut pas être déclarée active sans exécutables, stockage et diagnostic.

### Palworld et Steam Workshop

Pour un serveur Palworld Windows détecté, ouvre « Mes serveurs » et sélectionne Palworld. Le panneau montre « Mods de mon serveur » et propose le [Workshop Steam Palworld](https://steamcommunity.com/app/1623730/workshop/) et le [guide officiel](https://docs.palworldgame.com/settings-and-operation/mod/). Les mods réellement présents dans `Mods/Workshop/<dossier>/Info.json` sont détectés et comparés aux `ActiveModList` de `Mods/PalModSettings.ini`, sans téléchargement fictif.

Les mods Palworld dédiés sont actuellement pris en charge sur les serveurs Windows uniquement, lorsqu'un mod possède des règles `IsServer: true`. Sauvegarder avant modification et redémarrer correctement le serveur pour les charger.


#### Importer réellement un mod Palworld depuis Steam

1. Sur le **PC Windows qui héberge PalServer.exe**, s'abonner au mod sur le [Workshop Palworld](https://steamcommunity.com/app/1623730/workshop/) et laisser Steam le télécharger. Vérifier sa fiche, ses dépendances et son support serveur.
2. Démarrer PalServer une première fois pour générer le fichier PalModSettings.ini, puis **arrêter le serveur**. Conserver une sauvegarde récupérable de la partie dans Pal/Saved/SaveGames.
3. Dans CMD Hosting local → **Mes serveurs → serveur Palworld → Mods de mon serveur → Importer mes mods Steam**, cliquer **Actualiser mes téléchargements Steam**. Seuls les dossiers téléchargés avec Info.json et une règle IsServer:true sont importables.
4. Cliquer **Importer dans Mods/Workshop** : le panneau copie les vrais fichiers dans Mods/Workshop/<WorkshopId>/ et bloque les liens symboliques, PackageName déjà présent et archives excessives. Aucun téléchargement en arrière-plan par le panneau.
5. Cliquer **Activer** pour préparer ActiveModList=<PackageName> et bGlobalEnableMod=true dans Mods/PalModSettings.ini avec sauvegarde du fichier précédent. Redémarrer PalServer puis vérifier ses journaux et Mods/ManagedMods. Le panneau ne prétend pas que le mod est chargé sans confirmation.

Par défaut, Steam est cherché dans C:\Program Files (x86)\Steam\steamapps\workshop\content\1623730. Si Steam se trouve sur un autre disque, définir **avant le lancement du panneau** la variable d'environnement **CMD_PALWORLD_STEAM_WORKSHOP_DIR** vers le véritable dossier steamapps\workshop\content\1623730, par exemple D:\SteamLibrary\steamapps\workshop\content\1623730.

L'import n'est réalisable que lorsqu'un hôte local Windows possède les fichiers Steam et le serveur. Le site Railway seul ne peut pas accéder aux disques de ce PC. Le mod peut exiger une copie côté client, et peut endommager la sauvegarde : vérifier les droits et sauvegarder avant modification.

**Périmètre Nitrado** : recherche du Workshop, import de dossiers Steam déjà téléchargés, inventaire des mods et activation INI fonctionnent dans ce panneau local. L'hébergement 24/7, le provisionnement des serveurs, les backups/restaurations complets, le contrôle de processus distant et le statut réseau restent à confirmer sur de vraies machines. Aucun profil simplement enregistré ne doit être compté comme un serveur actif.
