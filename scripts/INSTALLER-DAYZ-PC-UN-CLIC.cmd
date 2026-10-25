@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
title CMD Hosting - Installer DayZ PC
set "SCRIPT=%~dp0Installer-DayZ-PC-1-clic.ps1"
if not exist "%SCRIPT%" (
 echo Recuperation de l'installateur DayZ depuis le depot CMD Hosting...
 set "SCRIPT=%TEMP%\CMDHosting-Installer-DayZ-PC.ps1"
 powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -UseBasicParsing -Uri 'https://raw.githubusercontent.com/znationcmd/Cmd-hosting-/main/scripts/Installer-DayZ-PC-1-clic.ps1' -TimeoutSec 40 -OutFile '%TEMP%\CMDHosting-Installer-DayZ-PC.ps1'; exit 0 } catch { Write-Host $_.Exception.Message; exit 1 }"
 if errorlevel 1 (echo ECHEC du telechargement de l'installateur.&pause&exit /b 1)
)
echo.
echo CMD HOSTING - INSTALLATION DU SERVEUR DAYZ PC SUR CETTE MACHINE
echo.
echo Source officielle Valve SteamCMD et missions officielles Bohemia.
echo Aucune location, sauvegarde ou autre jeu existant ne sera supprime.
echo Les fichiers seront sur CET ordinateur, qui devra rester allume pour heberger.
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%"
if errorlevel 1 (echo ERREUR : consulte le message ci-dessus.&pause&exit /b 1)
echo.
echo Installation ou verification terminee. Consulter C:\CMD-Servers\cmd-dayz-personnel\dayz.
pause
