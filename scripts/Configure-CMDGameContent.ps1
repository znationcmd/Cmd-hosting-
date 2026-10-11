#requires -version 5.1
# CMD Hosting first-install content. Never touches existing rentals or saves.
[CmdletBinding()]
param(
 [Parameter(Mandatory=$true)][ValidateSet('dayz','ark-asa','arma-reforger','7dtd','palworld')][string]$GameKey,
 [Parameter(Mandatory=$true)][ValidatePattern('^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$')][string]$ServerId,
 [Parameter(Mandatory=$true)][string]$ServerRoot,
 [string]$MapId='', [string[]]$ModIds=@(), [int]$Slots=10,
 [switch]$Apply,[switch]$PublisherEntitlementApproved
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath($ServerRoot).TrimEnd('\')
if($root -notmatch '^[A-Za-z]:\\' -or $root -match '^[A-Za-z]:\\$' -or !(Test-Path -LiteralPath $root -PathType Container)){throw 'Invalid isolated server directory.'}
if($root -match '(?i)^[a-z]:\\(Windows|Users|Program Files( \(x86\))?|ProgramData)(\\|$)'){throw 'Protected system path.'}
if($Slots -lt 1 -or $Slots -gt 200){throw 'Invalid slot count.'}
$slug=@{dayz='dayz';'ark-asa'='ark-asa';'arma-reforger'='arma-reforger';'7dtd'='7dtd';palworld='palworld'}[$GameKey]
if((Split-Path -Leaf $root) -ine $slug -or (Split-Path -Leaf (Split-Path -Parent $root)) -ine $ServerId){throw 'Directory is not owned by this rental.'}
$marker=Join-Path $root '.cmdhosting-initial-install.json'
if(!(Test-Path -LiteralPath $marker -PathType Leaf)){throw 'New-rental verified install marker is missing.'}
$claim=Get-Content -LiteralPath $marker -Raw -Encoding UTF8 | ConvertFrom-Json
if([string]$claim.serverId -cne $ServerId -or [string]$claim.gameKey -cne $GameKey -or $claim.binaryVerified -ne $true){throw 'Unverified install marker.'}
if($claim.contentPrepared -eq $true){throw 'This rental is already configured: backups/update workflow required.'}
$expected=@{dayz='DayZServer_x64.exe';'ark-asa'='ShooterGame\Binaries\Win64\ArkAscendedServer.exe';
 'arma-reforger'='ArmaReforgerServer.exe';'7dtd'='7DaysToDieServer.exe';palworld='PalServer.exe'}[$GameKey]
if(!(Test-Path -LiteralPath (Join-Path $root $expected) -PathType Leaf)){throw 'Game binary missing.'}
foreach($part in @($root,(Split-Path -Parent $root),(Split-Path -Parent (Split-Path -Parent $root)))){
 if(((Get-Item -LiteralPath $part -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0){throw 'Symlink or junction in rental path.'}
}
$maps=@{
 dayz=@{chernarusplus='dayzOffline.chernarusplus';livonia='dayzOffline.enoch';sakhal='dayzOffline.sakhal'}
 'ark-asa'=@{'the-island'='TheIsland_WP';'the-center'='TheCenter_WP';'scorched-earth'='ScorchedEarth_WP';
  aberration='Aberration_WP';extinction='Extinction_WP';ragnarok='Ragnarok_WP';
  valguero='Valguero_WP';'genesis-part-1'='Genesis_WP';astraeos='Astraeos_WP';'lost-colony'='LostColony_WP'}
 'arma-reforger'=@{'everon-conflict'='{ECC61978EDCC2B5A}Missions/23_Campaign.conf';
  'everon-gm'='{59AD59368755F41A}Missions/21_GM_Eden.conf';
  'arland-gm'='{2BBBE828037C6F4B}Missions/22_GM_Arland.conf'}
 '7dtd'=@{navezgane='Navezgane';'random-world'='RWG'}
 palworld=@{'existing-world'='existing-world'}
}
$defaults=@{dayz='chernarusplus';'ark-asa'='the-island';'arma-reforger'='everon-conflict';'7dtd'='navezgane';palworld='existing-world'}
if(!$MapId){$MapId=$defaults[$GameKey]}
if(!$maps[$GameKey].ContainsKey($MapId)){throw 'Wrong map for selected game.'}
$mapValue=[string]$maps[$GameKey][$MapId]
if(@('sakhal','lost-colony') -contains $MapId -and !$PublisherEntitlementApproved){throw 'Publisher map entitlement not confirmed.'}
$mods=@($ModIds|Where-Object {$null -ne $_}|Select-Object -Unique)
if($mods.Count -gt 100){throw 'Too many mods.'}
foreach($id in $mods){
 if($GameKey -eq 'arma-reforger'){
  if([string]$id -notmatch '^[a-fA-F0-9]{16}$'){throw 'Invalid Bohemia mod GUID.'}
 }elseif($GameKey -eq 'dayz' -or $GameKey -eq 'ark-asa'){
  if([string]$id -notmatch '^[1-9][0-9]{0,12}$'){throw 'Invalid publisher mod ID.'}
 }else{throw 'No approved mod downloader available for this game.'}
}
if($MapId -eq 'astraeos' -and !$mods.Count){throw 'Astraeos requires an authorized published map mod.'}
$utf8=[Text.UTF8Encoding]::new($false)
function Save-NewJson([string]$filename,[object]$value){
 $dest=Join-Path $root $filename
 if(Test-Path -LiteralPath $dest){throw 'Existing content file must not be overwritten.'}
 [IO.File]::WriteAllText($dest,(ConvertTo-Json -InputObject $value -Depth 24)+[Environment]::NewLine,$utf8)
}
function Backup([string]$file){
 if(((Get-Item -LiteralPath $file -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0){throw 'Linked game config refused.'}
 $dest=$file+'.before-cmdhosting-'+(Get-Date -Format 'yyyyMMddHHmmssfff')+'.bak'
 Copy-Item -LiteralPath $file -Destination $dest -ErrorAction Stop
}
$plan=[ordered]@{schema='cmd-hosting/game-content-v1';gameKey=$GameKey;serverId=$ServerId;
 mapId=$MapId;mapValue=$mapValue;modIds=@($mods);
 mode=$(if($Apply){'apply'}else{'dry-run'});gameStarted=$false;
 modsVerified=$false;contentPrepared=$false;worldSavesPreserved=$true}
if(!$Apply){$plan|ConvertTo-Json -Depth 12;return}
if($GameKey -eq 'dayz'){
 $mission=Join-Path (Join-Path $root 'mpmissions') $mapValue
 if(!(Test-Path -LiteralPath $mission -PathType Container)){throw 'Mission missing; install authorized map/DLC first.'}
 $cfg=Join-Path $root 'serverDZ.cfg'
 if(!(Test-Path -LiteralPath $cfg -PathType Leaf)){throw 'DayZ serverDZ.cfg missing.'}
 $body=Get-Content -LiteralPath $cfg -Raw -Encoding UTF8
 $rx='(?im)(template\s*=\s*")[^"]+("\s*;)'
 if([regex]::Matches($body,$rx).Count -ne 1){throw 'DayZ mission template must appear exactly once.'}
 Backup $cfg
 $updated=[regex]::Replace($body,$rx,('$1'+$mapValue+'$2'))
 [IO.File]::WriteAllText($cfg,$updated,$utf8)
}elseif($GameKey -eq 'arma-reforger'){
 $cfg=Join-Path $root 'config.json'
 if(!(Test-Path -LiteralPath $cfg -PathType Leaf)){throw 'Arma Reforger config.json missing.'}
 $doc=Get-Content -LiteralPath $cfg -Raw -Encoding UTF8|ConvertFrom-Json
 if(!$doc.PSObject.Properties['game']){throw 'Missing game object.'}
 Backup $cfg
 $doc.game|Add-Member -Force -NotePropertyName scenarioId -NotePropertyValue $mapValue
 $existing=@()
 if($doc.game.PSObject.Properties['mods']){$existing=@($doc.game.mods|Where-Object {$_})}
 foreach($id in $mods){
  if(@($existing|Where-Object {$_.modId -ieq $id}).Count -eq 0){$existing+=@{modId=([string]$id).ToUpperInvariant()}}
 }
 $doc.game|Add-Member -Force -NotePropertyName mods -NotePropertyValue $existing
 [IO.File]::WriteAllText($cfg,(ConvertTo-Json -InputObject $doc -Depth 40)+[Environment]::NewLine,$utf8)
}elseif($GameKey -eq '7dtd'){
 $cfg=Join-Path $root 'serverconfig.xml'
 $out=Join-Path $root 'cmdhosting-serverconfig.xml'
 if(!(Test-Path -LiteralPath $cfg -PathType Leaf) -or (Test-Path -LiteralPath $out)){throw '7DTD config missing or already configured.'}
 [xml]$doc=Get-Content -LiteralPath $cfg -Raw -Encoding UTF8
 $props=@($doc.ServerSettings.property|Where-Object {$_.name -eq 'GameWorld'})
 if($props.Count -ne 1){throw 'GameWorld property missing or ambiguous.'}
 $props[0].SetAttribute('value',$mapValue)
 $doc.Save($out)
}elseif($GameKey -eq 'ark-asa'){
 $argsList=@($mapValue,('-WinLiveMaxPlayers='+$Slots),'-log')
 if($mods.Count){$argsList+=('-mods='+($mods -join ','))}
 Save-NewJson 'cmdhosting-launch.json' ([ordered]@{
  executable='ShooterGame\Binaries\Win64\ArkAscendedServer.exe';gameKey=$GameKey;map=$mapValue;
  arguments=@($argsList);modProvider='curseforge-asa';publisherDownloadPending=$mods.Count -gt 0;
  startupVerified=$false;portsAssigned=$false})
}elseif($GameKey -eq 'palworld'){
 Save-NewJson 'cmdhosting-launch.json' ([ordered]@{
  executable='PalServer.exe';world='existing-save';startupVerified=$false;portsAssigned=$false})
}
Save-NewJson 'cmdhosting-content-pending.json' ([ordered]@{schema='cmd-hosting/content-activation-v1';
 gameKey=$GameKey;serverId=$ServerId;mapId=$MapId;modIds=@($mods);
 modsVerified=$false;serverStarted=$false;createdAt=(Get-Date).ToUniversalTime().ToString('o')})
$claim|Add-Member -Force -NotePropertyName contentPrepared -NotePropertyValue $true
$claim|Add-Member -Force -NotePropertyName selectedMap -NotePropertyValue $MapId
[IO.File]::WriteAllText($marker,(ConvertTo-Json -InputObject $claim -Depth 10)+[Environment]::NewLine,$utf8)
$plan.contentPrepared=$true
$plan|ConvertTo-Json -Depth 12
