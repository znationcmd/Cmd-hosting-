#requires -version 5.1
# CMD Hosting — inventaire LOCAL en lecture seule des vraies installations de serveurs PC.
# Aucune modification, aucune commande distante, aucun secret et aucun fichier fictif.
[CmdletBinding()]
param([string]$InstallRoot='', [string]$Output='')
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$base=if($InstallRoot){[IO.Path]::GetFullPath($InstallRoot)}else{Join-Path $env:SystemDrive 'CMD-Servers'}
if($base -notmatch '^[a-zA-Z]:\\' -or $base -match '^[a-zA-Z]:\\$'){throw 'Dossier de serveurs invalide.'}
$profiles=@(
 @{slug='dayz';title='DayZ PC';exe='DayZServer_x64.exe';configs=@('serverDZ.cfg','mpmissions\dayzOffline.chernarusplus\init.c','mpmissions\dayzOffline.chernarusplus\db\types.xml','mpmissions\dayzOffline.chernarusplus\db\events.xml')},
 @{slug='ark-asa';title='ARK Survival Ascended';exe='ShooterGame\Binaries\Win64\ArkAscendedServer.exe';configs=@('ShooterGame\Saved\Config\WindowsServer\Game.ini','ShooterGame\Saved\Config\WindowsServer\GameUserSettings.ini')},
 @{slug='ark-ase';title='ARK Survival Evolved';exe='ShooterGame\Binaries\Win64\ShooterGameServer.exe';configs=@('ShooterGame\Saved\Config\WindowsServer\Game.ini','ShooterGame\Saved\Config\WindowsServer\GameUserSettings.ini')},
 @{slug='arma-reforger';title='Arma Reforger';exe='ArmaReforgerServer.exe';configs=@('config.json')},
 @{slug='arma-3';title='Arma 3';exe='arma3server_x64.exe';configs=@('server.cfg','basic.cfg')},
 @{slug='7dtd';title='7 Days to Die';exe='7DaysToDieServer.exe';configs=@('serverconfig.xml')},
 @{slug='palworld';title='Palworld';exe='PalServer.exe';configs=@('Pal\Saved\Config\WindowsServer\PalWorldSettings.ini')}
)
$inventory=@()
if(Test-Path -LiteralPath $base -PathType Container){
 $candidates=@()
 $personal=Join-Path $base 'cmd-dayz-personnel\dayz'
 if(Test-Path -LiteralPath $personal -PathType Container){$candidates+=@{id='cmd-dayz-personnel';slug='dayz';root=$personal}}
 foreach($dir in Get-ChildItem -LiteralPath $base -Directory){
  if($dir.Name -notmatch '^[a-zA-Z0-9_-]{3,63}$'){continue}
  foreach($p in $profiles){
   $candidate=Join-Path $dir.FullName $p.slug
   if(Test-Path -LiteralPath $candidate -PathType Container){
    $candidates+=@{id=$dir.Name;slug=$p.slug;root=$candidate}
   }
  }
 }
 foreach($item in $candidates|Select-Object -First 100){
  $profile=$profiles|Where-Object {$_.slug -eq $item.slug}|Select-Object -First 1
  if(!$profile){continue}
  if(((Get-Item -LiteralPath $item.root).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0){continue}
  $files=@()
  foreach($rel in $profile.configs){
   $candidate=Join-Path $item.root $rel
   $found=Test-Path -LiteralPath $candidate -PathType Leaf
   $files+=@{path=$rel.Replace('\','/');exists=$found;bytes=$(if($found){(Get-Item -LiteralPath $candidate).Length}else{0})}
  }
  $binary=Test-Path -LiteralPath (Join-Path $item.root $profile.exe) -PathType Leaf
  $inventory+=@{serverId=$item.id;game=$profile.title;folder=$item.root;
   binaryInstalled=$binary;configs=$files;actualConfigurations=(@($files|Where-Object {$_.exists})).Count;
   missingConfigurations=@($files|Where-Object {!$_.exists}|ForEach-Object {$_.path});
   serverStarted=$false;networkReachabilityVerified=$false}
 }
}
$report=@{schema='cmd-hosting/local-server-inventory-v1';scannedAt=(Get-Date).ToUniversalTime().ToString('o');
 root=$base;installedServersFound=$inventory.Count;servers=@($inventory);
 realInstallationsOnly=$true;gameFilesModified=$false;remoteUploadPerformed=$false}
$json=ConvertTo-Json -InputObject $report -Depth 15
if($Output){
 $dest=[IO.Path]::GetFullPath($Output)
 if([IO.Path]::GetExtension($dest).ToLowerInvariant() -ne '.json'){throw 'Sortie JSON uniquement.'}
 [IO.File]::WriteAllText($dest,$json,([Text.UTF8Encoding]::new($false)))
 Write-Host ('Inventaire local enregistre : '+$dest)
}else{$json}
