# Refonte complète — 17 octobre 2026

Cette passe remplace le thème préparé par un système cohérent : navigation latérale sur ordinateur, menu mobile, surfaces en relief, boutons primaire/secondaire/succès/danger/avertissement/désactivé, formulaires natifs, tableaux défilants, console, modales, cartes jeux/serveurs/machines et panneaux de compte.

Corrections : cases à cocher exclues des grands champs, champs mobiles à 16 px, statuts en ligne/hors ligne distingués sans inventer d'état, suppression des symboles devant les nouvelles icônes SVG, état accessible du menu synchronisé, tableaux défilants au clavier. Les boutons et leurs gestionnaires existants sont conservés. Aucun appel API ni changement serveur ajouté au thème.

Couverture : 11 sections existantes dans la copie publique. Les vues de gestion insérées par les scripts héritent des composants globaux ; leur fonctionnement authentifié ne peut pas être validé avec la copie publique. Aucune nouvelle route métier ni fonctionnalité manquante n'est simulée.

Validation locale : 12 contrôles de syntaxe, ressources et contrats existants réussis. Le navigateur Chromium local n'est pas disponible et son téléchargement échoue. Un workflow séparé exécute les vérifications de navigation aux largeurs 390, 768 et 1440 px, les captures et les contrôles de préservation des boutons ; son résultat doit être consulté avant de déclarer le rendu validé.

Production inchangée : le connecteur Railway renvoie toujours `��` pour la fonction web. Le code original intégral doit être récupéré pour intégrer ce thème au serveur réel. Ne pas remplacer le service par la copie statique : elle ne contient pas les API privées, l'authentification ni la gestion métier. Aucune prétention de résolution 16K native : CSS et SVG sont indépendants de la résolution ; les jaquettes existantes conservent leur qualité source.

## Validation navigateur réalisée

Workflow 39001362143 : SUCCESS. 48 parcours (16 pages × 390/768/1440 px) ; contrôle du menu mobile complètement fermé, navigation et absence de débordement horizontal. Boutons désactivés conservés, événement de clic préservé, statut mis à jour et case à cocher correctement dimensionnée. Captures ordinateur et mobile inspectées. Les API sont simulées non connectées ; cette validation ne couvre pas les opérations métier réelles. Les derniers ajustements des pictogrammes passent les 12 contrôles locaux.
