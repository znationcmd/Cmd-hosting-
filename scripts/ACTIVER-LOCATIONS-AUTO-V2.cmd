@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
title CMD Hosting - Agent automatique de locations V2
echo.
echo CMD HOSTING - INSTALLATIONS AUTOMATIQUES POUR LES FUTURES LOCATIONS PC
echo.
echo Les agents V5 et Mods existants restent en place, aucune reinitalisation.
echo Ce nouvel agent se connecte avec son propre acces, jamais le jeton principal.
echo Il ne fonctionnera qu'apres une association a usage unique et autorisation proprietaire.
echo.
set "WORKER=%TEMP%\CMDHostingRentalWorkerV2.ps1"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 60 -Uri 'https://raw.githubusercontent.com/znationcmd/Cmd-hosting-/e2447637625b2dc7616acc0400c679a08886ee83/scripts/CMDHostingRentalWorkerV2.ps1' -OutFile '%TEMP%\CMDHostingRentalWorkerV2.ps1'; exit 0 } catch { exit 1 }"
if errorlevel 1 (
 echo Le programme officiel ne peut pas etre telecharge. Aucune tache ajoutee.
 pause
 exit /b 1
)
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%WORKER%" -Install
if errorlevel 1 (
 echo Activation non terminee. Les anciens agents et jeux restent inchanges.
 pause
 exit /b 1
)
echo.
echo Agent V2 installe. Il faut encore autoriser son identifiant de machine
echo depuis la gestion CMD Hosting avant de recevoir des installations payantes.
echo Aucun serveur existant n'a ete modifie.
pause
