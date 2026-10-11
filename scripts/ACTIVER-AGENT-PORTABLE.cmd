@echo off
setlocal
chcp 65001 >nul
title CMD Hosting - Agent compatible toutes machines
echo.
echo ===== CMD HOSTING - AGENT PORTABLE =====
echo Les agents deja installes sur cet ordinateur ne seront pas modifies.
echo Seule une supervision independante sera ajoutee apres un test de connexion.
echo.
set "SCRIPT=%TEMP%\Installer-CMDHostingPortable.ps1"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 40 -Uri 'https://raw.githubusercontent.com/znationcmd/Cmd-hosting-/aefa6ed765fdd5db13a00141920821699493e726/scripts/Installer-CMDHostingPortable.ps1' -OutFile '%TEMP%\Installer-CMDHostingPortable.ps1'; exit 0 } catch { Write-Host $_.Exception.Message; exit 1 }"
if errorlevel 1 (
 echo Impossible de recuperer le script officiel depuis GitHub. Aucun agent modifie.
 pause
 exit /b 1
)
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" -Install
if errorlevel 1 (
 echo Installation de l'agent portable non activee. Agents V5/Mods inchanges.
 pause
 exit /b 1
)
echo.
echo L'agent portable est actif: une verification toutes les 10 minutes.
echo Aucun jeu, carte, mod ou serveur existant n'a ete modifie.
pause
