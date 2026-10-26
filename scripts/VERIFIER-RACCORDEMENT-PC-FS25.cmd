@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
title CMD Hosting - Diagnostic PC et FS25
echo.
echo Diagnostic en lecture seule : agents, association au compte, mods FS25.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0DIAGNOSTIC-CONNEXION-PC-FS25.ps1"
echo.
echo Sur le navigateur PC : CMD Hosting ^> Mes machines ^> Associer PC.
echo Utilise le meme compte CMD Hosting sur iPhone.
pause
