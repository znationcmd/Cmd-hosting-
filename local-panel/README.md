# CMD Hosting — Mes serveurs et fichiers réels (sans Railway)

Application **autonome** à lancer directement sur la machine qui héberge les vrais jeux. Technologie : Node.js 22, HTML/CSS/JS. Aucune dépendance NPM, aucun serveur Railway, aucun abonnement et aucun fichier factice.

**Installation Windows** : décompresser le paquet ZIP entier dans un dossier puis double-cliquer sur `DEMARRER-CMD-HOSTING-FICHIERS.cmd`. Node.js 22 ou supérieur doit être installé (https://nodejs.org/). Une clé secrète administrateur est affichée dans la fenêtre de démarrage; la copier dans le formulaire du panneau. Le panneau s'ouvre sur http://127.0.0.1:8788.

Par défaut, l'application lit les installations réelles sous `C:\CMD-Servers`. Elle cherche jusqu'à trois niveaux les exécutables officiels DayZ PC, ARK ASA/ASE, Arma Reforger/3, 7DTD, Palworld et Satisfactory. Exemple : `C:\CMD-Servers\cmd-dayz-personnel\dayz\` (installateur personnel DayZ existant). Une installation est **détectée** uniquement lorsqu'un exécutable correspondant existe; ceci **ne prouve pas** qu'elle est complète, en cours de fonctionnement ou joignable depuis Internet.

Dans `Mes serveurs`, cliquer sur le serveur pour ouvrir **son vrai répertoire** : dossiers, fichiers, configurations, téléchargements. Les fichiers texte de configuration (`.cfg`, `.ini`, `.xml`, `.json`, `.c`, etc.) peuvent être édités après confirmation que le serveur est arrêté. Les anciennes versions sont archivées séparément sous `~/.cmdhosting/files-panel/backups`; aucun dossier de partie n'est supprimé. Les fichiers binaires peuvent être téléchargés mais non modifiés arbitrairement par le navigateur; la copie des gros mods nécessite un canal de transfert autorisé distinct.

Pour DayZ, le panneau liste les **missions installées** dans `mpmissions`, vérifie les fichiers `init.c` et `db/types.xml`, puis peut modifier **uniquement** la valeur `template` du fichier `serverDZ.cfg`, avec sauvegarde. Il n'installe ni Chernarus, ni Livonia, ni Sakhal par simple sélection : les contenus officiels ou autorisés doivent réellement se trouver sur le disque.

Pour ARK, Arma et les autres jeux, le navigateur affiche leurs dossiers et les fichiers réellement installés. Les différentes maps ARK sont des niveaux et contenus éditeurs; afficher une liste ne suffit pas à les installer. Les mods doivent être récupérés depuis leurs sources officielles avec les licences nécessaires.

**Tous les jeux du catalogue** peuvent être associés via le formulaire `+ Associer un serveur existant` dès lors que leur installation se trouve sous `C:\CMD-Servers`. Aucun jeu non installé ne peut fournir magiquement des fichiers. Les jeux consoles et services managés demandent leurs APIs ou fournisseurs officiels; ce panneau local n'y accède pas.

### Sécurité

- Serveur lié à `127.0.0.1` par défaut (uniquement sur le PC).
- Accès depuis un téléphone du même Wi-Fi : choisir le mode `2` dans le lanceur pour activer le réseau privé. L'adresse est `http://IP-LOCALE-DU-PC:8788`. **HTTP sur LAN n'est pas chiffré** : utiliser un réseau privé de confiance, ne jamais publier ce port sur Internet, et de préférence utiliser un tunnel HTTPS/VPN authentifié pour un accès extérieur.
- Toutes les APIs nécessitent une clé administrateur aléatoire gardée sur la machine, jamais enregistrée par le navigateur.
- Isolation stricte par serveur; blocage des chemins absolus, `..`, liens symboliques et dossiers de données hors du répertoire de jeux autorisé.
- Les fichiers sensibles de connexion sont exclus. Pas de suppression et pas d'exécution de commandes à distance.
- Le panneau ne démarre, n'arrête, ne met à jour ni ne télécharge les jeux. Il gère les **fichiers réellement présents**. Les machines doivent être allumées pour un accès 24/24.

### Développement / tests

```bash
node --test local-panel/server.test.mjs
node local-panel/server.mjs
```

Variables optionnelles : `CMD_SERVERS_ROOT` (dossier contenant les jeux), `CMD_FILES_STATE_DIR` (clé/manifest/backups, séparé du dossier de jeux), `CMD_FILES_LISTEN_HOST` (défaut localhost), `CMD_FILES_PORT` (défaut 8788).

Les tests GitHub Actions fabriquent leurs propres dossiers **factices uniquement pendant les tests**, dans un répertoire temporaire : jamais de serveur fictif dans une installation utilisateur. L'archive distribuée contient uniquement le gestionnaire de fichiers; les jeux officiels sont téléchargés séparément sur l'hôte.

Ce module est volontairement isolé de la fonction Bun Railway principale, de PostgreSQL, des comptes, des prix et des agents de location. Il ne modifie aucun de ces services.
