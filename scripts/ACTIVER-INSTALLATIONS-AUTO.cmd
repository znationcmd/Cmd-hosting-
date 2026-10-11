@echo off
setlocal
chcp 65001 >nul
title CMD Hosting - Activer installation automatique des locations PC
set "WORKER=%~dp0CMDHostingRentalWorker.ps1"
echo.
echo ===== CMD HOSTING : LOCATIONS PC AUTOMATIQUES =====
echo.
echo Vous ne devez pas taper de commandes PowerShell.
echo L'agent principal V5 et l'agent Mods existants ne seront pas modifies.
echo Cette activation ne concerne que les locations PC payees et verifiees.
echo Une approbation des conditions des editeurs sera demandee une seule fois.
echo.
if not exist "%WORKER%" (
 echo ERREUR : placer ce fichier a cote de CMDHostingRentalWorker.ps1.
 pause
 exit /b 1
)
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%WORKER%" -Install
if errorlevel 1 (
 echo.
 echo Activation non effectuee. Aucun serveur existant n'a ete modifie.
 pause
 exit /b 1
)
echo.
echo Tache CMDHostingRentalWorker creee pour Windows.
echo Desormais, a l'ouverture de session et toutes les 10 minutes,
echo le programme cherchera uniquement les locations PC payees et valides.
echo.
echo Attention : la carte, les mods et le demarrage du jeu demandent
echo encore leurs propres verifications avant la mise en service.
pause
