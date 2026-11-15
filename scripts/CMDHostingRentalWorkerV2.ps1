#requires -version 5.1
# CMD Hosting Windows Rental Worker V2. Independent of Lenovo V5 and Mods Agent.
# Only verified, paid, authorized jobs. Existing game folders NEVER overwritten.
[CmdletBinding()]
param([switch]$Install,[switch]$Once,[switch]$Diagnose)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$home=Join-Path $env:LOCALAPPDATA 'CMDHosting\RentalWorkerV2'
$settings=Join-Path $home 'settings.json'
$secretFile=Join-Path $home 'machine-token.dpapi'
$logFile=Join-Path $home 'activity.log'
$worker=Join-Path $home 'CMDHostingRentalWorkerV2.ps1'
$cloud='https://cmd-hosting-cloud-agents-production.up.railway.app'
$task='CMDHostingRentalWorkerV2'
$modsSettings=Join-Path $env:LOCALAPPDATA 'CMDHosting\ModsAgent\settings.json'
$legacyAuth=Join-Path $env:APPDATA 'CMDHostingAgent\auth.json'
$portableId=Join-Path (Join-Path $env:USERPROFILE '.cmdhosting') 'host-id.json'
$portableToken=Join-Path $env:LOCALAPPDATA 'CMDHosting\PortableAgentV2\machine-token.dpapi'
New-Item -Path $home -ItemType Directory -Force | Out-Null

function Write-Log([string]$line){
 $msg=(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')+' '+$line
 Write-Host $msg
 Add-Content -LiteralPath $logFile -Value $msg -Encoding UTF8
}
function Json([string]$path){
 if(!(Test-Path -LiteralPath $path -PathType Leaf)){throw 'Required local file missing.'}
 return Get-Content -LiteralPath $path -Raw -Encoding UTF8|ConvertFrom-Json
}
function Json-New([string]$path,[object]$item){
 if(Test-Path -LiteralPath $path){throw 'Existing rental file cannot be overwritten.'}
 [IO.File]::WriteAllText($path,(ConvertTo-Json -InputObject $item -Depth 30)+[Environment]::NewLine,([Text.UTF8Encoding]::new($false)))
}
function Read-Token(){
 $candidate=$secretFile
 if(!(Test-Path -LiteralPath $candidate -PathType Leaf) -and (Test-Path -LiteralPath $portableToken -PathType Leaf)){$candidate=$portableToken}
 if(!(Test-Path -LiteralPath $candidate -PathType Leaf)){throw 'Machine has not been paired with CMD Hosting cloud.'}
 $safe=(Get-Content -LiteralPath $candidate -Raw -Encoding UTF8).Trim()|ConvertTo-SecureString
 $ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($safe)
 try{return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)}
 finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}
}
function Api([string]$path,[hashtable]$payload){
 $token=Read-Token
 try{
  return Invoke-RestMethod -Uri ($cloud+$path) -Method Post -ContentType 'application/json' -Headers @{Authorization=('Bearer '+$token)} -Body (ConvertTo-Json -InputObject $payload -Compress -Depth 10) -TimeoutSec 40
 }finally{$token=$null}
}
function Send-MachineHeartbeat([string]$agentId){
 if($agentId -notmatch '^host-[a-f0-9-]{36}$'){throw 'Invalid portable worker identity.'}
 $key=Read-Token
 try{
  $body=@{agentId=$agentId;role='host';version='paid-rental-worker-v2.1';serverCount=0}|ConvertTo-Json -Compress
  $answer=Invoke-RestMethod -Method Post -Uri ($cloud+'/v1/agents/heartbeat') -Headers @{Authorization=('Bearer '+$key)} -ContentType 'application/json' -Body $body -TimeoutSec 30
  if(!$answer.ok -or !$answer.heartbeatAccepted){throw 'Cloud refused machine heartbeat.'}
 }finally{$key=$null}
}
function Get-Steam(){
 if(Test-Path -LiteralPath $modsSettings){
  $obj=Json $modsSettings
  if($obj.PSObject.Properties['steamCmdExe'] -and $obj.steamCmdExe -and (Test-Path -LiteralPath ([string]$obj.steamCmdExe) -PathType Leaf)){return [string]$obj.steamCmdExe}
 }
 foreach($p in @('C:\SteamCMD\steamcmd.exe','C:\steamcmd\steamcmd.exe','C:\CMD-Servers\steamcmd\steamcmd.exe')){
  if(Test-Path -LiteralPath $p -PathType Leaf){return $p}
 }
 throw 'SteamCMD official installation not located. Existing agents were not altered.'
}
function Valid-Root([string]$p){
 if($p -notmatch '^[A-Za-z]:\\' -or $p -match '^[A-Za-z]:\\$' -or $p.StartsWith('\\')){throw 'Invalid isolated root.'}
 $root=[IO.Path]::GetFullPath($p).TrimEnd('\')
 if($root -match '(?i)^[a-z]:\\(windows|program files( \(x86\))?|users|programdata)(\\|$)'){throw 'Root is a protected Windows path.'}
 return $root
}
function Download-Official([string]$name,[string]$url,[string]$marker){
 $file=Join-Path $home $name
 $temp=$file+'.tmp'
 Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $temp -TimeoutSec 60
 $errors=$null;$tokens=$null
 [void][System.Management.Automation.Language.Parser]::ParseFile($temp,[ref]$tokens,[ref]$errors)
 if($errors -and $errors.Count){throw 'Downloaded script is syntactically invalid.'}
 if(!(Select-String -LiteralPath $temp -SimpleMatch $marker -Quiet)){throw 'Unexpected publisher installer source.'}
 Move-Item -LiteralPath $temp -Destination $file -Force
 return $file
}
function Existing-Node(){
 if(Test-Path -LiteralPath $legacyAuth){
  $auth=Json $legacyAuth
  foreach($key in @('nodeId','node_id','nodeID','node','id')){
   $x=$auth.PSObject.Properties[$key]
   if($x -and $x.Value -is [string] -and $x.Value -match '^[A-Za-z0-9][A-Za-z0-9._:-]{2,110}$'){return [string]$x.Value}
  }
 }
 return ''
}
function New-AgentId(){
 if((Test-Path -LiteralPath $portableId -PathType Leaf) -and (Test-Path -LiteralPath $portableToken -PathType Leaf)){
  $portable=Json $portableId
  if([string]$portable.id -match '^host-[0-9a-f-]{36}$'){return [string]$portable.id}
 }
 $id=Join-Path $home 'agent-id.json'
 if(Test-Path -LiteralPath $id){return [string](Json $id).agentId}
 $v='host-'+[guid]::NewGuid().ToString()
 Json-New $id @{agentId=$v}
 return $v
}
function One-Time-Pair(){
 if(Test-Path -LiteralPath $secretFile){return}
 if((Test-Path -LiteralPath $portableToken -PathType Leaf) -and (Test-Path -LiteralPath $portableId -PathType Leaf)){return}
 $id=New-AgentId
 Write-Host 'Code temporaire CMD Hosting (fourni une seule fois par le proprietaire).'
 $code=Read-Host 'Code association'
 if($code -notmatch '^[a-zA-Z0-9_-]{32,128}$'){throw 'Code association invalide.'}
 $response=Invoke-RestMethod -Uri ($cloud+'/v1/agents/enroll/claim') -Method Post -ContentType 'application/json' -Body (@{agentId=$id;code=$code}|ConvertTo-Json -Compress) -TimeoutSec 40
 $code=$null
 if(!$response.ok -or !$response.machineToken){throw 'Cloud pairing refused.'}
 $sec=ConvertTo-SecureString -String ([string]$response.machineToken) -AsPlainText -Force
 ConvertFrom-SecureString -SecureString $sec|Set-Content -LiteralPath $secretFile -Encoding UTF8
 Write-Log 'Secure machine pairing completed; installation permission remains under owner control.'
}
function Register-NewRental([string]$root,[string]$game,[string]$serverId,[string]$arguments){
 if(!(Test-Path -LiteralPath $modsSettings)){return 'mod-agent-not-configured'}
 $modcfg=Json $modsSettings
 if(!$modcfg.PSObject.Properties['serversFile'] -or !$modcfg.serversFile){return 'mod-agent-servers-file-not-configured'}
 $file=[string]$modcfg.serversFile
 if(!(Test-Path -LiteralPath $file -PathType Leaf)){return 'mod-agent-server-list-missing'}
 $list=Json $file
 if(!$list.PSObject.Properties['servers']){throw 'Mod agent server list not recognized.'}
 $matches=@($list.servers|Where-Object {$_.id -eq $serverId})
 if($matches.Count){
  if($matches.Count -ne 1){throw 'Duplicate server ID in runtime registry; refusing ambiguous registration.'}
  $expected=@{dayz='DayZServer_x64.exe';'ark-asa'='ShooterGame\Binaries\Win64\ArkAscendedServer.exe';'arma-reforger'='ArmaReforgerServer.exe';'7dtd'='7DaysToDieServer.exe';palworld='PalServer.exe'}[$game]
  if(!$expected){throw 'Unsupported game registry mapping.'}
  $expectedExe=[IO.Path]::GetFullPath((Join-Path $root $expected))
  $actualExe=[string]$matches[0].exe
  if(!$actualExe -or !([IO.Path]::GetFullPath($actualExe)).Equals($expectedExe,[StringComparison]::OrdinalIgnoreCase)){
   throw 'Existing server ID belongs to another executable; refusing to claim success.'
  }
  if($matches[0].cmdHostingRental -ne $true){throw 'Existing server ID is not an authorized CMD Hosting rental.'}
  return 'existing-rental-entry-preserved'
 }
 $exe=@{dayz='DayZServer_x64.exe';'ark-asa'='ShooterGame\Binaries\Win64\ArkAscendedServer.exe';'arma-reforger'='ArmaReforgerServer.exe';'7dtd'='7DaysToDieServer.exe';palworld='PalServer.exe'}[$game]
 if(!$exe){throw 'Unsupported game registry mapping.'}
 $entry=@{id=$serverId;exe=(Join-Path $root $exe);cwd=$root;args=$arguments;cmdHostingRental=$true}
 $list.servers=@($list.servers)+@($entry)
 $stamp=Get-Date -Format 'yyyyMMddHHmmssfff'
 Copy-Item -LiteralPath $file -Destination ($file+'.cmdhosting-before-new-rental-'+$stamp+'.bak') -ErrorAction Stop
 $tmp=$file+'.cmdhosting-new-rental.tmp'
 [IO.File]::WriteAllText($tmp,(ConvertTo-Json -InputObject $list -Depth 50)+[Environment]::NewLine,([Text.UTF8Encoding]::new($false)))
 Move-Item -LiteralPath $tmp -Destination $file -Force
 return 'new-rental-added-with-backup'
}
# Start only newly provisioned, isolated Windows game servers.
# Process liveness is not proof of internet connectivity or player joinability.
function Start-NewRental([string]$root,[string]$game,[string]$serverId,[string]$arguments){
 $exeRelative=@{dayz='DayZServer_x64.exe';'ark-asa'='ShooterGame\Binaries\Win64\ArkAscendedServer.exe'}[$game]
 if(!$exeRelative){return 'startup-not-supported-for-game'}
 $exe=[IO.Path]::GetFullPath((Join-Path $root $exeRelative))
 $dir=[IO.Path]::GetFullPath($root).TrimEnd('\')
 if(!$exe.StartsWith($dir+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Executable outside isolated rental.'}
 if(!(Test-Path -LiteralPath $exe -PathType Leaf)){throw 'Executable missing before startup.'}
 $initial=Json (Join-Path $dir '.cmdhosting-initial-install.json')
 if([string]$initial.serverId -cne $serverId -or [string]$initial.gameKey -cne $game -or $initial.contentPrepared -ne $true){throw 'New rental marker invalid before startup.'}
 if($game -eq 'dayz'){
  if(!(Test-Path -LiteralPath (Join-Path $dir 'serverDZ.cfg') -PathType Leaf)){throw 'DayZ configuration missing.'}
  $arguments='-config=serverDZ.cfg -profiles=profiles -dologs -adminlog -netlog '+$arguments
 }elseif($game -eq 'ark-asa'){
  $launch=Json (Join-Path $dir 'cmdhosting-launch.json')
  if($launch.gameKey -cne 'ark-asa' -or $launch.publisherDownloadPending -eq $true){throw 'ARK map/mod content pending publisher download; startup deferred.'}
  $arguments=@($launch.arguments) -join ' '
 }
 $existing=@(Get-CimInstance Win32_Process -Filter ("name='"+[IO.Path]::GetFileName($exe)+"'") -ErrorAction Stop | Where-Object {$_.ExecutablePath -and $_.ExecutablePath.Equals($exe,[StringComparison]::OrdinalIgnoreCase)})
 if($existing.Count){throw 'This rental executable is already running; refusing duplicate startup.'}
 $proc=Start-Process -FilePath $exe -ArgumentList $arguments -WorkingDirectory $dir -PassThru -ErrorAction Stop
 Start-Sleep -Seconds 8
 $proc.Refresh()
 if($proc.HasExited){throw ('Game process exited during startup; exit code '+$proc.ExitCode)}
 $status=@{schema='cmd-hosting/runtime-start-v1';serverId=$serverId;gameKey=$game;processId=$proc.Id;startedAt=(Get-Date).ToUniversalTime().ToString('o');processAliveAfter8Seconds=$true;networkVerified=$false;playerJoinVerified=$false}
 Json-New (Join-Path $dir 'cmdhosting-runtime-start.json') $status
 return 'process-started-network-unverified'
}
function Install-DayZMods([string]$gameRoot,[string[]]$ids,[string]$steamExe,[string]$serverExe){
 if(!$ids.Count){return ''}
 if(Get-Process -Name 'DayZServer_x64' -ErrorAction SilentlyContinue){throw 'DayZ running; Workshop updates deferred for player protection.'}
 if(!(Test-Path -LiteralPath $modsSettings)){throw 'DayZ Workshop requires paired Mods Agent.'}
 $cfg=Json $modsSettings
 $steamUser=[string]$cfg.steamUser
 if(!$steamUser){throw 'DayZ Steam workshop account missing.'}
 $loaded=@()
 foreach($id in $ids){
  if($id -notmatch '^[1-9][0-9]{0,12}$'){throw 'Bad DayZ Workshop mod ID.'}
  & $steamExe '+force_install_dir' $gameRoot '+login' $steamUser '+workshop_download_item' '221100' $id 'validate' '+quit' | Out-Null
  if($LASTEXITCODE -ne 0){throw 'Steam Workshop download failed; account licensing may be required.'}
  $steamDir=Split-Path -Parent $steamExe
  $src=''
  foreach($place in @((Join-Path $gameRoot ('steamapps\workshop\content\221100\'+$id)),(Join-Path $steamDir ('steamapps\workshop\content\221100\'+$id)))){
   if(Test-Path -LiteralPath $place -PathType Container){$src=$place;break}
  }
  if(!$src){throw 'Verified Workshop downloaded content directory missing.'}
  $link=Join-Path $gameRoot ('@CMD_'+$id)
  if(!(Test-Path -LiteralPath $link)){New-Item -ItemType Junction -Path $link -Target $src -ErrorAction Stop|Out-Null}
  $keyDir=Join-Path $gameRoot 'keys'
  if(!(Test-Path -LiteralPath $keyDir)){New-Item -ItemType Directory -Path $keyDir|Out-Null}
  Get-ChildItem -LiteralPath $src -Filter '*.bikey' -Recurse -File | ForEach-Object {
   $target=Join-Path $keyDir $_.Name
   if(!(Test-Path -LiteralPath $target)){Copy-Item -LiteralPath $_.FullName -Destination $target -ErrorAction Stop}
  }
  $loaded+=('@CMD_'+$id)
 }
 return (' -mod="'+($loaded -join ';')+'"')
}

# Periodic DayZ Workshop updates for new, isolated rentals only.
# Never changes maps, saves, passwords or other machines.
function Sync-ManagedDayZ([string]$installationRoot,[string]$steamExe){
 if(!(Test-Path -LiteralPath $installationRoot -PathType Container)){return}
 if(Get-Process -Name 'DayZServer_x64' -ErrorAction SilentlyContinue){return}
 $rentals=@(Get-ChildItem -LiteralPath $installationRoot -Directory -ErrorAction SilentlyContinue | Select-Object -First 60)
 foreach($rental in $rentals){
  $folder=Join-Path $rental.FullName 'dayz'
  $marker=Join-Path $folder '.cmdhosting-initial-install.json'
  $pending=Join-Path $folder 'cmdhosting-content-pending.json'
  if(!(Test-Path -LiteralPath $marker -PathType Leaf) -or !(Test-Path -LiteralPath $pending -PathType Leaf)){continue}
  if(((Get-Item -LiteralPath $folder -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0){continue}
  $id=Join-Path $folder 'DayZServer_x64.exe'
  if(!(Test-Path -LiteralPath $id -PathType Leaf)){continue}
  try{
   $m=Json $marker
   $p=Json $pending
   if($m.contentPrepared -ne $true -or $m.gameKey -ne 'dayz' -or [string]$m.serverId -cne $rental.Name){continue}
   if($p.gameKey -ne 'dayz' -or [string]$p.serverId -cne $rental.Name){continue}
   $mods=@($p.modIds|Where-Object {$_})
   if(!$mods.Count){continue}
   if($mods.Count -gt 100 -or @($mods|Where-Object {$_ -notmatch '^[1-9][0-9]{0,12}$'}).Count){continue}
   $stateFile=Join-Path $folder '.cmdhosting-modsync-state.json'
   if(Test-Path -LiteralPath $stateFile){
    $state=Json $stateFile
    if($state.lastAttempt){
     $age=((Get-Date).ToUniversalTime()-[datetime]$state.lastAttempt).TotalMinutes
     if($age -lt 180){continue}
    }
   }
   [void](Install-DayZMods $folder $mods $steamExe $id)
   $new=@{lastAttempt=(Get-Date).ToUniversalTime().ToString('o');state='downloaded_on_disk';
     modIds=@($mods);nextCheckMinutes=180;serverRestarted=$false;runtimeVerified=$false}
   $temp=$stateFile+'.tmp'
   [IO.File]::WriteAllText($temp,(ConvertTo-Json -InputObject $new)+[Environment]::NewLine,([Text.UTF8Encoding]::new($false)))
   Move-Item -LiteralPath $temp -Destination $stateFile -Force
   Write-Log ('Workshop updated for a managed DayZ rental '+$rental.Name+' (server restart remains subject to maintenance).')
  }catch{
   Write-Log ('Managed DayZ Workshop update deferred for '+$rental.Name+': '+$_.Exception.Message)
  }
  return # Bound the SteamCMD workload to one rental per 10-minute tick.
 }
}

if($Diagnose){
 Write-Host 'CMD Hosting Rental Worker V2 — diagnostic local (aucun serveur modifie)'
 $scheduled=Get-ScheduledTask -TaskName $task -ErrorAction SilentlyContinue
 $settingsExists=Test-Path -LiteralPath $settings -PathType Leaf
 $scriptExists=Test-Path -LiteralPath $worker -PathType Leaf
 $paired=(Test-Path -LiteralPath $secretFile -PathType Leaf) -or (Test-Path -LiteralPath $portableToken -PathType Leaf)
 $steamPresent=$false
 try{$null=Get-Steam;$steamPresent=$true}catch{}
 $configValid=$false;$node=''
 if($settingsExists){
  try{
   $cfg=Json $settings
   $node=[string]$cfg.nodeId
   $null=Valid-Root ([string]$cfg.installRoot)
   $configValid=($cfg.ownerPublisherTermsApproved -eq $true) -and
    ([string]$cfg.agentId -match '^host-[a-f0-9-]{36}$') -and
    ($node -match '^[A-Za-z0-9][A-Za-z0-9._:-]{2,110}$') -and
    ([IO.Path]::GetFileName([string]$cfg.steamCmdPath) -ieq 'steamcmd.exe') -and
    (Test-Path -LiteralPath ([string]$cfg.steamCmdPath) -PathType Leaf)
  }catch{Write-Host ('Config invalide : '+$_.Exception.Message)}
 }
 $cloudReachable=$false
 try{$probe=Invoke-WebRequest -UseBasicParsing -Uri ($cloud+'/health') -TimeoutSec 12;$cloudReachable=$probe.StatusCode -eq 200}catch{}
 $ready=[bool]$scheduled -and $scriptExists -and $paired -and $steamPresent -and $configValid -and $cloudReachable
 Write-Host ('Agent V5 identifiable : '+[bool](Existing-Node))
 Write-Host ('Worker programme : '+[bool]$scheduled)
 Write-Host ('Fichier worker : '+$scriptExists)
 Write-Host ('Configuration valide : '+$configValid)
 Write-Host ('Association machine : '+$paired)
 Write-Host ('SteamCMD disponible : '+$steamPresent)
 Write-Host ('Cloud accessible : '+$cloudReachable)
 $runtimeRegistryReady=$false
 $runtimeRegistryReason='Mods Agent non configure'
 if(Test-Path -LiteralPath $modsSettings -PathType Leaf){
  try{
   $modcfg=Json $modsSettings
   if($modcfg.PSObject.Properties['serversFile'] -and $modcfg.serversFile){
    $serverListPath=[string]$modcfg.serversFile
    if(Test-Path -LiteralPath $serverListPath -PathType Leaf){
     $serverList=Json $serverListPath
     if($serverList.PSObject.Properties['servers']){
      $runtimeRegistryReady=$true
      $runtimeRegistryReason='Registre des serveurs disponible'
     }else{$runtimeRegistryReason='Format du registre non reconnu'}
    }else{$runtimeRegistryReason='Fichier de registre introuvable'}
   }else{$runtimeRegistryReason='Chemin du registre absent'}
  }catch{$runtimeRegistryReason='Registre illisible ou invalide'}
 }
 Write-Host ('Registre de gestion des serveurs : '+$runtimeRegistryReady+' ('+$runtimeRegistryReason+')')
 Write-Host ('Worker pret a traiter une commande autorisee : '+$ready)
 if($node){Write-Host ('Node ID (non secret) : '+$node)}
 Write-Host 'Le diagnostic ne prouve ni location validee ni serveur de jeu demarre.'
 if(!$ready){Write-Host 'ACTION : terminer l installation du worker puis executer -Once.';exit 2}
 exit 0
}
if($Install){
 if(Get-ScheduledTask -TaskName $task -ErrorAction SilentlyContinue){
  $configured=$false
  if((Test-Path -LiteralPath $worker -PathType Leaf) -and (Test-Path -LiteralPath $settings -PathType Leaf)){
   try{
    $existing=Json $settings
    $configured=($existing.ownerPublisherTermsApproved -eq $true) -and
     ([string]$existing.agentId -match '^host-[a-f0-9-]{36}$') -and
     ([IO.Path]::GetFileName([string]$existing.steamCmdPath) -ieq 'steamcmd.exe') -and
     (Test-Path -LiteralPath ([string]$existing.steamCmdPath) -PathType Leaf) -and
     ((Test-Path -LiteralPath $secretFile -PathType Leaf) -or (Test-Path -LiteralPath $portableToken -PathType Leaf))
   }catch{$configured=$false}
  }
  if(!$configured){throw 'Worker planifie mais configuration incomplete : lancer -Diagnose. Aucun fichier existant ne sera ecrase.'}
  Write-Log 'Worker existant et configure : tache Windows conservee.'
  exit 0
 }
 $steam=Get-Steam
 $root=Valid-Root 'C:\CMD-Servers'
 One-Time-Pair
 $id=New-AgentId
 $node=Existing-Node
 if(!$node){$node=$id}
 $local=@{agentId=$id;nodeId=$node;installRoot=$root;steamCmdPath=$steam;
  ownerPublisherTermsApproved=$false;contentVersion='2.0'}
 Write-Host 'Autoriser seulement les futures locations PC verifiees et sous reserve des conditions editeurs ?'
 $ok=Read-Host 'Entrer O pour accepter'
 if($ok -notin @('O','o','Oui','oui')){throw 'Publisher license terms not approved.'}
 $local.ownerPublisherTermsApproved=$true
 [IO.File]::WriteAllText($settings,(ConvertTo-Json $local)+[Environment]::NewLine,([Text.UTF8Encoding]::new($false)))
 if($PSCommandPath -ne $worker){Copy-Item -LiteralPath $PSCommandPath -Destination $worker -ErrorAction Stop}
 $exe=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
 $a=New-ScheduledTaskAction -Execute $exe -Argument ('-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "'+$worker+'" -Once')
 $atLogon=New-ScheduledTaskTrigger -AtLogOn -User ([Security.Principal.WindowsIdentity]::GetCurrent().Name)
 $every10=New-ScheduledTaskTrigger -Once -At ((Get-Date).AddMinutes(2)) -RepetitionInterval (New-TimeSpan -Minutes 10) -RepetitionDuration (New-TimeSpan -Days 3650)
 $principal=New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
 $options=New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 7)
 Register-ScheduledTask -TaskName $task -Action $a -Trigger @($atLogon,$every10) -Principal $principal -Settings $options -Description 'Isolated verified paid PC rentals only'|Out-Null
 Write-Log ('Worker installed. Owner must authorize agent '+$id+' for rental node '+$node+' in cloud.')
 exit 0
}
if(!$Once){throw 'Use -Install, -Diagnose, or -Once.'}
$lock=$null;$job=$null;$conf=$null
try{$lock=[IO.File]::Open((Join-Path $home 'worker.lock'),'OpenOrCreate','ReadWrite','None')}
catch{Write-Log 'Worker already running; no duplicate started.';exit 0}
try{
 $conf=Json $settings
 if($conf.ownerPublisherTermsApproved -ne $true){throw 'Publisher terms not approved.'}
 $root=Valid-Root ([string]$conf.installRoot)
 $steam=[string]$conf.steamCmdPath
 if([IO.Path]::GetFileName($steam) -ine 'steamcmd.exe' -or !(Test-Path -LiteralPath $steam -PathType Leaf)){throw 'SteamCMD missing.'}
 $ramGB=[math]::Round([double](Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory/1GB,1)
 $diskGB=[math]::Round([double](Get-PSDrive -Name $root.Substring(0,1)).Free/1GB,1)
 Send-MachineHeartbeat ([string]$conf.agentId)
 Sync-ManagedDayZ $root $steam
 $heart=Api '/v1/agents/heartbeat' @{
   agentId=[string]$conf.agentId;role='host';version='rental-worker-v2.1';serverCount=0}
 if(!$heart.heartbeatAccepted){throw 'CMD Hosting cloud did not acknowledge this authorized machine.'}
 $reply=Api '/v1/provisioning/agent/claim' @{nodeId=[string]$conf.nodeId}
 if(!$reply.ok -or !$reply.job){Write-Log 'No authorized paid rental work available.';exit 0}
 $job=$reply.job
 $names=@{dayz='DayZ';'ark-asa'='ARK Ascended';'ark-survival-ascended'='ARK Ascended';'arma-reforger'='Arma Reforger';'7dtd'='7 Days to Die'}
 $key=[string]$job.gameKey
 if(!$names.ContainsKey($key)){throw 'Game not allowed on Windows rental worker.'}
 if($job.platform -notin @('pc','crossplay') -or [string]$job.action -ne 'install_steamcmd_in_isolated_rental_directory'){throw 'Invalid job platform or command.'}
 $serverId=[string]$job.serverId
 if($serverId -notmatch '^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$'){throw 'Invalid server identifier.'}
 $slots=[int]$job.slots
 if($slots -lt 1 -or $slots -gt 200){throw 'Invalid rental slot count.'}
 if($ramGB -lt [double]$job.minimumRamGB){throw 'Not enough RAM for this game. Future dedicated server required.'}
 if($diskGB -lt [double]$job.minimumFreeGB){throw 'Not enough disk space for this game.'}
 $slug=@{dayz='dayz';'ark-asa'='ark-asa';'ark-survival-ascended'='ark-asa';'arma-reforger'='arma-reforger';'7dtd'='7dtd'}[$key]
 $folder=Join-Path (Join-Path $root $serverId) $slug
 if((Test-Path -LiteralPath $folder) -and @(Get-ChildItem -LiteralPath $folder -Force).Count){throw 'Files already present; refusing to overwrite a rental.'}
 $installScript=Download-Official 'Install-CMDGameServer.ps1' ($cloud+'/downloads/game-installer.ps1') 'AcceptPublisherTerms'
 & $installScript -Game $names[$key] -ServerId $serverId -InstallRoot $root -SteamCmdPath $steam -Install -AcceptPublisherTerms
 if($LASTEXITCODE -and $LASTEXITCODE -ne 0){throw 'Official installer returned an error.'}
 $exe=Join-Path $folder ([string]$job.expectedExecutable).Replace('/','\')
 if(!(Test-Path -LiteralPath $exe -PathType Leaf)){throw 'Binary verification failed.'}
 $validation=Json (Join-Path $folder 'cmdhosting-steam-validation.json')
 if($validation.schema -cne 'cmd-hosting/steam-validation-v1' -or $validation.steamValidated -ne $true -or [string]$validation.appId -cne [string]$job.steamAppId -or [int]$validation.manifestStateFlags -ne 4){throw 'Complete Steam file validation receipt missing or wrong game.'}
 $manifest=Join-Path (Join-Path $folder 'steamapps') ('appmanifest_'+[string]$validation.appId+'.acf')
 if((Get-FileHash -LiteralPath $manifest -Algorithm SHA256).Hash.ToLowerInvariant() -cne [string]$validation.manifestSha256){throw 'Steam manifest changed after validation.'}
 $canon=if($key -eq 'ark-survival-ascended'){'ark-asa'}else{$key}
 Json-New (Join-Path $folder '.cmdhosting-initial-install.json') @{
  serverId=$serverId;gameKey=$canon;binaryVerified=$true;contentPrepared=$false;jobId=[string]$job.jobId}
 $contentScript=Download-Official 'Configure-CMDGameContent.ps1' ($cloud+'/downloads/game-content.ps1') 'cmdhosting-content-pending'
 $mapId=[string]$job.mapId
 if(!$mapId){throw 'Cloud returned no validated game map.'}
 $ids=@($job.modIds|Where-Object {$_})
 $approved=($job.publisherEntitlementApproved -eq $true)
 & $contentScript -GameKey $canon -ServerId $serverId -ServerRoot $folder -MapId $mapId -ModIds $ids -Slots $slots -Apply -PublisherEntitlementApproved:$approved
 $initial=Json (Join-Path $folder '.cmdhosting-initial-install.json')
 if($initial.contentPrepared -ne $true){throw 'Map content was not prepared.'}
 $args=''
 if($canon -eq 'dayz' -and $ids.Count){$args=Install-DayZMods $folder $ids $steam $exe}
 if($canon -eq 'ark-asa'){
  $data=Json (Join-Path $folder 'cmdhosting-launch.json')
  $args=@($data.arguments) -join ' '
 }
 $registered=Register-NewRental $folder $canon $serverId $args
 Write-Log ('New server registry status: '+$registered)
 if($registered -ne 'new-rental-added-with-backup' -and $registered -ne 'existing-rental-entry-preserved'){
  throw ('Server binaries installed but Dashboard runtime registration failed: '+$registered+'. Check Mods Agent configuration before marking this rental ready.')
 }
 $startup=Start-NewRental $folder $canon $serverId $args
 Write-Log ('New rental startup status: '+$startup)
 $report=Api '/v1/provisioning/agent/report' @{nodeId=[string]$conf.nodeId;jobId=[string]$job.jobId;resultCode='content_prepared';fileVerification=$validation}
 if(!$report.ok){throw 'Cloud did not confirm game/map content preparation.'}
 Write-Log ('Binaries and initial map prepared for '+$canon+'. Server startup and external connectivity not yet verified.')
}catch{
 Write-Log ('Rental requires attention: '+$_.Exception.Message)
 if($job -and $job.jobId -and $conf){
  try{[void](Api '/v1/provisioning/agent/report' @{nodeId=[string]$conf.nodeId;jobId=[string]$job.jobId;resultCode='needs_attention'})}catch{}
 }
 exit 1
}finally{if($lock){$lock.Dispose()}}
