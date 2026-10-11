# CMD Hosting Rental Worker v1 - Windows 11; separate from the existing V5 and mods agent.
# Installs only paid, verified and allowlisted PC rentals claimed from CMD Hosting Cloud Agents.
# Does NOT manage payments, launch servers, install custom maps/mods or overwrite existing rentals.
[CmdletBinding()]
param([switch]$Install,[switch]$Once,[switch]$Diagnose)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$home=Join-Path $env:LOCALAPPDATA 'CMDHosting\RentalWorker'
$localScript=Join-Path $home 'CMDHostingRentalWorker.ps1'
$settingsPath=Join-Path $home 'settings.json'
$logPath=Join-Path $home 'activity.log'
$tokenPath=Join-Path $env:LOCALAPPDATA 'CMDHosting\ModsAgent\agent-token.dpapi'
$modsSettings=Join-Path $env:LOCALAPPDATA 'CMDHosting\ModsAgent\settings.json'
$hostAuth=Join-Path $env:APPDATA 'CMDHostingAgent\auth.json'
$service='https://cmd-hosting-cloud-agents-production.up.railway.app'
$task='CMDHostingRentalWorker'
New-Item -ItemType Directory -Path $home -Force | Out-Null

function Write-Log([string]$text){
  $msg='['+(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')+'] '+$text
  Write-Host $msg
  Add-Content -LiteralPath $logPath -Value $msg -Encoding UTF8
}
function Read-Json([string]$p){
  if(!(Test-Path -LiteralPath $p -PathType Leaf)){throw "Missing local configuration."}
  return Get-Content -LiteralPath $p -Raw -Encoding UTF8 | ConvertFrom-Json
}
function Node-Id {
  $data=Read-Json $hostAuth
  foreach($key in @('nodeId','node_id','nodeID','node','id')){
    $prop=$data.PSObject.Properties[$key]
    if($prop -and $prop.Value -is [string] -and $prop.Value -match '^[A-Za-z0-9][A-Za-z0-9._:-]{2,110}$'){return [string]$prop.Value}
  }
  throw 'Existing V5 node identifier not readable. The worker does not invent a node identity.'
}
function Get-Token {
  if(!(Test-Path -LiteralPath $tokenPath -PathType Leaf)){throw 'Existing DPAPI mods agent pairing missing.'}
  $protected=(Get-Content -LiteralPath $tokenPath -Raw -Encoding UTF8).Trim() | ConvertTo-SecureString
  $ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($protected)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}
function Choose-Steam {
  if(Test-Path -LiteralPath $modsSettings){
    $mods=Read-Json $modsSettings
    if($mods.steamCmdExe -and (Test-Path -LiteralPath ([string]$mods.steamCmdExe) -PathType Leaf)){
      return [string]$mods.steamCmdExe
    }
  }
  foreach($candidate in @('C:\SteamCMD\steamcmd.exe','C:\steamcmd\steamcmd.exe','C:\CMD-Servers\steamcmd\steamcmd.exe')){
    if(Test-Path -LiteralPath $candidate -PathType Leaf){return $candidate}
  }
  throw 'SteamCMD not installed or its path not configured in the existing mods agent.'
}
function Validate-Root([string]$p){
  if($p -notmatch '^[A-Za-z]:\\[A-Za-z0-9_ .\\-]+$' -or $p -match '\\\.\.(\\|$)'){throw 'Unsafe installation root.'}
  $full=[IO.Path]::GetFullPath($p).TrimEnd('\')
  if($full -match '(?i)^([a-z]:\\(windows|program files( \(x86\))?|users|programdata))(\\|$)'){throw 'Protected Windows directory.'}
  return $full
}
function Invoke-Api([string]$endpoint,[string]$nodeId,[hashtable]$extra){
  $payload=@{nodeId=$nodeId}
  if($extra){foreach($key in $extra.Keys){$payload[$key]=$extra[$key]}}
  $token=Get-Token
  try {
    return Invoke-RestMethod -Method Post -Uri ($service+$endpoint) -Headers @{Authorization=('Bearer '+$token)} -ContentType 'application/json' -Body (ConvertTo-Json $payload -Compress) -TimeoutSec 30
  } finally { $token=$null }
}
function Verify-Script([string]$p){
  $errors=$null;$tokens=$null
  [void][System.Management.Automation.Language.Parser]::ParseFile($p,[ref]$tokens,[ref]$errors)
  if($errors -and $errors.Count){throw 'Official SteamCMD installer failed script parser validation.'}
  if(!(Select-String -LiteralPath $p -SimpleMatch 'AcceptPublisherTerms' -Quiet)){throw 'Unexpected installer contents.'}
}
function Accepted-By-Owner {
  try {
    Add-Type -AssemblyName PresentationFramework
    $answer=[System.Windows.MessageBox]::Show(
      'Autoriser CMD Hosting a installer automatiquement des serveurs PC payes et verifies depuis SteamCMD dans C:\CMD-Servers ? Les fichiers existants ne seront pas ecrases. Vous devez respecter les conditions des editeurs.','CMD Hosting - autorisation unique','YesNo','Question')
    return [string]$answer -eq 'Yes'
  } catch { return $false }
}
if($Diagnose){
  Write-Host 'CMD Hosting Rental Worker diagnostic (no game changes).'
  Write-Host ('Paired V5 file present: '+(Test-Path $hostAuth))
  Write-Host ('DPAPI mods pairing present: '+(Test-Path $tokenPath))
  Write-Host ('Worker settings present: '+(Test-Path $settingsPath))
  $t=Get-ScheduledTask -TaskName $task -ErrorAction SilentlyContinue
  Write-Host ('Windows task: '+$(if($t){$t.State}else{'not installed'}))
  Write-Host ('Local log: '+$logPath)
  exit 0
}
if($Install){
  [void](Node-Id)
  [void](Get-Token)
  $steam=Choose-Steam
  $root=Validate-Root 'C:\CMD-Servers'
  if(!(Accepted-By-Owner)){Write-Log 'Installation refused or publisher conditions not accepted.';exit 1}
  if($PSCommandPath -ne $localScript){Copy-Item -LiteralPath $PSCommandPath -Destination $localScript -Force}
  $newSettings=@{installRoot=$root;steamCmdPath=$steam;ownerAcceptedPublisherTerms=$true}
  $newSettings|ConvertTo-Json|Set-Content -LiteralPath $settingsPath -Encoding UTF8
  $ps=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  $args='-NoLogo -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "'+$localScript+'" -Once'
  $action=New-ScheduledTaskAction -Execute $ps -Argument $args
  $atLogon=New-ScheduledTaskTrigger -AtLogOn -User ([Security.Principal.WindowsIdentity]::GetCurrent().Name)
  $every10=New-ScheduledTaskTrigger -Once -At ((Get-Date).AddMinutes(2)) -RepetitionInterval (New-TimeSpan -Minutes 10) -RepetitionDuration (New-TimeSpan -Days 3650)
  $principal=New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
  $options=New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 7)
  Register-ScheduledTask -TaskName $task -Action $action -Trigger @($atLogon,$every10) -Principal $principal -Settings $options -Description 'CMD Hosting paid PC rentals - verified SteamCMD worker' -Force | Out-Null
  Write-Log 'Worker schedule active. Existing V5 and Mods tasks were not changed.'
  exit 0
}
if(!$Once){throw 'Run with -Install, -Diagnose or -Once; never as an interactive shell.'}
$job=$null
$node=''
$lock=$null
$lockFile=Join-Path $home 'worker.lock'
try { $lock=[IO.File]::Open($lockFile,'OpenOrCreate','ReadWrite','None') }
catch { Write-Log 'Worker already running; skipping duplicate.';exit 0 }
try{
  $config=Read-Json $settingsPath
  if($config.ownerAcceptedPublisherTerms -ne $true){throw 'Publisher conditions not accepted.'}
  $root=Validate-Root ([string]$config.installRoot)
  if(!(Test-Path -LiteralPath $root -PathType Container)){New-Item -Path $root -ItemType Directory -Force|Out-Null}
  $steam=[string]$config.steamCmdPath
  if([IO.Path]::GetFileName($steam) -ine 'steamcmd.exe' -or !(Test-Path -LiteralPath $steam -PathType Leaf)){throw 'SteamCMD executable missing.'}
  $node=Node-Id
  $reply=Invoke-Api '/v1/provisioning/agent/claim' $node @{}
  if(!$reply.ok -or !$reply.job){Write-Log 'No eligible paid PC rental awaiting install.';exit 0}
  $job=$reply.job
  $games=@{
    dayz='DayZ';'ark-asa'='ARK Ascended';'ark-survival-ascended'='ARK Ascended';
    'arma-reforger'='Arma Reforger';'7dtd'='7 Days to Die'
  }
  $key=[string]$job.gameKey;$game=$games[$key]
  if(!$game -or $job.platform -ne 'pc' -or [string]$job.action -ne 'install_steamcmd_in_isolated_rental_directory'){
    throw 'Cloud sent a non-allowlisted game or platform.'
  }
  $serverId=[string]$job.serverId
  if($serverId -notmatch '^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$'){throw 'Invalid server ID from cloud.'}
  $slug=@{dayz='dayz';'ark-asa'='ark-asa';'ark-survival-ascended'='ark-asa';'arma-reforger'='arma-reforger';'7dtd'='7dtd'}[$key]
  $folder=Join-Path (Join-Path $root $serverId) $slug
  if((Test-Path $folder) -and @(Get-ChildItem $folder -Force -ErrorAction SilentlyContinue).Count){throw 'Existing server directory; refusing overwrite.'}
  $installer=Join-Path $home 'official-steamcmd-install.ps1'
  Invoke-WebRequest -UseBasicParsing -Uri ($service+'/downloads/game-installer.ps1') -OutFile $installer -TimeoutSec 40
  Verify-Script $installer
  Write-Log ('Installing paid Windows server '+$key+' in an isolated directory.')
  & $installer -Game $game -ServerId $serverId -InstallRoot $root -SteamCmdPath $steam -Install -AcceptPublisherTerms
  $expected=Join-Path $folder ([string]$job.expectedExecutable).Replace('/','\')
  if(!(Test-Path -LiteralPath $expected -PathType Leaf)){throw 'Expected server executable is missing; not marking installation successful.'}
  $result=Invoke-Api '/v1/provisioning/agent/report' $node @{jobId=[string]$job.jobId;resultCode='binary_verified'}
  if(!$result.ok){throw 'Server executable exists but remote receipt was not accepted.'}
  Write-Log ('Server files verified on disk. Server not yet launched; maps and mods require separate verification.')
}catch{
  Write-Log ('Rental worker requires attention: '+$_.Exception.Message)
  if($job -and $job.jobId -and $node){
    try{[void](Invoke-Api '/v1/provisioning/agent/report' $node @{jobId=[string]$job.jobId;resultCode='needs_attention'})}catch{}
  }
  exit 1
}finally{if($lock){$lock.Dispose()}}
