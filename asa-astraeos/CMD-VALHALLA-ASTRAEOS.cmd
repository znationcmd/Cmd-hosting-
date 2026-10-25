@echo off
setlocal
title CMD Hosting - Valhalla Extinction Astraeos
if not exist "%~dp0Start-CMD-Valhalla.ps1" (echo Le dossier asa-astraeos est incomplet.&pause&exit /b 1)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-CMD-Valhalla.ps1"
if errorlevel 1 pause
