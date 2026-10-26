@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
title CMD Hosting - VALHALLA ASTRAEOS
cd /d "%~dp0"
if not exist "ark-valhalla\manager.mjs" (echo Archive incomplete : dossier ark-valhalla absent.&pause&exit /b 1)
where node.exe >nul 2>nul
if errorlevel 1 (echo Installer Node.js 22 LTS depuis https://nodejs.org puis reessayer.&pause&exit /b 1)
:menu
cls
echo ========================================================
echo    CMD HOSTING - CMD VALHALLA ASTRAEOS - 100 SLOTS
echo    ARK SURVIVAL ASCENDED - RP - CROSSPLAY A VALIDER
echo    LOCALE WINDOWS / SANS RAILWAY
echo ========================================================
echo.
echo 1. Installer le vrai serveur ASA officiel (validation PC)
echo 2. Preparer et appliquer Game.ini / GameUserSettings.ini
echo 3. Verifier DLC, mods CurseForge, crossplay et configuration
echo 4. DEMARRER le serveur (refuse si non pret)
echo 5. Lire la notice des 24 mods et des redemarrages
echo 0. Quitter
echo.
set /p ACTION=Choix :
if "%ACTION%"=="1" goto install
if "%ACTION%"=="2" goto prepare
if "%ACTION%"=="3" goto check
if "%ACTION%"=="4" goto run
if "%ACTION%"=="5" goto readme
if "%ACTION%"=="0" exit /b 0
goto menu
:install
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0ark-valhalla\Installer-ARK-Valhalla.ps1"
pause
goto menu
:prepare
node "%~dp0ark-valhalla\manager.mjs" prepare
node "%~dp0ark-valhalla\manager.mjs" apply
pause
goto menu
:check
node "%~dp0ark-valhalla\manager.mjs" check
pause
goto menu
:run
node "%~dp0ark-valhalla\manager.mjs" run
pause
goto menu
:readme
start "" notepad.exe "%~dp0ark-valhalla\README.md"
goto menu
