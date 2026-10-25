# CMD Hosting — 4 serveurs DayZ PC à la demande (SANS RAILWAY)

**Profils :** CMD Lux, CMD Namalsk, CMD Deer Isle, CMD Takistan Plus. Tous sont configurés pour **100 slots**, avec leurs mods respectifs d'après les quatre captures de l'utilisateur. **Un seul serveur démarre à la fois** : port `2302`, verrou exclusif et contrôle du processus DayZ déjà présent. Pas de dépenses, pas de compte tiers, pas de stockage Railway.

## Démarrage depuis Windows

1. Installe le **serveur officiel DayZ PC** avec l'outil CMD Hosting DayZ (ou utilise ton installation existante sous `C:\CMD-Servers\cmd-dayz-personnel\dayz`). Il faut de l'espace disque pour les cartes et dizaines de mods.
2. Décompresse l'archive, puis double-clique sur **`CMD-4-SERVEURS-DAYZ.cmd`**. Node.js 22 est requis.
3. L'assistant crée **4 configurations séparées**, sans remplacer les fichiers déjà présents, dans `C:\CMD-Servers\CMD-DayZ-4-Worlds\profiles\<nom>\serverDZ.cfg`.
4. Menu **5** : vérifie exactement ce qui est installé et ce qui manque. Menu **6** : tente de télécharger via SteamCMD les mods avec des ID Workshop vérifiés; Steam peut exiger ton compte. Menu **7** : renseigne les ID des autres mods issus des photos, après vérification sur Steam. Menu **8** : associe la mission `mpmissions` réelle une fois installée.
5. Menus **1–4** : démarre le profil sélectionné seulement si tous les mods activés et la mission existent réellement. Un deuxième processus DayZ est bloqué. Arrête proprement le serveur actif avant de passer à la carte suivante.

**Important :** aucun des 4 serveurs n'est encore en ligne ou installé sur la machine de l'utilisateur. Les photographies contiennent des noms et non les liens Workshop officiels ; les ID non vérifiables restent vides. L'installation de la carte ne découle pas du seul profil. Il faut obtenir les vraies missions de Lux, Deer Isle, Namalsk et Takistan Plus auprès des auteurs, sans réutiliser une mission d'une autre carte.

Lux : la photo inclut des mods **Namalsk Island / Survival / Tourist Map** — ils sont **répertoriés mais désactivés par défaut sur Lux** afin d'éviter de charger deux terrains incompatibles. Tu peux les conserver sur Namalsk.

Les fichiers `workshop-ids.json` et `mods-a-installer.txt` sont conservés après création. Les mods déjà installés sous `@<workshop-id>` ne sont jamais remplacés automatiquement. Les clés `.bikey` existantes ne sont pas écrasées. Les sauvegardes des cartes restent dans les vrais dossiers mission DayZ et les dossiers de profils indépendants. Aucun nettoyage ou suppression des sauvegardes.

**Limites :** 100 slots signifie `maxPlayers = 100`, pas 100 joueurs garantis. La machine, la connexion, les mods, leurs licences et la stabilité de DayZ doivent être testés. Le PC doit rester allumé, et les ports UDP requis correctement configurés. Les mods comme Expansion, Namalsk, Deer Isle, Lux et les véhicules tiers peuvent avoir des exigences supplémentaires d'installation, de fichiers serveur, de clés, de mission, de permission ou de configuration.

Le programme ne télécharge pas automatiquement les mods sans ID confirmé ni ne ment en signalant le serveur « démarré » avant un véritable lancement.
