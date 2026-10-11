# CMD Hosting — Installateur automatique des locations PC (préparation contrôlée)

**Installé sur Railway :** gestion sécurisée des demandes et validation des paiements.
**Non confirmé sur le Lenovo :** installation et exécution de cette tâche Windows.

## Activation locale unique (sans commande à taper)

- Conserver les agents existants CMDHostingAgentMainV5 et CMDHostingModsAgent.
- Lancer par double-clic `ACTIVER-INSTALLATIONS-AUTO.cmd` placé à côté de `CMDHostingRentalWorker.ps1`.
- L'installateur vérifie le fichier d'association V5, l'identifiant machine, le jeton chiffré DPAPI de l'agent des mods et SteamCMD existant.
- Une fenêtre demande explicitement l'autorisation d'installer les logiciels et d'accepter les conditions des éditeurs.
- Après validation, il crée une tâche distincte `CMDHostingRentalWorker` (ouverture de session + 10 minutes). Pas de nouvelle connexion à Railway à effectuer.

### Garanties et limites

- Le cloud ne prépare une tâche que pour une location réellement payée, active, disposant d'un reçu vérifié, d'une machine déjà associée et d'un jeu PC pris en charge.
- La liste SteamCMD est fixe; aucune commande shell arbitraire ne peut être envoyée depuis le cloud.
- Le répertoire est propre à la location (`C:\\CMD-Servers\\<serverId>\\<jeu>`); le script refuse l'écrasement des fichiers déjà présents.
- Le rapport `binary_verified` exige un exécutable existant localement, mais ne prouve **pas** qu'un serveur de jeu a été démarré et qu'il accepte des connexions.
- Les mods DayZ/ARK restent gérés par l'agent des mods déjà existant, et les cartes nécessitent une activation spécifique au jeu. Les commandes réelles d'installation de maps, de lancement du serveur et les tests réseau ne sont pas encore reliés à cette tâche.
- Les serveurs console PS/Xbox/Nintendo ne peuvent pas être installés via SteamCMD Windows et restent exclus.
- Un abonnement/renouvellement ne doit pas écraser les fichiers existants. Le système conserve toujours les données et sauvegardes.
- Le PC doit être allumé et connecté. Aucun déploiement Railway ne peut installer rétroactivement ce fichier sur Windows.
- Si l'identifiant de la machine diffère du schéma connu de l'agent V5 ou si SteamCMD manque, la tâche refuse toute installation; le diagnostic local devra être adapté avant déploiement.
- Ne jamais publier le contenu du fichier auth.json ni le jeton DPAPI.

**État au 11 octobre 2026 :** tests Railway non destructifs validés. Aucune des six locations de la base n'a un paiement activé; aucune installation de serveur n'a été réalisée.
