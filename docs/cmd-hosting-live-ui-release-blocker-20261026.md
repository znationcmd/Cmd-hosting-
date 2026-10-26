# CMD Hosting — publication fiable du site actuel (Railway)

Date de vérification : 26 octobre 2026.

## Ce qui est confirmé

- Le **véritable** service `cmd-hosting-web` Railway est une Railway Function Bun, **sans dépôt GitHub connecté**.
- Son frontend public renvoie HTTP 200 et `/api/catalog` renvoie **173 jeux**.
- Mais `/ui/cmd-simplified-navigation-v7.js` et `/ui/cmd-simplified-mobile-v7.css` renvoient **404** sur le domaine Railway.
- `/catalog-compat.js` est servi, mais **diffère du fichier GitHub**.
- Les changements poussés dans `web/public/` ne sont donc **pas automatiquement publiés** sur le site.
- La vérification est automatisée par `.github/workflows/cmd-hosting-production-parity.yml`. Le travail de diagnostic est **non destructif**.

## Règle absolue : ne pas casser les comptes et serveurs

Ne pas remplacer aveuglément la Railway Function actuelle par un nouveau dépôt ou un site statique. Le code complet du backend déployé (authentification, profils, commandes de machines, locations, états et configuration des mods) n'est pas disponible dans le dépôt restauré. Une telle opération ferait potentiellement perdre les fonctions du panneau même si l'interface redevenait jolie.

Ne pas effacer PostgreSQL, les variables de sessions, les locations, les informations d'hôtes, les sauvegardes, les jetons ou les accès des utilisateurs.

## Chemin de livraison requis pour un résultat visible sur téléphone

1. **Récupérer et sauvegarder intégralement le source texte de la Railway Function de production** (pas seulement le HTML public). Ne pas publier ce source dans un dépôt public tant que ses secrets potentiels ne sont pas audités.
2. Travailler sur une copie, conserver les routes d'API et protections de sessions intactes.
3. Intégrer dans **la version effectivement servie** les composants testés suivants :
   - `web/public/ui/cmd-simplified-navigation-v7.js` (menu épuré, profil serveur prioritaire)
   - `web/public/ui/cmd-simplified-mobile-v7.css` (cartes compactes sur iPhone)
   - `web/public/catalog-compat.js` et `web/public/mod-v2-ui.js` (modules de profil/Palworld selon jeu)
   - `web/public/catalog-ui.js` (catalogue dynamique complet)
4. Publier **sans remplacer la logique serveur**, puis vérifier le manifeste du déploiement effectif.
5. Lancer `node scripts/verify-cmd-hosting-production-ui.mjs` sur un runner GitHub. Les ressources du site doivent être HTTP 200 et correspondre à la version approuvée. Les 173 jeux doivent toujours être retournés.
6. Tester sur **iPhone** l'ouverture du catalogue : images miniatures, titres visibles, défilement normal, accès aux jeux complets. Tester « Mes serveurs → profil FS25 » puis « profil Palworld → Mods → Workshop Steam ». Les raccourcis doivent suivre **le jeu sélectionné**, pas rester affichés globalement.
7. Vérifier que **0 serveur actif** n'est pas remplacé par un faux chiffre : les profils de CMD sont seulement **préparés** tant qu'aucun hôte Windows ne les confirme.
8. Tester un compte non administrateur : les raccourcis privés/profils du propriétaire ne doivent pas fuiter.

## Restriction Palworld

Selon la documentation officielle Pocketpair, les mods Steam Workshop serveur ne fonctionnent que sur un dédié **Windows**. Ils sont placés dans `Mods/Workshop/<dossier>/Info.json`, puis activés par leur `PackageName` dans `Mods/PalModSettings.ini`. Cela ne signifie pas qu'un mod a été installé depuis le site de CMD Hosting, ni qu'il est compatible avec les consoles.

https://docs.palworldgame.com/settings-and-operation/mod/

## Statut

La correction de l'interface est **committée et testée sur GitHub**. La vérification du 26 octobre a démontré que la **version live Railway n'est pas alignée avec GitHub**. Aucune modification du code backend Railway ou du stockage de production n'a été effectuée par ce diagnostic.
