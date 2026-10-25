@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
title CMD Hosting - 4 Serveurs DayZ PC - Un Seul a La Fois
echo ========================================================
echo CMD HOSTING - 4 MONDES DAYZ, UN SEUL ACTIF A LA FOIS
echo ========================================================
echo.
echo CMD Lux / CMD Namalsk / CMD Deer Isle / CMD Takistan Plus
echo Chacun configure pour 100 slots (capacité réelle à tester).
echo Aucun passage par Railway. Le PC hote doit rester allume.
echo.
where node.exe >nul 2>nul
if errorlevel 1 (
 echo Node.js 22 ou superieur est necessaire sur ce Windows.
 echo https://nodejs.org
 pause
 exit /b 1
)
if not exist "%~dp0manager.mjs" (
 echo Erreur : decompresse le ZIP complet. manager.mjs absent.
 pause
 exit /b 1
)
if not exist "%~dp0manifest.json" (
 echo Erreur : manifest.json introuvable.
 pause
 exit /b 1
)
node.exe "%~dp0manager.mjs" menu
if errorlevel 1 (
 echo.
 echo Lancement interrompu. Corrige les fichiers manquants ci-dessus.
)
pause
