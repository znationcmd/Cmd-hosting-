@echo off
chcp 65001 >nul
setlocal
title CMD Hosting - Mise a jour Agent Mods V4
set "UPDATER=%TEMP%\CMD-Hosting-Update-Agent-V4.ps1"
echo CMD Hosting - mise a jour sans supprimer les serveurs
echo.
echo Telechargement de l'outil de mise a jour officiel...
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 40 -Uri 'https://raw.githubusercontent.com/znationcmd/Cmd-hosting-/77771cea969189d9ed3b4fd20b9df988c9703885/scripts/Update-CMDModsAgentV4.ps1' -OutFile '%UPDATER%'; exit 0 } catch { Write-Host $_.Exception.Message; exit 1 }"
if errorlevel 1 (
 echo Telechargement impossible. Aucune modification appliquee.
 pause
 exit /b 1
)
echo.
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%UPDATER%"
if errorlevel 1 (
 echo Echec de la mise a jour. Consulte les details ci-dessus.
 pause
 exit /b 1
)
echo.
echo Mise a jour terminee : garde cette fenetre pour consulter le diagnostic.
pause
