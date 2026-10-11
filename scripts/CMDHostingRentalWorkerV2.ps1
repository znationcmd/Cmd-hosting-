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
 if(!(Test-Path -LiteralPath $secretFile -PathType Leaf)){throw 'Machine has not been paired with CMD Hosting cloud.'}
 $safe=(Get-Content -LiteralPath $secretFile -Raw -Encoding UTF8).Trim()|ConvertTo-SecureString
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
 $id=Join-Path $home 'agent-id.json'
 if(Test-Path -LiteralPath $id){return [string](Json $id).agentId}
 $v='host-'+[guid]::NewGuid().ToString()
 Json-New $id @{agentId=$v}
 return $v
}
function One-Time-Pair(){
 if(Test-Path -LiteralPath $secretFile){return}
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
 if($matches.Count){return 'existing-rental-entry-preserved'}
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
if($Diagnose){
 Write-Host 'CMD Hosting Rental Worker V2 — lecture seule'
 Write-Host ('Tache Windows : '+$(if(Get-ScheduledTask -TaskName $task -ErrorAction SilentlyContinue){'existante'}else{'absente'}))
 Write-Host ('Association V5 : '+(!!(Existing-Node)))
 Write-Host ('Jeton de machine : '+(Test-Path -LiteralPath $secretFile))
 Write-Host ('Config locale : '+(Test-Path -LiteralPath $settings))
 exit 0
}
if($Install){
 if(Get-ScheduledTask -TaskName $task -ErrorAction SilentlyContinue){
  Write-Log 'Worker task already exists. Refusing duplicate registration.'
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
 $reply=Api '/v1/provisioning/agent/claim' @{nodeId=[string]$conf.nodeId}
 if(!$reply.ok -or !$reply.job){Write-Log 'No authorized paid rental work available.';exit 0}
 $job=$reply.job
 $names=@{dayz='DayZ';'ark-asa'='ARK Ascended';'ark-survival-ascended'='ARK Ascended';'arma-reforger'='Arma Reforger';'7dtd'='7 Days to Die'}
 $key=[string]$job.gameKey
 if(!$names.ContainsKey($key)){throw 'Game not allowed on Windows rental worker.'}
 if($job.platform -notin @('pc','crossplay') -or [string]$job.action -ne 'install_steamcmd_in_isolated_rental_directory'){throw 'Invalid job platform or command.'}
 $serverId=[string]$job.serverId
 if($serverId -notmatch '^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$'){throw 'Invalid server identifier.'}
 $slug=@{dayz='dayz';'ark-asa'='ark-asa';'ark-survival-ascended'='ark-asa';'arma-reforger'='arma-reforger';'7dtd'='7dtd'}[$key]
 $folder=Join-Path (Join-Path $root $serverId) $slug
 if((Test-Path -LiteralPath $folder) -and @(Get-ChildItem -LiteralPath $folder -Force).Count){throw 'Files already present; refusing to overwrite a rental.'}
 $installScript=Download-Official 'Install-CMDGameServer.ps1' ($cloud+'/downloads/game-installer.ps1') 'AcceptPublisherTerms'
 & $installScript -Game $names[$key] -ServerId $serverId -InstallRoot $root -SteamCmdPath $steam -Install -AcceptPublisherTerms
 if($LASTEXITCODE -and $LASTEXITCODE -ne 0){throw 'Official installer returned an error.'}
 $exe=Join-Path $folder ([string]$job.expectedExecutable).Replace('/','\')
 if(!(Test-Path -LiteralPath $exe -PathType Leaf)){throw 'Binary verification failed.'}
 $canon=if($key -eq 'ark-survival-ascended'){'ark-asa'}else{$key}
 Json-New (Join-Path $folder '.cmdhosting-initial-install.json') @{
  serverId=$serverId;gameKey=$canon;binaryVerified=$true;contentPrepared=$false;jobId=[string]$job.jobId}
 $contentScript=Download-Official 'Configure-CMDGameContent.ps1' 'https://raw.githubusercontent.com/znationcmd/Cmd-hosting-/4bbcf85e21abcf3c2b0720037c9cce6edf9407ca/scripts/Configure-CMDGameContent.ps1' 'cmdhosting-content-pending'
 $mapId=[string]$job.mapId
 if(!$mapId){throw 'Cloud returned no validated game map.'}
 $ids=@($job.modIds|Where-Object {$_})
 $approved=($job.publisherEntitlementApproved -eq $true)
 & $contentScript -GameKey $canon -ServerId $serverId -ServerRoot $folder -MapId $mapId -ModIds $ids -Slots 10 -Apply -PublisherEntitlementApproved:$approved
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
 $report=Api '/v1/provisioning/agent/report' @{nodeId=[string]$conf.nodeId;jobId=[string]$job.jobId;resultCode='content_prepared'}
 if(!$report.ok){throw 'Cloud did not confirm game/map content preparation.'}
 Write-Log ('Binaries and initial map prepared for '+$canon+'. Server startup and external connectivity not yet verified.')
}catch{
 Write-Log ('Rental requires attention: '+$_.Exception.Message)
 if($job -and $job.jobId -and $conf){
  try{[void](Api '/v1/provisioning/agent/report' @{nodeId=[string]$conf.nodeId;jobId=[string]$job.jobId;resultCode='needs_attention'})}catch{}
 }
 exit 1
}finally{if($lock){$lock.Dispose()}}
