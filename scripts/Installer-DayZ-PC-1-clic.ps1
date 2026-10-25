#requires -version 5.1
<#
 CMD Hosting / DayZ PC — installation personnelle en un clic sur l'ordinateur hote.
 Ne s'execute PAS sur Railway. Ne remplace aucun agent, location ou sauvegarde.
 Code officiel uniquement : Valve SteamCMD / app DayZ 223350 /
 BohemiaInteractive DayZ-Central-Economy (ADPL-SA, usage DayZ non commercial).
#>
[CmdletBinding()]
param(
 [string]$InstallRoot='',
 [switch]$NoStartPrompt
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$base=if([string]::IsNullOrWhiteSpace($InstallRoot)){Join-Path $env:SystemDrive 'CMD-Servers'}else{[IO.Path]::GetFullPath($InstallRoot)}
if($base -notmatch '^[a-zA-Z]:\\' -or $base -match '^[a-zA-Z]:\\$'){throw 'Choisis un disque local et un dossier dedie, jamais sa racine.'}
if($base -match '(?i)^[a-z]:\\(windows|users|program files( \(x86\))?|programdata)(\\|$)'){throw 'Dossier systeme interdit.'}
$dir=Join-Path $base 'cmd-dayz-personnel\dayz'
$steamDir=Join-Path $base 'tools\steamcmd'
$steamExe=Join-Path $steamDir 'steamcmd.exe'
$serverExe=Join-Path $dir 'DayZServer_x64.exe'
$cfg=Join-Path $dir 'serverDZ.cfg'
$mission=Join-Path $dir 'mpmissions\dayzOffline.chernarusplus'
$temp=Join-Path ([IO.Path]::GetTempPath()) ('cmdhosting-dayz-'+[guid]::NewGuid().ToString('N'))
function Say([string]$text){Write-Host ('[CMD Hosting / DayZ] '+$text)}
function Confirm-Install {
 $message='Installer DayZ PC (serveur officiel) dans :'+[Environment]::NewLine+$dir+
 [Environment]::NewLine+[Environment]::NewLine+
 'SteamCMD et la mission Chernarus seront telecharges depuis Valve/Bohemia.'+
 [Environment]::NewLine+'Pas de location payante, pas de suppression des sauvegardes ni des agents.'+
 [Environment]::NewLine+'Respecter les licences et conditions des editeurs. Continuer ?'
 Add-Type -AssemblyName System.Windows.Forms
 return [Windows.Forms.MessageBox]::Show($message,'CMD Hosting — Installer DayZ PC',
   [Windows.Forms.MessageBoxButtons]::YesNo,[Windows.Forms.MessageBoxIcon]::Question) -eq [Windows.Forms.DialogResult]::Yes
}
function Fetch([string]$url,[string]$target){
 if(!$url.StartsWith('https://',[StringComparison]::OrdinalIgnoreCase)){throw 'URL non HTTPS interdite.'}
 [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
 Invoke-WebRequest -Uri $url -OutFile $target -UseBasicParsing -TimeoutSec 240 -MaximumRedirection 4
 if(!(Test-Path -LiteralPath $target -PathType Leaf) -or (Get-Item $target).Length -lt 1000){
  throw 'Telechargement incomplet depuis '+$url
 }
}
if(!(Confirm-Install)){Say 'Annule. Aucune installation lancee.';return}
try{
 foreach($p in @($base,(Join-Path $base 'cmd-dayz-personnel'),$dir,$steamDir)){
  if(Test-Path -LiteralPath $p){
   if(((Get-Item -LiteralPath $p -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0){
    throw ('Lien symbolique/jonction refuse : '+$p)
   }
  }
 }
 $drive=New-Object IO.DriveInfo ($base.Substring(0,1))
 if($drive.AvailableFreeSpace -lt 20GB){throw 'Espace insuffisant : prevoir au moins 20 Go libres pour DayZ et ses mods.'}
 New-Item -ItemType Directory -Force -Path $steamDir,$dir,$temp|Out-Null
 if(!(Test-Path -LiteralPath $steamExe -PathType Leaf)){
  Say 'Telechargement officiel de SteamCMD depuis Valve...'
  $archive=Join-Path $temp 'steamcmd.zip'
  Fetch 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip' $archive
  $unpack=Join-Path $temp 'steamcmd'
  Expand-Archive -LiteralPath $archive -DestinationPath $unpack
  $candidate=Join-Path $unpack 'steamcmd.exe'
  if(!(Test-Path -LiteralPath $candidate)){throw 'steamcmd.exe absent du paquet Valve.'}
  Copy-Item -LiteralPath $candidate -Destination $steamExe
 }
 if(!(Test-Path -LiteralPath $serverExe -PathType Leaf)){
  Say 'Installation du vrai serveur DayZ PC avec SteamCMD (appid 223350)...'
  Say 'Si Steam demande un compte proprietaire, utilise SteamCMD localement sans transmettre tes identifiants.'
  # Windows PowerShell 5.1 : SteamCMD writes diagnostics on stderr even on success.
  # Do not promote a harmless native stderr line into a stopping exception.
  $previousPreference=$ErrorActionPreference
  try {
   $ErrorActionPreference='Continue'
   $output=@(& $steamExe '+@ShutdownOnFailedCommand' '1' '+@NoPromptForPassword' '1' '+force_install_dir' $dir '+login' 'anonymous' '+app_update' '223350' 'validate' '+quit' 2>&1)
   $code=$LASTEXITCODE
  }finally{$ErrorActionPreference=$previousPreference}
  $outText=($output|ForEach-Object{[string]$_}) -join [Environment]::NewLine
  $outText|Write-Host
  if($code -ne 0 -or $outText -notmatch "Success! App '223350' fully installed\."){
   throw 'SteamCMD n a pas valide le telechargement DayZ. Les fichiers partiels sont conserves pour diagnostic.'
  }
 }else{Say 'DayZ existe deja : aucun re-telechargement et aucun ecrasement des fichiers.'}
 if(!(Test-Path -LiteralPath $serverExe -PathType Leaf) -or (Get-Item $serverExe).Length -le 0){
  throw 'Le vrai DayZServer_x64.exe est absent ou vide : serveur non installe.'
 }
 $appmanifest=Join-Path $dir 'steamapps\appmanifest_223350.acf'
 if(!(Test-Path -LiteralPath $appmanifest)){throw 'Manifeste officiel Steam 223350 absent.'}
 $manifestText=Get-Content -LiteralPath $appmanifest -Raw
 if($manifestText -notmatch '"appid"\s+"223350"' -or $manifestText -notmatch '"StateFlags"\s+"4"'){
  throw 'Manifeste Steam non valide : installation non certifiee.'
 }
 $requiredMission=@('init.c','db\types.xml','db\events.xml')
 $needsMission=!(Test-Path -LiteralPath $mission -PathType Container)
 if(!$needsMission){
  foreach($rel in $requiredMission){
   if(!(Test-Path -LiteralPath (Join-Path $mission $rel) -PathType Leaf)){$needsMission=$true;break}
  }
 }
 if($needsMission){
  Say 'Verification des fichiers de la mission Chernarus depuis Bohemia Interactive...'
  $zip=Join-Path $temp 'central-economy.zip'
  Fetch 'https://github.com/BohemiaInteractive/DayZ-Central-Economy/archive/refs/heads/master.zip' $zip
  $extract=Join-Path $temp 'central-economy'
  Expand-Archive -LiteralPath $zip -DestinationPath $extract
  $src=Join-Path $extract 'DayZ-Central-Economy-master\dayzOffline.chernarusplus'
  if(!(Test-Path -LiteralPath (Join-Path $src 'init.c')) -or !(Test-Path -LiteralPath (Join-Path $src 'db\types.xml'))){
   throw 'Fichiers de mission officiels incomplets.'
  }
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $mission)|Out-Null
  if(!(Test-Path -LiteralPath $mission -PathType Container)){
   Copy-Item -LiteralPath $src -Destination $mission -Recurse -ErrorAction Stop
  }else{
   # Repair missing publisher files only. Never overwrite admins' XML or mission scripts.
   $sourceRoot=(Get-Item -LiteralPath $src).FullName
   foreach($file in Get-ChildItem -LiteralPath $src -File -Recurse){
    $rel=$file.FullName.Substring($sourceRoot.Length).TrimStart([char]92)
    $dest=Join-Path $mission $rel
    if(Test-Path -LiteralPath $dest){continue}
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dest)|Out-Null
    Copy-Item -LiteralPath $file.FullName -Destination $dest
   }
  }
 }else{Say 'Mission existante conservee (aucun ecrasement).'}
 foreach($file in @('init.c','db\types.xml','db\events.xml')){
  if(!(Test-Path -LiteralPath (Join-Path $mission $file) -PathType Leaf)){throw ('Mission incomplete : '+$file)}
 }
 if(!(Test-Path -LiteralPath $cfg -PathType Leaf)){
 $serverConfig=@'
hostname = "CMD Hosting - DayZ PC";
password = "";
passwordAdmin = "";
maxPlayers = 20;
verifySignatures = 2;
forceSameBuild = 1;
disableVoN = 0;
vonCodecQuality = 20;
disable3rdPerson = 0;
serverTime = "SystemTime";
serverTimeAcceleration = 12;
serverNightTimeAcceleration = 4;
serverTimePersistent = 0;
guaranteedUpdates = 1;
loginQueueConcurrentPlayers = 5;
loginQueueMaxPlayers = 500;
instanceId = 1;
storageAutoFix = 1;
class Missions
{
 class DayZ
 {
  template = "dayzOffline.chernarusplus";
 };
};
'@
 [IO.File]::WriteAllText($cfg,$serverConfig+"\r\n",([Text.UTF8Encoding]::new($false)))
 }else{Say 'serverDZ.cfg existant conserve : aucun ecrasement.'}
 $launch=Join-Path $dir 'Demarrer-DayZ-CMD-Hosting.cmd'
 if(!(Test-Path -LiteralPath $launch)){
  $bat=@'
@echo off
title CMD Hosting - DayZ PC - Chernarus
cd /d "%~dp0"
if not exist "DayZServer_x64.exe" (echo DayZ non installe&pause&exit /b 1)
if not exist "serverDZ.cfg" (echo Fichier de configuration absent&pause&exit /b 1)
DayZServer_x64.exe -config=serverDZ.cfg -port=2302 -profiles=profiles -dologs -adminlog -netlog -freezecheck
pause
'@
  [IO.File]::WriteAllText($launch,$bat+"\r\n",([Text.Encoding]::ASCII))
 }
 $files=@(Get-ChildItem -LiteralPath $dir -Recurse -File -ErrorAction Stop)
 $receipt=[ordered]@{schema='cmd-hosting/dayz-personal-v1';appId='223350';
   state='files-verified-not-network-tested';root=$dir;map='dayzOffline.chernarusplus';
   executableVerified=$true;missionVerified=$true;configurationVerified=$true;
   fileCount=$files.Count;totalBytes=($files|Measure-Object -Property Length -Sum).Sum;
   verifiedAt=(Get-Date).ToUniversalTime().ToString('o');publiclyReachable=$false}
 $report=Join-Path $dir 'cmdhosting-personal-install-report.json'
 if(!(Test-Path -LiteralPath $report)){
  [IO.File]::WriteAllText($report,(ConvertTo-Json -InputObject $receipt -Depth 8),([Text.UTF8Encoding]::new($false)))
 }
 Say ('Fichiers DayZ reels installes : '+$files.Count)
 Say ('Dossier : '+$dir)
 Say ('Lancement : '+$launch)
 Say 'Pour jouer depuis Internet, ouvrir/transferer les ports UDP requis sur le routeur et le pare-feu.'
 Say 'Le PC doit rester allume; CMD Hosting ne peut pas heberger la partie dans son simple site web.'
 if(!$NoStartPrompt){
  $ans=[Windows.Forms.MessageBox]::Show('DayZ installe et fichiers verifies. Lancer maintenant le serveur sur CET ordinateur ?',
   'CMD Hosting - DayZ',[Windows.Forms.MessageBoxButtons]::YesNo,[Windows.Forms.MessageBoxIcon]::Question)
  if($ans -eq [Windows.Forms.DialogResult]::Yes){
   Start-Process -FilePath 'cmd.exe' -ArgumentList '/k',('""'+$launch+'""') -WorkingDirectory $dir
   Say 'Démarrage demandé : verifie les logs et la connexion en jeu.'
  }
 }
}finally{
 if(Test-Path -LiteralPath $temp){Remove-Item -LiteralPath $temp -Force -Recurse -ErrorAction SilentlyContinue}
}
