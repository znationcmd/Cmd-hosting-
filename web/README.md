# CMD Hosting · recovered web interface and premium 16K layer

The files in `public/` were copied from **unauthenticated public assets** of https://cmd-hosting-web-production.up.railway.app on 17 October 2026.

The original public HTML and scripts are preserved unmodified in branch `recovery/cmd-hosting-public-ui-20261017`, under `recovery-public-only/`.

This directory is a separate **visual frontend restoration**:
- The recovered `index.html` now loads `/ui/premium-16k.css` and `/ui/premium-16k.js`.
- Button relief, navigation depth, SVG icons, and responsive premium CSS operate on existing DOM.
- All recovered original JS assets remain at their original root-relative paths.
- It does not contain the Railway Function's **private Bun backend**, SQL database, account data, environment variables, private routes, or payment secrets.
- Nothing in this directory is currently deployed as the production website, and the restored static frontend does **not** implement the authenticated APIs required for hosting features. Do not switch the Railway web service to these files alone.

To preview layout only, serve `web/public/` as a static directory with a local HTTP server. Do not enter real credentials, place orders or attempt to manage real servers in this visual preview.

Missing publicly requested assets at recovery: `customer-onboard-ui.js`, `mod-explorer.js`, `mod-manager.js`, `account-ui.js`, `favicon.ico` (HTTP 404). They are not fabricated.

Next gate for a complete migration: export the exact private Function source from Railway through an authorized means, scan it for embedded secrets, validate its routes against this UI, and only then create a separate test deployment and production cutover.
## Refonte premium 16K prête sur la copie GitHub

La refonte a été étendue aux onze sections de la page récupérée : barre de navigation, menus iPhone, cartes, jeux, serveurs, machines, commandes, compte, formulaires, consoles, sauvegardes et actions. Les boutons de la copie conservent leurs gestionnaires d'événements d'origine ; les icônes ajoutées sont des SVG vectoriels.

La suite de tests `tests/premium-ui.test.mjs` + `tests/restored-web.test.mjs` a passé le contrôle GitHub Actions le 17 octobre 2026. Cela valide la syntaxe et les ressources, **pas** une simulation complète d'achat ni un test manuel iPhone en production.

**Aperçu gratuit :** la construction de l'aperçu GitHub Pages (`web/preview-build.mjs`) a passé les tests, mais l'étape de publication a échoué : GitHub Pages n'est pas activé et l'installation GitHub actuelle ne peut pas le créer ("Resource not accessible by integration"). L'option se trouve dans le dépôt GitHub, Settings → Pages → Build and deployment → Source = GitHub Actions. Ensuite, exécuter manuellement le workflow "CMD Hosting - 16K visual preview" ; il est désactivé sur push pour éviter des échecs répétés. Cet aperçu est statique, annonce clairement que les commandes sont désactivées et bloque les soumissions.

**Production :** ne pas déclarer CMD Hosting visuellement changé sur Railway : `cmd-hosting-web` est toujours une fonction Railway distincte ; son source backend reste inaccessible au connecteur. La copie GitHub n'est **pas** un remplacement opérationnel du backend.

## Dégradé bleu-violet et perspective 3D — 19 octobre 2026

- Nouvelle couche CSS isolée : `web/public/ui/hosting-blue-violet-3d.css` (dégradés bleu → violet, cartes 3D, boutons à reflet et contours lumineux au clic).
- Script ajouté : `web/public/ui/hosting-blue-violet-3d.js` (panneaux inclinables à la souris sur PC, activation volontaire du gyroscope sur iPhone/Android et demande d'autorisation iOS, accès aux appareils photo et micro **non** demandé).
- Le script est chargé **après** le `premium-16k.js` d'origine. Il n'écrase aucun gestionnaire d'événement, aucune donnée et aucune route API ; le fond original de l'interface est préservé.
- Responsive iPhone/Android/PC, réduction des animations via `prefers-reduced-motion`, traitements vectoriels nets à haute résolution (l'écran lui-même ne devient pas physiquement 16K).
- Tests ajoutés dans `tests/premium-ui.test.mjs` et validés par `CMD Hosting - UI and migration safety checks`.

**Déploiement :** ces changements concernent exclusivement le frontend reconstitué et suivi sur GitHub. En production, `cmd-hosting-web` reste une Railway Function Bun distincte, et le connecteur renvoie un code source illisible (deux caractères de remplacement) au 19 octobre. Ne **pas** utiliser `update_function_source_code` avec un fichier de remplacement incomplet, ni basculer le service sur cette copie statique : le backend de location/compte/serveurs serait perdu. La mise en production dépend d'une récupération fiable du vrai code source de la Function et de tests des API sur un environnement de préproduction avant la bascule.
