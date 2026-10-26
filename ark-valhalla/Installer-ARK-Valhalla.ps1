#requires -version 5.1
<#
 CMD Hosting / CMD Valhalla Astraeos: official Windows ASA dedicated server installer.
 No Railway, no hidden payments, no deletion or overwrite of an existing installation.
 Requires local publisher approval before any download.
#>
[CmdletBinding()]
param([string]$InstallRoot='')
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
Add-Type -AssemblyName System.Windows.Forms
$base=if($InstallRoot){[IO.Path]::GetFullPath($InstallRoot)}else{Join-Path $env:SystemDrive 'CMD-Servers'}
$script=Join-Path $PSScriptRoot 'Install-CMDGameServer.ps1'
if(!(Test-Path -LiteralPath $script)){throw 'Composant Install-CMDGameServer.ps1 absent. Extraire TOUTE l archive CMD Hosting.'}
if($base -notmatch '^[A-Za-z]:\\' -or $base -match '^[A-Za-z]:\\$'){throw 'Dossier local invalide.'}
$steamDir=Join-Path $base 'tools\steamcmd'
$steamExe=Join-Path $steamDir 'steamcmd.exe'
$target=Join-Path $base 'CMD-Valhalla-Astraeos\ark-asa'
$exe=Join-Path $target 'ShooterGame\Binaries\Win64\ArkAscendedServer.exe'
function Say([string]$s){Write-Host ('[CMD Hosting - ARK Valhalla] '+$s)}
$question='Installer le serveur officiel ARK Survival Ascended (Steam App 2430930) dans '+$target+' ?'+
 [Environment]::NewLine+'Carte demandee : ASTRAEOS (DLC payant existant — AUCUN achat automatique).'+
 [Environment]::NewLine+'Espace disque recommande : minimum 120 Go libres. Mods telecharges par le jeu apres verification des droits.'+
 [Environment]::NewLine+'Acceptez les conditions du distributeur avant de continuer. Ne pas supprimer les sauvegardes.'+
 [Environment]::NewLine+'Confirmer le telechargement officiel depuis Steam ?'
$answer=[Windows.Forms.MessageBox]::Show($question,'CMD Hosting — CMD Valhalla Astraeos',[Windows.Forms.MessageBoxButtons]::YesNo,[Windows.Forms.MessageBoxIcon]::Question)
if($answer -ne [Windows.Forms.DialogResult]::Yes){Say 'Installation annulee sans modification.';return}
if(Test-Path -LiteralPath $exe){
 Say 'ARK existe deja. Aucune reinstallation ni ecrasement. Configure et verifie avec le menu CMD Valhalla.'
 return
}
$temp=Join-Path ([IO.Path]::GetTempPath()) ('CMDHosting-ArkSteam-'+[guid]::NewGuid().ToString('N'))
try{
 if(!(Test-Path -LiteralPath $steamExe)){
  New-Item -ItemType Directory -Force -Path $steamDir,$temp|Out-Null
  Say 'Recuperation du SteamCMD OFFICIEL Valve.'
  [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
  $zip=Join-Path $temp 'steamcmd.zip'
  Invoke-WebRequest -Uri 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip' -OutFile $zip -UseBasicParsing -TimeoutSec 240
  if((Get-Item $zip).Length -lt 1000){throw 'Paquet Valve incomplet.'}
  $unpack=Join-Path $temp 'unzipped'
  Expand-Archive -LiteralPath $zip -DestinationPath $unpack
  $source=Join-Path $unpack 'steamcmd.exe'
  if(!(Test-Path -LiteralPath $source)){throw 'steamcmd.exe absent de la distribution Valve.'}
  Copy-Item -LiteralPath $source -Destination $steamExe
 }
 Say 'Installation officielle : attente SteamCMD. Aucun compte ni licence achetes automatiquement.'
 & $script -Game 'ARK Ascended' -ServerId 'CMD-Valhalla-Astraeos' -InstallRoot $base -SteamCmdPath $steamExe -Install -AcceptPublisherTerms
 if($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null){throw 'SteamCMD a retourne une erreur.'}
 if(!(Test-Path -LiteralPath $exe)){throw 'Fichier officiel ArkAscendedServer.exe absent apres SteamCMD.'}
 Say 'Binaire trouve : '+$exe
 Say 'Prochaines etapes : lancer le menu CMD Valhalla, preparer la configuration, verifier la carte et les mods.'
 Say 'Aucun serveur n est demarre automatiquement.'
}finally{
 if(Test-Path -LiteralPath $temp){Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue}
}
