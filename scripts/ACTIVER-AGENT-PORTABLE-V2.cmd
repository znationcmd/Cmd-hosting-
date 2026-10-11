@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
title CMD Hosting - Agent portable V2
echo.
echo CMD Hosting - Detection automatique des futures machines Windows
echo.
echo Aucun agent V5 ou agent Mods existant ne sera remplace.
echo La premiere installation necessite un code d'association confidentiel.
echo Ensuite, le systeme controle les caracteristiques de la machine
echo et synchronise Railway toutes les 10 minutes.
echo.
set "INSTALLER=%TEMP%\Installer-CMDHostingPortableV2.ps1"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 60 -Uri 'https://raw.githubusercontent.com/znationcmd/Cmd-hosting-/44078a18b854a56c23cb1015de6387560ff7cff0/scripts/Installer-CMDHostingPortableV2.ps1' -OutFile '%TEMP%\Installer-CMDHostingPortableV2.ps1'; exit 0 } catch { exit 1 }"
if errorlevel 1 (
 echo Telechargement impossible. Aucune tache Windows ajoutee.
 pause
 exit /b 1
)
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%INSTALLER%" -Install
if errorlevel 1 (
 echo Installation non validee. Les agents actuels n'ont pas ete modifies.
 pause
 exit /b 1
)
echo.
echo Agent Portable V2 active sur CETTE machine.
echo Il n'installe pas encore de jeux; les locations ont leur agent separe.
pause
