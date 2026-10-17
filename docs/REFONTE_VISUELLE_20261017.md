# Refonte complète — 17 octobre 2026

Cette passe remplace le thème préparé par un système cohérent : navigation latérale sur ordinateur, menu mobile, surfaces en relief, boutons primaire/secondaire/succès/danger/avertissement/désactivé, formulaires natifs, tableaux défilants, console, modales, cartes jeux/serveurs/machines et panneaux de compte.

Corrections : cases à cocher exclues des grands champs, champs mobiles à 16 px, statuts en ligne/hors ligne distingués sans inventer d'état, suppression des symboles devant les nouvelles icônes SVG, état accessible du menu synchronisé, tableaux défilants au clavier. Les boutons et leurs gestionnaires existants sont conservés. Aucun appel API ni changement serveur ajouté au thème.

Couverture : 11 sections existantes dans la copie publique. Les vues de gestion insérées par les scripts héritent des composants globaux ; leur fonctionnement authentifié ne peut pas être validé avec la copie publique. Aucune nouvelle route métier ni fonctionnalité manquante n'est simulée.

Validation locale : 12 contrôles de syntaxe, ressources et contrats existants réussis. Le navigateur Chromium local n'est pas disponible et son téléchargement échoue. Un workflow séparé exécute les vérifications de navigation aux largeurs 390, 768 et 1440 px, les captures et les contrôles de préservation des boutons ; son résultat doit être consulté avant de déclarer le rendu validé.

Production mise à jour le 17 octobre 2026 sans nouvelle connexion au compte : le thème est intégré aux variables des scripts publics existants. La fonction serveur n'a pas été remplacée. Aucune prétention de résolution 16K native : CSS et SVG sont indépendants de la résolution ; les jaquettes existantes conservent leur qualité source.

## Publication Railway

Déploiement final `9371d070-6268-4827-ae53-bbaf8254f715` : SUCCESS, démarrage du serveur vérifié dans les journaux et trois scripts publics téléchargés et comparés exactement aux valeurs préparées. Rendu noir/violet et relief vérifié sur le site publié dans le navigateur.

Le script `scripts/build-railway-ui.py` produit les trois valeurs publiques, chacune sous la limite de 32768 caractères. Les valeurs précédentes ont été sauvegardées dans Railway avec le suffixe `_BACKUP_20261017`. Aucun secret n'est inclus dans ces fichiers.

Incident résolu pendant la publication : le déploiement automatique des variables a renvoyé 502 avec `Module not found index.tsx`, malgré le statut SUCCESS. Les variables ont été restaurées et le déploiement fonctionnel précédent relancé avec succès. Pour la publication finale, les nouvelles variables ont été définies avec `skipDeploys: true`, puis le build fonctionnel `e80757f2-b886-44f2-9e4c-8829f8c494e2` a été redéployé. Cette méthode a conservé le démarrage de la Function. Ne pas utiliser un déploiement automatique depuis la configuration courante sans résoudre son override de démarrage. Le code complet de la Function reste illisible via le connecteur ; ne pas le remplacer par cette copie statique.

## Validation navigateur réalisée

Workflow 39001362143 : SUCCESS. 48 parcours (16 pages × 390/768/1440 px) ; contrôle du menu mobile complètement fermé, navigation et absence de débordement horizontal. Boutons désactivés conservés, événement de clic préservé, statut mis à jour et case à cocher correctement dimensionnée. Captures ordinateur et mobile inspectées. Les API sont simulées non connectées ; cette validation ne couvre pas les opérations métier réelles. Les derniers ajustements des pictogrammes passent les 12 contrôles locaux.
