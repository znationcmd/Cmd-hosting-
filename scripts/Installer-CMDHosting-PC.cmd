@echo off
setlocal EnableExtensions
title CMD Hosting - Agent serveur Windows
set "CMD_WORKER_URL=https://raw.githubusercontent.com/znationcmd/Cmd-hosting-/39c453f204c1a2547905fec0355eef309018e5bb/scripts/CMDHostingRentalWorkerV2.ps1"
set "CMD_WORKER_FILE=%TEMP%\CMDHostingRentalWorkerV2-verified.ps1"
echo.
echo ==========================================
echo   CMD HOSTING - PC SERVEUR
echo ==========================================
echo.
echo Chargement du worker depuis une revision GitHub fixe...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; Invoke-WebRequest -UseBasicParsing -Uri $env:CMD_WORKER_URL -OutFile $env:CMD_WORKER_FILE -TimeoutSec 35; $p=$env:CMD_WORKER_FILE; $s=[IO.File]::ReadAllText($p); if($s.Length -lt 18000 -or !$s.Contains('CMD Hosting Windows Rental Worker V2') -or !$s.Contains('Worker pret a traiter une commande autorisee')){throw 'Fichier worker inattendu ou incomplet'}"
if errorlevel 1 (
 echo.
 echo ERREUR: telechargement ou verification impossible. Aucun serveur modifie.
 pause
 exit /b 1
)
:MENU
echo.
echo 1 - Diagnostiquer la liaison PC et CMD Hosting (sans modification)
echo 2 - Installer le worker de serveurs (association et conditions editeur requises)
echo 3 - Executer une verification des taches autorisees une seule fois
echo 4 - Quitter
choice /c 1234 /n /m "Selection [1-4] : "
if errorlevel 4 exit /b 0
if errorlevel 3 goto ONCE
if errorlevel 2 goto INSTALL
if errorlevel 1 goto DIAGNOSE
:DIAGNOSE
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%CMD_WORKER_FILE%" -Diagnose
echo.
pause
goto MENU
:INSTALL
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%CMD_WORKER_FILE%" -Install
echo.
echo L'installation ne supprime aucun serveur existant.
pause
goto MENU
:ONCE
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%CMD_WORKER_FILE%" -Once
echo.
pause
goto MENU
