@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
title CMD Hosting - MES SERVEURS - FICHIERS REELS
echo.
echo =========================================================
echo         CMD HOSTING - MES SERVEURS ET FICHIERS
echo =========================================================
echo.
echo Lecture DIRECTE de C:\CMD-Servers - AUCUN PASSAGE PAR RAILWAY
echo.
where node.exe >nul 2>nul
if errorlevel 1 (
 echo Node.js 22 ou plus recent est necessaire sur l ordinateur hote.
 echo Installer Node.js LTS depuis https://nodejs.org puis relancer.
 pause
 exit /b 1
)
if not exist "%~dp0local-panel\server.mjs" (
 echo ERREUR : decompresser TOUTE l'archive et garder le dossier local-panel.
 pause
 exit /b 1
)
set "CMD_SERVERS_ROOT=C:\CMD-Servers"
echo [CMD Hosting] Recherche des mises a jour automatiques officielles...
if exist "%~dp0local-panel\updater.mjs" (
 where node.exe >nul 2>nul
 if not errorlevel 1 node.exe "%~dp0local-panel\updater.mjs" auto
)

echo Choisir un mode :
echo [1] PC uniquement - recommande
echo [2] Reseau prive local Wi-Fi - pour ouvrir depuis un telephone sur le MEME reseau
echo.
set /p MODE=Mode [1] :
if "%MODE%"=="2" (
 echo.
 echo ATTENTION : connexion HTTP locale non chiffree. Ne JAMAIS rediriger le port depuis Internet.
 echo Utiliser uniquement un reseau Wi-Fi prive de confiance.
 set "CMD_FILES_LISTEN_HOST=0.0.0.0"
) else (
 set "CMD_FILES_LISTEN_HOST=127.0.0.1"
)
set "CMD_FILES_PORT=8788"
echo.
echo Les installations peuvent etre dans C:\CMD-Servers\identifiant\nom-du-jeu.
echo Pour associer un autre jeu, utiliser "Associer un serveur existant" dans le panneau.
echo.
echo La CLE ADMINISTRATEUR sera affichee ci-dessous : ne la communique a personne.
echo Le programme doit RESTER OUVERT pour que le panneau fonctionne.
echo.
if "%MODE%"=="2" (
 echo Adresse du panneau : http://ADRESSE-IP-LOCALE-DU-PC:8788
 echo Cette adresse n'est accessible que depuis ton reseau prive et si le pare-feu l'autorise.
) else (
 start "" "http://127.0.0.1:8788"
)
node.exe "%~dp0local-panel\server.mjs"
if errorlevel 1 (
 echo.
 echo ECHEC de l'interface. Lire le message ci-dessus.
 pause
 exit /b 1
)
pause
