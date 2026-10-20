# CMD Hosting — Oracle Cloud Always Free et ANOMALIA UE 5.8

## État du raccordement

**Préparation du code GitHub uniquement : aucune machine Oracle créée ou reliée.**
Le dépôt ne contient toujours pas le backend complet de cmd-hosting-web en production sur Railway.
ANOMALIA reste pré-alpha / pas encore proposée à la location dans CMD Hosting.

Le registre de fournisseurs existant reconnaît déjà Oracle (provider-adapters.mjs).
Ce lot ajoute le contrôle offline oracle-free-anomalia.mjs, déclenché pour ANOMALIA
via providerPlan. Ses résultats ne prouvent pas l'existence ou la bonne santé d'une VM.
Les faits devront venir d'un agent de machine authentifié et des quotas OCI ;
jamais d'une simple valeur déclarée dans un formulaire utilisateur.

## Limites 2026

La documentation Oracle Free Tier pour les tenancies gratuites indique maintenant
**2 OCPU ARM et 12 Go de RAM au total**, soit 1 500 OCPU-heures et 9 000 Go-heures.
Les anciens tutoriels annonçant 4 OCPU/24 Go ne sont plus fiables pour un nouveau
compte Always Free. Vérifier les ressources et tarifs visibles sur sa propre console.

- 200 Go de stockage bloc Always Free partagés avec les volumes système.
- Forme Ampere A1 = Linux ARM64. Une instance A1 n'exécute pas nativement un jeu Windows x64.
- Disponibilité non garantie dans la région d'origine ; reprise possible des VM inactives.
- Inscription avec vérification bancaire fréquente ; ne pas divulguer les identifiants OCI
  ni activer un compte payant pour contourner un manque de capacité sans le vouloir.

Sources Oracle :
https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
https://docs.oracle.com/iaas/Content/FreeTier/freetier.htm

## ANOMALIA et Unreal Engine

Il faut un vrai exécutable serveur dédié ANOMALIA adapté à Linux ARM64,
les assets cuits pour cette plateforme et des tests réels multijoueurs.
Un projet .uproject et un build Windows UE 5.8 ne garantissent rien sur l'ARM A1.
Le portage des plugins, la compilation et les performances restent non vérifiés.
Une VM gratuite ne peut pas être déclarée suffisante pour 15 serveurs de jeu.

## Intégration progressive et non destructive dans CMD Hosting

1. Compte OCI, région d'origine, disponibilité de la forme Always Free, quotas et coût
   potentiel contrôlés dans la console par le propriétaire (aucun secret dans GitHub).
2. Création volontaire d'une VM Linux ARM64 restant dans la limite du compte.
3. Diagnostic lecture seule avec Node >=20 et l'agent portable existant.
4. Appairage via procédure d'enrôlement sécurisée CMD Hosting existante.
5. Compilation et test du serveur dédié ANOMALIA Linux ARM64, puis tests de
   charge, mémoire, persistance, ports, sauvegardes et autorisations.
6. Seulement après validation, ajouter le pilotage sécurisé des serveurs et la
   réservation de capacité dans le backend original Railway : **pas encore fait**.

Les réservations clientes, les serveurs existants, les paiements et autres jeux
ne sont pas modifiés par les vérifications ajoutées.
