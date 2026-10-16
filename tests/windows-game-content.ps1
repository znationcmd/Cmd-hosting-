# CMD Hosting — isolated fake Windows rental integration tests.
# NO SteamCMD network/downloads, no existing servers, no external services.
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$script=Join-Path $PSScriptRoot '..\scripts\Configure-CMDGameContent.ps1'
$root=Join-Path $env:SystemDrive ('CMDHostingCI-'+[guid]::NewGuid().ToString('N'))
function Assert([bool]$yes,[string]$reason){if(!$yes){throw ('CMD Hosting fixture failed: '+$reason)}}
function New-FakeRental([string]$name,[string]$game,[string]$exe){
 $base=Join-Path (Join-Path $root $name) $game
 New-Item -ItemType Directory -Force -Path $base|Out-Null
 $target=Join-Path $base $exe
 New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force|Out-Null
 [IO.File]::WriteAllText($target,'fake test binary - never executed')
 $marker=Join-Path $base '.cmdhosting-initial-install.json'
 @{serverId=$name;gameKey=$game;binaryVerified=$true;contentPrepared=$false}|ConvertTo-Json|
  Set-Content -LiteralPath $marker -Encoding UTF8
 return $base
}
try{
 # DayZ Chernarus vanilla mission.
 $dayz=New-FakeRental 'dayzunit001' 'dayz' 'DayZServer_x64.exe'
 New-Item -ItemType Directory -Force -Path (Join-Path $dayz 'mpmissions\dayzOffline.chernarusplus')|Out-Null
 $mission=Join-Path $dayz 'mpmissions\dayzOffline.chernarusplus'
 New-Item -ItemType Directory -Force -Path (Join-Path $mission 'db')|Out-Null
 [IO.File]::WriteAllText((Join-Path $mission 'init.c'),'void main() {}')
 [IO.File]::WriteAllText((Join-Path $mission 'db\types.xml'),'<types/>')
 $cfg=Join-Path $dayz 'serverDZ.cfg'
 [IO.File]::WriteAllText($cfg,'class Missions {class DayZ { template = "dayzOffline.enoch"; };};')
 & $script -GameKey 'dayz' -ServerId 'dayzunit001' -ServerRoot $dayz -MapId 'chernarusplus' -Apply|Out-Null
 $after=Get-Content -LiteralPath $cfg -Raw
 Assert ($after.Contains('template = "dayzOffline.chernarusplus"')) 'DayZ mission must switch'
 Assert (@(Get-ChildItem -Path ($cfg+'.before-cmdhosting-*.bak')).Count -eq 1) 'DayZ config backup'
 Assert ((Get-Content (Join-Path $dayz '.cmdhosting-initial-install.json') -Raw|ConvertFrom-Json).contentPrepared -eq $true) 'DayZ marked prepared'
 $repeated=$false
 try{& $script -GameKey 'dayz' -ServerId 'dayzunit001' -ServerRoot $dayz -MapId 'chernarusplus' -Apply|Out-Null}catch{$repeated=$true}
 Assert $repeated 'Existing world may not be edited again'
 # An empty mission folder must never be accepted as a complete DayZ map.
 $partial=New-FakeRental 'dayzpartial01' 'dayz' 'DayZServer_x64.exe'
 New-Item -ItemType Directory -Force -Path (Join-Path $partial 'mpmissions\dayzOffline.chernarusplus')|Out-Null
 [IO.File]::WriteAllText((Join-Path $partial 'serverDZ.cfg'),'class Missions {class DayZ {template="dayzOffline.chernarusplus";};};')
 $partialBlocked=$false
 try{& $script -GameKey 'dayz' -ServerId 'dayzpartial01' -ServerRoot $partial -MapId 'chernarusplus' -Apply|Out-Null}catch{$partialBlocked=$true}
 Assert $partialBlocked 'Empty DayZ mission folder accepted'
 # ARK ASA specific official launch level + CurseForge project ID, no actual game execution.
 $ark=New-FakeRental 'arkunit001' 'ark-asa' 'ShooterGame\Binaries\Win64\ArkAscendedServer.exe'
 & $script -GameKey 'ark-asa' -ServerId 'arkunit001' -ServerRoot $ark -MapId 'the-island' -ModIds @('123456') -Slots 20 -Apply|Out-Null
 $launch=Get-Content (Join-Path $ark 'cmdhosting-launch.json') -Raw|ConvertFrom-Json
 Assert ($launch.map -eq 'TheIsland_WP') 'ARK ASA map not ASA Evolved map'
 Assert (@($launch.arguments|Where-Object {$_ -eq '-mods=123456'}).Count -eq 1) 'ARK -mods arguments prepared'
 Assert ($launch.startupVerified -eq $false) 'No fake startup success'
 # Cross-game map injection refused; no state changed.
 $arkBad=New-FakeRental 'arkunit002' 'ark-asa' 'ShooterGame\Binaries\Win64\ArkAscendedServer.exe'
 $wrong=$false
 try{& $script -GameKey 'ark-asa' -ServerId 'arkunit002' -ServerRoot $arkBad -MapId 'chernarusplus' -Apply|Out-Null}catch{$wrong=$true}
 Assert $wrong 'DayZ map rejected by ARK worker'
 Assert (!(Test-Path -LiteralPath (Join-Path $arkBad 'cmdhosting-launch.json'))) 'No files written for invalid selection'
 # 7DTD copy config, no user save deletion.
 $d=New-FakeRental 'sevenunit01' '7dtd' '7DaysToDieServer.exe'
 $xml='<?xml version="1.0" ?><ServerSettings><property name="GameWorld" value="Navezgane"/></ServerSettings>'
 [IO.File]::WriteAllText((Join-Path $d 'serverconfig.xml'),$xml)
 & $script -GameKey '7dtd' -ServerId 'sevenunit01' -ServerRoot $d -MapId 'random-world' -Apply|Out-Null
 $old=[xml](Get-Content (Join-Path $d 'serverconfig.xml') -Raw)
 $new=[xml](Get-Content (Join-Path $d 'cmdhosting-serverconfig.xml') -Raw)
 Assert ($old.ServerSettings.property.value -eq 'Navezgane') 'Original 7DTD config preserved'
 Assert ($new.ServerSettings.property.value -eq 'RWG') 'Copied 7DTD world updated'
 # Reforger JSON with exact official scenario GUID.
 $r=New-FakeRental 'armaunit001' 'arma-reforger' 'ArmaReforgerServer.exe'
 '{"game":{"scenarioId":"old","mods":[]}}'|Set-Content (Join-Path $r 'config.json') -Encoding UTF8
 & $script -GameKey 'arma-reforger' -ServerId 'armaunit001' -ServerRoot $r -MapId 'everon-conflict' -ModIds @('0123456789ABCDEF') -Apply|Out-Null
 $ref=Get-Content (Join-Path $r 'config.json') -Raw|ConvertFrom-Json
 Assert ($ref.game.scenarioId -eq '{ECC61978EDCC2B5A}Missions/23_Campaign.conf') 'Reforger scenario'
 Assert (@($ref.game.mods).Count -eq 1) 'Reforger publisher mod queued'
 Write-Host 'Windows fake rental integration: DayZ, ARK ASA, 7DTD, Reforger and map isolation PASS.'
}finally{
 if(Test-Path -LiteralPath $root){Remove-Item -LiteralPath $root -Recurse -Force}
}
