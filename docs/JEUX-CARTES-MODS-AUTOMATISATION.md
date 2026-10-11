# CMD Hosting — état de l'automatisation des jeux, cartes et mods

Date : 11 octobre 2026. Ce document complète les agents existants, sans changer le Lenovo ou les autres projets.

## Déployé côté Railway

Service : `cmd-hosting-cloud-agents` (version 1.9.2, sauvegardée en code source depuis Railway).

- `GET /v1/provisioning/maps?game=dayz&platform=pc` : cartes de ce jeu seulement.
- `GET /v1/provisioning/maps?game=ark-asa&platform=crossplay` : cartes ARK ASA seulement.
- `POST /v1/provisioning/content/select` : sélection carte/mods **réservée au backend possédant le secret d'administration**, avec contrôle d'identité du loueur et du jeu; ne jamais exposer ce secret dans un navigateur.
- `POST /v1/provisioning/agent/claim` et `report` : file de location déjà payée, reçu vérifié, machine associée et autorisée, lease limité, résultat réel; aucune installation lancée par Railway.
- `POST /v1/provisioning/worker/authorize` et `revoke` : octroi et révocation explicites du droit d'installer à un agent précis, distinct du droit de supervision.
- Les machines Windows/Linux, Supermicro et Ryzen/EPYC conservent une association individuelle. Un MicroCloud est un groupe de nœuds indépendants.

**La création de tâches ne vaut jamais succès d'installation.** Les 6 locations enregistrées lors de la vérification étaient `not_started`, sans reçu payé; aucune n'a déclenché de téléchargement.

## Version Windows préparée sur GitHub

- `scripts/CMDHostingRentalWorkerV2.ps1` : SteamCMD officiel pour une nouvelle location éligible, vérifie CPU/RAM/stockage et l'exécutable du jeu, conserve chaque dossier de location, reçoit les options carte/mods, et signale `content_prepared` uniquement après préparation.
- `scripts/Configure-CMDGameContent.ps1` : applique en local la mission Chernarus/Livonia/Sakhal **si les fichiers de mission existent**, prépare l'argument de carte ARK ASA, inscrit le scénario de Reforger dans `config.json`, ou prépare une copie `cmdhosting-serverconfig.xml` pour 7DTD.
- DayZ PC : télécharge les mods autorisés depuis Steam Workshop si le compte Steam dispose des droits, vérifie les fichiers, préserve les clés et programme une nouvelle vérification après 180 minutes, uniquement serveur arrêté. Les sauvegardes ne sont jamais supprimées.
- ARK Ascended : prépare les `-mods=` CurseForge et le niveau de carte correspondant. **Le serveur ARK télécharge les mods au prochain démarrage réussi**; vérifier ses logs. Une configuration de lancement ne prouve pas que les mods sont effectivement installés.
- Arma Reforger : prépare les GUIDs Bohemia Workshop et le scénario. Le serveur récupère les mods lors du démarrage si les droits et connexions sont valides.
- 7DTD : copie protégée du XML pour le choix de la carte, mods tiers réservés aux adaptateurs éditeur spécifiques.
- Les autres jeux et les plateformes consoles ont besoin de leurs propres adaptateurs et autorisations. Un SteamCMD Windows universel ne peut pas installer des serveurs PS5, Xbox ou Nintendo.

## Activation future, sans réinstallation des agents existants

- Windows, supervision : `scripts/ACTIVER-AGENT-PORTABLE-V2.cmd`, une fois par nouvelle machine avec un code d'association de 24 h délivré par l'administrateur.
- Windows, location de jeux : `scripts/ACTIVER-LOCATIONS-AUTO-V2.cmd`, également une fois, avec SteamCMD officiel disponible, acceptation des licences et autorisation spécifique du worker sur Railway.
- Linux, supervision : `scripts/Installer-CMDHostingPortable-linux-v2.sh` (ne fournit pas à lui seul un installateur universel de serveurs Linux).
- Les agents `CMDHostingAgentMainV5`, `CMDHostingModsAgent` et leurs tâches Windows restent installés et inchangés. Ces nouveaux modules ne se propagent **pas** à distance dans une machine éteinte ou non associée.

## Vérifications réalisées

Le workflow `.github/workflows/cmd-portable-machines.yml` teste les catalogues de cartes et de mods, les plateformes, les nœuds Supermicro, les scripts PowerShell (analyse syntaxique) et les configurations de faux serveurs Windows. Ce sont **des tests techniques sans vrai jeu téléchargé**. Les auto-tests Cloud Agents vérifient le catalogue DayZ et ARK ASA, les refus console et les droits d'accès.

## Ce qu'il reste à valider avant l'ouverture commerciale

1. Authentifier l'utilisateur final sur le panneau CMD Hosting et raccorder ses menus « Carte à choisir » à l'API protégée, sans exposer de jeton administrateur.
2. Associer réellement au moins une machine future et autoriser explicitement son worker, puis tester une location payée, les ports, les sauvegardes et le lancement du serveur.
3. Vérifier les mods DayZ téléchargés, les mods ARK via CurseForge et les mods Bohemia sur une vraie machine. Gérer les redémarrages hors heures de jeu et les erreurs Steam Guard/licence.
4. Implémenter les adapteurs Linux de provisionnement, les hébergeurs gérés comme Nitrado, les cartes communautaires dont les fichiers source sont légalement accessibles, et les consoles lorsqu'une API officielle le permet.
5. Ne pas appliquer sans revue le patch Railway encore **staged**, qui comprend des changements externes aux modules ici déployés.

**Conclusion :** le contrôle cloud et les scripts Windows sont préparés et testés sur des fichiers factices; l'installation complète d'un serveur réellement jouable n'est pas encore confirmée.