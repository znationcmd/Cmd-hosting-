#requires -version 5.1
<#
 CMD Hosting node bootstrap. Plan-only by default.
 To install: -Install -AcceptPublisherTerms -SteamCmdPath C:\SteamCMD\steamcmd.exe
 This script is for an administrator on an enrolled Windows hosting node, not a
 public API or a remote command from a renter's browser.
#>
[CmdletBinding()]
param(
 [Parameter(Mandatory=$true)]
 [ValidateSet("DayZ","ARK Ascended","ARK Evolved","Arma Reforger","Arma 3","7 Days to Die","Palworld","Satisfactory")]
 [string]$Game,
 [Parameter(Mandatory=$true)][ValidatePattern('^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$')]
 [string]$ServerId,
 [Parameter(Mandatory=$true)][string]$InstallRoot,
 [string]$SteamCmdPath="",
 [switch]$Install,
 [switch]$AcceptPublisherTerms
)
Set-StrictMode -Version Latest
$ErrorActionPreference="Stop"
$registry=@{
 "DayZ"=@{app="223350";slug="dayz";min=20;exe="DayZServer_x64.exe"}
 "ARK Ascended"=@{app="2430930";slug="ark-asa";min=120;exe="ShooterGame\Binaries\Win64\ArkAscendedServer.exe"}
 "ARK Evolved"=@{app="376030";slug="ark-ase";min=40;exe="ShooterGame\Binaries\Win64\ShooterGameServer.exe"}
 "Arma Reforger"=@{app="1874900";slug="arma-reforger";min=35;exe="ArmaReforgerServer.exe"}
 "Arma 3"=@{app="233780";slug="arma-3";min=50;exe="arma3server_x64.exe"}
 "7 Days to Die"=@{app="294420";slug="7dtd";min=25;exe="7DaysToDieServer.exe"}
 "Palworld"=@{app="2394010";slug="palworld";min=30;exe="PalServer.exe"}
 "Satisfactory"=@{app="1690800";slug="satisfactory";min=25;exe="FactoryServer.exe"}
}
$item=$registry[$Game]
$root=[IO.Path]::GetFullPath($InstallRoot)
if($root -notmatch '^[A-Za-z]:\\' -or $root -match '^[A-Za-z]:\\$' -or $root.StartsWith('\\')){
 throw "Use a dedicated absolute LOCAL Windows directory, not a root or network path."
}
$forbidden=@($env:SystemRoot,$env:ProgramFiles,$env:USERPROFILE,$env:APPDATA,$env:TEMP) | Where-Object { $_ }
foreach($path in $forbidden){
 $f=[IO.Path]::GetFullPath($path).TrimEnd('\')
 if($root.Equals($f,[StringComparison]::OrdinalIgnoreCase) -or $root.StartsWith($f+'\',[StringComparison]::OrdinalIgnoreCase)){
  throw "InstallRoot cannot be inside operating-system or personal folders."
 }
}
$dest=[IO.Path]::GetFullPath((Join-Path (Join-Path $root $ServerId) $item.slug))
if(!$dest.StartsWith($root.TrimEnd('\')+'\',[StringComparison]::OrdinalIgnoreCase)){throw "Destination outside approved root."}
if((Test-Path -LiteralPath $dest) -and (Get-ChildItem -LiteralPath $dest -Force | Select-Object -First 1)){
 throw "Target already has files. Never overwrite existing rentals: use backup/update workflow."
}
$drive=New-Object IO.DriveInfo ($root.Substring(0,1))
$free=[int64]$drive.AvailableFreeSpace
$plan=[ordered]@{
 game=$Game;serverId=$ServerId;dedicatedAppId=$item.app;destination=$dest;
 mode=$(if($Install){"install"}else{"dry-run"});requiredFreeGB=$item.min;
 availableFreeGB=[math]::Round($free/1GB,1);
 expectedExecutable=$item.exe; filesInstalled=$false;serverRunning=$false;
}
$plan | ConvertTo-Json
if(!$Install){
 Write-Host "PLAN ONLY: no downloading, no file changes, no game server started." -ForegroundColor Cyan
 return
}
if(!$AcceptPublisherTerms){throw "Specify -AcceptPublisherTerms after checking the game's EULA/license."}
if($free -lt ([int64]$item.min*1GB)){throw "Insufficient free disk space."}
if(!$SteamCmdPath){throw "Provide a local copy of official SteamCMD with -SteamCmdPath."}
$steam=[IO.Path]::GetFullPath($SteamCmdPath)
if([IO.Path]::GetFileName($steam) -ine 'steamcmd.exe' -or !(Test-Path -LiteralPath $steam -PathType Leaf)){throw "steamcmd.exe not found."}
foreach($path in @($root,(Join-Path $root $ServerId))){
 if(Test-Path -LiteralPath $path){
  if(((Get-Item -LiteralPath $path -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0){
   throw "Symlink/junction install paths are not allowed."
  }
 }
}
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Write-Host "Starting authorized SteamCMD download into isolated directory $dest"
$steamOutput=@(& $steam '+@ShutdownOnFailedCommand' '1' '+@NoPromptForPassword' '1' '+force_install_dir' $dest '+login' 'anonymous' '+app_update' $item.app 'validate' '+quit' 2>&1)
$steamExit=$LASTEXITCODE
$steamOutput | ForEach-Object {Write-Host ([string]$_)}
if($steamExit -ne 0){
 throw "SteamCMD did not complete successfully; if a Steam account is required, stop and follow official login instructions. Existing files are not deleted."
}
$exe=Join-Path $dest $item.exe
if(!(Test-Path -LiteralPath $exe -PathType Leaf)){
 throw "Expected executable missing; installation is incomplete."
}
Write-Host "Server binary found: $exe. NOT started or verified." -ForegroundColor Green
Write-Host "NEXT: discover generated configs, apply validated map/scenario/mods, test startup/network/logs, then confirm from an authenticated host agent."

# A binary alone is not proof of a complete official installation.
if((Get-Item -LiteralPath $exe).Length -le 0){throw "Server executable is empty."}
$success="Success! App '"+$item.app+"' fully installed."
if(($steamOutput -join "`n") -notmatch [regex]::Escape($success)){throw "SteamCMD did not confirm full installation and validation."}
$manifest=Join-Path (Join-Path $dest 'steamapps') ('appmanifest_'+$item.app+'.acf')
if(!(Test-Path -LiteralPath $manifest -PathType Leaf)){throw "Steam app manifest missing; completeness cannot be confirmed."}
$acf=Get-Content -LiteralPath $manifest -Raw -Encoding UTF8
function Manifest-Field([string]$name){
 $match=[regex]::Match($acf,('"'+[regex]::Escape($name)+'"\s+"([^"\r\n]+)"'))
 if(!$match.Success){throw ('Missing Steam manifest field '+$name)}
 return $match.Groups[1].Value
}
if((Manifest-Field 'appid') -cne $item.app -or (Manifest-Field 'StateFlags') -ne '4'){throw "Steam manifest belongs to another game or is incomplete."}
$build=Manifest-Field 'buildid'
if($build -notmatch '^[1-9][0-9]*$'){throw "Steam build is not verified."}
$files=@(Get-ChildItem -LiteralPath $dest -File -Recurse -ErrorAction Stop)
$size=[long](($files|Measure-Object -Property Length -Sum).Sum)
if($files.Count -lt 2 -or $size -le 0){throw "Installation content is empty."}
$receipt=[ordered]@{schema='cmd-hosting/steam-validation-v1';appId=$item.app;buildId=$build;
 steamValidated=$true;manifestStateFlags=4;manifestSha256=(Get-FileHash -LiteralPath $manifest -Algorithm SHA256).Hash.ToLowerInvariant();
 fileCount=$files.Count;totalBytes=$size;validatedAt=(Get-Date).ToUniversalTime().ToString('o');
 gameStarted=$false;serverReady=$false}
$receiptFile=Join-Path $dest 'cmdhosting-steam-validation.json'
if(Test-Path -LiteralPath $receiptFile){throw "Refusing to overwrite an installation receipt."}
[IO.File]::WriteAllText($receiptFile,(ConvertTo-Json -InputObject $receipt -Depth 8),([Text.UTF8Encoding]::new($false)))
Write-Host "Official Steam files validated. Startup, network access and generated game settings still require verification."
