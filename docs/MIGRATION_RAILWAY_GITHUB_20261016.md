# CMD Hosting — migration Railway → GitHub (état vérifié au 16 octobre 2026)

## État actuel

- Dépôt existant : `znationcmd/Cmd-hosting-` — **PUBLIC** sur GitHub. Il ne faut pas y déposer d'identifiants ou de secrets.
- Site en production : `https://cmd-hosting-web-production.up.railway.app`.
- Projet Railway : `CMD Hosting` (`56e867d4-85c3-4bcd-91b1-54f310ef71bf`).
- Service web : `cmd-hosting-web` (`4fe9c596-ed98-416d-a652-7e9aab6c0629`), fonction Railway Bun 1.4.0. Il n'est pas encore lié à un dépôt GitHub.
- Services `cmd-hosting-mods-api` et `cmd-hosting-cloud-agents` : les sources effectivement déployées **correspondent exactement** aux fichiers `services/mods-api/index.ts` et `services/cloud-agents/index.ts` de GitHub à la date de vérification.
- Railway affiche **deux changements en attente** sur les services mods-api et cloud-agents. Le dépôt correspond au code **déployé**, pas aux variantes en attente. Ces changements ne sont pas appliqués par cette migration.
- Base PostgreSQL, jeux, locations, serveurs, agents PC et paiements ne sont pas modifiés.

## Blocage principal du site

La lecture du code de la fonction Railway `cmd-hosting-web` par le connecteur retourne **deux caractères de remplacement non exploitables** (au lieu du fichier TypeScript). Le code de cette fonction ne peut donc pas être exporté correctement ni redéployé depuis GitHub par cette voie. La sauvegarde complète du site n'est **pas** effectuée.

Une migration complète nécessitera une copie fidèle de la fonction (source TypeScript/TSX) ou un export du code depuis l'éditeur Railway/une sauvegarde d'origine. Ne jamais remplacer la fonction de production par un squelette partiel.

## Travail enregistré dans GitHub

- `ui/premium-16k.css` : langage visuel CMD violet/noir, panneaux et cartes en relief, boutons 3D, états de focus et petits écrans.
- `ui/premium-16k.js` : charge le thème et associe aux menus existants des icônes SVG vectorielles (sans réécrire leurs événements de clic).
- Il s'agit d'**actifs de refonte prêts à intégrer**, pas d'une modification déjà visible sur le site Railway. « 16K-ready » signifie graphique SVG et CSS indépendant de la résolution, non pas une résolution écran artificielle.

## Étapes pour achever la migration sans perte

1. Récupérer le **code source original intégral** de la fonction `cmd-hosting-web` depuis une sauvegarde saine ou l'éditeur Railway ; conserver la copie inchangée.
2. Vérifier et supprimer du code toute valeur sensible avant dépôt GitHub : conserver les clés, mots de passe, sessions et identifiants de marchand seulement dans les variables Railway (ou GitHub Actions secrets nécessaires).
3. Créer `services/web/index.tsx` contenant la copie fidèle, puis une branche de migration. Vérifier la compilation et les routes `/`, `/health`, tableau de bord, login, déconnexion, boutiques, locations, mods, console, sauvegardes, fichiers et profil.
4. Intégrer `ui/premium-16k.js` **après** les scripts existants et publier `ui/premium-16k.css` comme ressource statique. Tester les modes iPhone et ordinateur.
5. Faire un déploiement **parallèle dans un service de préproduction**, sans modifier l'URL ni la base de données du site actuel. Protéger les données en utilisant une base de test indépendante.
6. Comparer les comportements et effectuer une validation explicite avant de changer la source/de mettre la production sur GitHub. Prévoir une option de retour arrière.
7. Si un dépôt **privé** est souhaité, modifier la visibilité du dépôt GitHub dans Settings → General → Danger Zone → Change repository visibility, sous contrôle du propriétaire. La visibilité actuelle est **public** ; elle n'a pas été changée ici.

## Garde-fous

- Ne jamais transférer sur GitHub les valeurs des variables `CMD_FOUNDER_PASSWORD`, `DATABASE_URL`, `CMD_CONTROL_ADMIN_KEY`, `RESEND_API_KEY`, jetons d'agent ou clés marchandes.
- Ne pas déployer de nouvelles versions de `cmd-hosting-mods-api` et `cmd-hosting-cloud-agents` par erreur en appliquant le patch Railway en attente.
- Ne pas déclarer la migration achevée tant que le backend web original n'est pas retrouvé et validé.

## Préparation automatique ajoutée le 17 octobre 2026

- `scripts/recover-hosting-public.mjs` : capture strictement en lecture seule les pages et scripts publics du site, sans identifiants ni appels API.
- `.github/workflows/cmd-hosting-public-recovery.yml` : déclenche une récupération GitHub Actions, stockée **uniquement comme artifact temporaire** pendant sept jours. L'exécution et la réussite doivent encore être vérifiées dans l'onglet Actions.
- `.github/workflows/cmd-hosting-ui-checks.yml` : vérifie le code du thème 16K et les règles de sécurité de la capture, **sans déploiement**.
- Une récupération des fichiers visibles par un navigateur n'est **pas** un export du backend Bun, de la base SQL, des réglages Railway, des comptes ni des scripts privés.

### Dernier élément indispensable

Ouvrir sur Railway le projet **CMD Hosting** → service **cmd-hosting-web** → éditeur de **Function / Code**. Copier/exporter **l'intégralité du code source original** dans un fichier local `index.tsx` ou `index.ts`. Ne **pas** copier les valeurs des variables d'environnement, mots de passe ni clés API. Partager le fichier source original pour contrôle des secrets et import en branche de migration GitHub. Aucun remplacement du service de production avant validation.

Les fonctions Railway stockent leur code via un mécanisme de configuration spécifique ; la lecture par le connecteur actuel renvoie deux caractères invalides pour ce service. Ne jamais les publier comme source et ne jamais déclencher une mise à jour de fonction avec ce résultat.

