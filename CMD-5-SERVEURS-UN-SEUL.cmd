@echo off
setlocal EnableExtensions
chcp 65001 >nul
title CMD HOSTING - 5 SERVEURS - UN SEUL A LA FOIS
echo [CMD Hosting] Recherche des mises a jour automatiques officielles...
if exist "%~dp0local-panel\updater.mjs" (
 where node.exe >nul 2>nul
 if not errorlevel 1 node.exe "%~dp0local-panel\updater.mjs" auto
)

:menu
cls
echo =================================================
echo    CMD HOSTING - SERVEURS WINDOWS SANS RAILWAY
echo =================================================
echo.
echo  DAYZ (100 slots chacun, demarrage exclusif)
echo   1. CMD Lux
echo   2. CMD Namalsk
echo   3. CMD Deer Isle
echo   4. CMD Takistan Plus
echo.
echo  ARK SURVIVAL ASCENDED (100 slots)
echo   5. CMD Valhalla Extinction Astraeos
echo.
echo   6. Gerer les mods et cartes DayZ
echo   7. Gerer ARK / verifier ses fichiers
echo   0. Quitter
echo.
set /p PICK=Choix :
if "%PICK%"=="0" exit /b 0
if "%PICK%"=="1" set "ID=cmd-lux"&goto dayz
if "%PICK%"=="2" set "ID=cmd-namalsk"&goto dayz
if "%PICK%"=="3" set "ID=cmd-deer-isle"&goto dayz
if "%PICK%"=="4" set "ID=cmd-takistan-plus"&goto dayz
if "%PICK%"=="5" goto asa
if "%PICK%"=="6" (
 node.exe "%~dp0dayz-worlds\manager.mjs" menu
 pause
 goto menu
)
if "%PICK%"=="7" goto asa
goto menu
:dayz
if not exist "%~dp0dayz-worlds\manager.mjs" (echo Dossier dayz-worlds absent!&pause&goto menu)
node.exe "%~dp0dayz-worlds\manager.mjs" start %ID%
pause
goto menu
:asa
if not exist "%~dp0asa-astraeos\CMD-VALHALLA-ASTRAEOS.cmd" (echo Dossier asa-astraeos absent!&pause&goto menu)
call "%~dp0asa-astraeos\CMD-VALHALLA-ASTRAEOS.cmd"
pause
goto menu
