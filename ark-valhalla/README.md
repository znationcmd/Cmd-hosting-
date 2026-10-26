# CMD Hosting — CMD Valhalla Astraeos (ARK Survival Ascended)

**Projet local préparé, pas encore un serveur démarré.** RP, 100 slots, carte officielle Astraeos_WP, 24 mods (23 IDs CurseForge vérifiés), sans Railway.

## Installation Windows
Décompresser toute l'archive en gardant LANCER-CMD-VALHALLA-ASTRAEOS.cmd, ark-valhalla/ et scripts/. Installer Node.js 22+ si nécessaire.
Double-cliquer LANCER-CMD-VALHALLA-ASTRAEOS.cmd :
1. Installer les fichiers officiels ASA via SteamCMD app 2430930, avec confirmation locale et un minimum de 120 Go de disque libre.
2. Préparer les INI. Les fichiers existants sont conservés, sans écrasement.
3. Vérifier les 24 identifiants de mods, le DLC Astraeos, les licences et le support PC/PS5/Xbox.
4. Démarrer seulement si tous les contrôles passent. L'outil ne simule jamais un serveur en ligne.

## Mod RP et DLC
Le nom demandé Role Play Jobs n'a pas de correspondance certaine. RolePlay Additions: Jobs (ID 1362939) est seulement une PROPOSITION à confirmer, pas un remplacement automatique.
Le DLC Astraeos_WP est une carte officielle payante. Aucune dépense ni installation non autorisée. Si tu possèdes la licence ou les droits applicables, confirme-le dans le fichier local de validation.
Moro's Livyatan (Freemium) : les éventuelles licences et accès premium doivent être vérifiés. Plusieurs mods affichent un support consoles non confirmé : ne pas les considérer cross-play sans contrôle sur CurseForge.

Le fichier de validation est C:\CMD-Servers\CMD-Valhalla-Astraeos\cmdhosting-local\mod-confirmations.json. Il est créé par le menu Préparer.
Exemple :
  {
    "paidMapAuthorized": false,
    "mods": {
      "Role Play Jobs": {"curseforgeId":"1362939","nameMatched":false,"consoleCrossplayConfirmed":false},
      "Runic Wyverns": {"curseforgeId":"974884","consoleCrossplayConfirmed":false},
      "Moro's Livyatan (Freemium)": {"curseforgeId":"956237","entitlementConfirmed":false}
    }
  }
Ne modifier les drapeaux à true qu'après vérification réelle, jamais à l'aveugle.

## Réglages et limites
- XP x10, récolte x3, TamingSpeedMultiplier=1000, BabyMatureSpeedMultiplier=900, respawn ressources x0.5.
- ItemStackSizeMultiplier=30000 multiplie les piles par leur taille de base; ne garantit pas exactement 30000 unités pour tous les objets.
- DayTimeSpeedScale=10 accélère l'écoulement du JOUR (il devient plus court).
- DifficultyOffset=1, OverrideOfficialDifficulty=10 donne des dinos sauvages standard jusqu'au niveau 300. Tek 360 et oeufs Wyvern/Drake 380 demandent vérifications spécifiques des créatures/mods.
- Poids quasi illimité via de très grands multiplicateurs, pas mathématiquement infini. Stats +100 exact par point varient suivant espèce et attribut.
- Résistance personnage +20 et torpeur dino +20 par point ne sont pas garanties par l'INI; effets des dinos à tester.
- MaxFallSpeedMultiplier=100000 rend les dégâts de chute peu probables, mais n'est pas une garantie universelle zéro dégâts.
- Les transferts d'objets sont autorisés, mais le transfert d'Élément et des cryo SCS dépend des règles ARK et d'un cluster/mode compatible, non garanti.
- Structure PvE decay désactivé ; dino decay PvE multiplier x1 (7 jours de base à vérifier).

## Redémarrages 8 h, 12 h et 22 h — Europe/Paris
Le superviseur local Windows doit rester ouvert. Il utilise le fuseau Europe/Paris (heure d'été/hiver). Il demande au serveur par RCON local : SaveWorld, attend, puis DoExit et relance le jeu. En cas d'échec RCON, PAS d'arrêt brutal.
Ajouter le mot de passe administrateur RCON uniquement dans GameUserSettings.ini local, section ServerSettings : ServerAdminPassword=TON_SECRET_LOCAL. Ne jamais publier le mot de passe sur GitHub. N'ouvre jamais le port TCP 27020 d'administration sur Internet.
Les redémarrages ne fonctionnent pas quand le PC est éteint ou quand le superviseur est fermé. Aucun service Railway utilisé.

## Infrastructure
Chemin serveur officiel : C:\CMD-Servers\CMD-Valhalla-Astraeos\ark-asa ; binaire attendu ShooterGame\Binaries\Win64\ArkAscendedServer.exe.
Ports : jeu UDP 7777, query UDP 27015, RCON TCP 27020 LOCAL UNIQUEMENT. Slots=100 ne garantit pas que le PC puisse supporter 100 joueurs.
Sauvegardes : ShooterGame\Saved\SavedArks ; jamais effacées par le gestionnaire.
Le gestionnaire de fichiers local CMD Hosting peut détecter le binaire une fois installé ; la création depuis l'iPhone en 4G nécessite une autre infrastructure sécurisée, absente pour l'instant.

Sources : https://ark.wiki.gg/wiki/Server_configuration ; https://ark.wiki.gg/wiki/Astraeos ; https://www.curseforge.com/ark-survival-ascended/mods

État réel : profil/config préparé, aucun ARK téléchargé sur le PC par cette mission et aucun serveur déclaré en ligne.