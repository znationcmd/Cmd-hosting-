#requires -version 5.1
# CMD Hosting Portable Agent V2 — independent and opt-in Windows host monitor.
# Machine detection and cloud synchronization; NO SteamCMD or game file writes.
[CmdletBinding()]
param([switch]$Install,[switch]$Once,[switch]$Diagnose)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$dir=Join-Path $env:LOCALAPPDATA 'CMDHosting\PortableAgentV2'
$state=Join-Path $env:USERPROFILE '.cmdhosting'
$tokenFile=Join-Path $dir 'machine-token.dpapi'
$scriptFile=Join-Path $dir 'Installer-CMDHostingPortableV2.ps1'
$agent=Join-Path $dir 'portable-host-agent.mjs'
$idFile=Join-Path $state 'host-id.json'
$taskName='CMDHostingPortableAgentV2'
$origin='https://raw.githubusercontent.com/znationcmd/Cmd-hosting-/272121bdebfaa4f0aaaca6d5f2a2be31e04979c8/provisioning/'
$cloud='https://cmd-hosting-cloud-agents-production.up.railway.app'
function NodePath(){
 $bin=Get-Command node.exe -ErrorAction SilentlyContinue
 if(!$bin){throw 'Node.js version 20 or later required.'}
 $v=(& $bin.Source --version)
 if($v -notmatch '^v([0-9]+)\.' -or [int]$Matches[1] -lt 20){throw 'Node.js version 20 or later required.'}
 return [string]$bin.Source
}
function GetId(){
 if(Test-Path -LiteralPath $idFile -PathType Leaf){
  $value=Get-Content -LiteralPath $idFile -Raw -Encoding UTF8 | ConvertFrom-Json
  if([string]$value.id -notmatch '^host-[0-9a-f-]{36}$'){throw 'Existing machine identity invalid.'}
  return [string]$value.id
 }
 New-Item -ItemType Directory -Force -Path $state|Out-Null
 $id='host-'+[guid]::NewGuid().ToString()
 [IO.File]::WriteAllText($idFile,(@{schema='cmd-hosting/host-id-v1';id=$id}|ConvertTo-Json)+[Environment]::NewLine,([Text.UTF8Encoding]::new($false)))
 return $id
}
function GetToken(){
 if(!(Test-Path -LiteralPath $tokenFile -PathType Leaf)){throw 'Machine not enrolled.'}
 $secure=(Get-Content -LiteralPath $tokenFile -Raw -Encoding UTF8).Trim()|ConvertTo-SecureString
 $ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
 try{return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)}
 finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}
}
function Enroll(){
 if(Test-Path -LiteralPath $tokenFile -PathType Leaf){return}
 $id=GetId
 $code=Read-Host 'CMD Hosting one-time enrollment code'
 if($code -notmatch '^[a-zA-Z0-9_-]{32,128}$'){throw 'Invalid enrollment code.'}
 $response=Invoke-RestMethod -Method Post -Uri ($cloud+'/v1/agents/enroll/claim') -ContentType 'application/json' -Body (@{agentId=$id;code=$code}|ConvertTo-Json -Compress) -TimeoutSec 30
 $code=$null
 if(!$response.ok -or !$response.machineToken){throw 'Cloud denied enrollment.'}
 $safe=ConvertTo-SecureString -String ([string]$response.machineToken) -AsPlainText -Force
 ConvertFrom-SecureString -SecureString $safe|Set-Content -LiteralPath $tokenFile -Encoding UTF8
}
if($Diagnose){
 Write-Host ('Portable V2 installed: '+(Test-Path -LiteralPath $agent))
 Write-Host ('Machine paired: '+(Test-Path -LiteralPath $tokenFile))
 Write-Host ('Windows task: '+$(if(Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue){'installed'}else{'absent'}))
 try{Write-Host ('Node: '+(NodePath))}catch{Write-Warning $_.Exception.Message}
 exit 0
}
if($Once){
 if(!(Test-Path -LiteralPath $agent -PathType Leaf)){throw 'Portable agent files not installed.'}
 $node=NodePath
 $env:CMD_HOST_STATE_DIR=$state
 $env:CMD_CLOUD_AGENT_TOKEN=GetToken
 try{
  & $node $agent --once
  if($LASTEXITCODE -ne 0){throw 'Heartbeat / cloud manifest synchronization failed.'}
 }finally{
  Remove-Item Env:\CMD_CLOUD_AGENT_TOKEN -ErrorAction SilentlyContinue
  Remove-Item Env:\CMD_HOST_STATE_DIR -ErrorAction SilentlyContinue
 }
 exit 0
}
if(!$Install){throw 'Use -Install, -Diagnose or -Once.'}
if(Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue){
 Write-Host 'Portable V2 is already installed. No duplicate added.'
 exit 0
}
if(Get-ScheduledTask -TaskName 'CMDHostingPortableAgent' -ErrorAction SilentlyContinue){
 throw 'Older portable monitor task detected. Refusing duplicate: migrate explicitly later.'
}
$node=NodePath
New-Item -ItemType Directory -Path $dir -Force|Out-Null
foreach($file in @('host-capability.mjs','machine-detection.mjs','portable-host-agent.mjs')){
 $target=Join-Path $dir $file
 $tmp=$target+'.download'
 Invoke-WebRequest -UseBasicParsing -Uri ($origin+$file) -OutFile $tmp -TimeoutSec 50
 if((Get-Item $tmp).Length -lt 2800){throw 'Unexpected or incomplete agent script.'}
 & $node --check $tmp
 if($LASTEXITCODE -ne 0){throw 'Machine detection agent syntax invalid.'}
 Move-Item -LiteralPath $tmp -Destination $target -Force
}
& $node $agent --diagnose
if($LASTEXITCODE -ne 0){throw 'Agent diagnostic failed.'}
Enroll
if($PSCommandPath -ne $scriptFile){Copy-Item -LiteralPath $PSCommandPath -Destination $scriptFile -ErrorAction Stop}
& $scriptFile -Once
$ps=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$action=New-ScheduledTaskAction -Execute $ps -Argument ('-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "'+$scriptFile+'" -Once')
$principal=New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
$atLogon=New-ScheduledTaskTrigger -AtLogOn -User ([Security.Principal.WindowsIdentity]::GetCurrent().Name)
$repeat=New-ScheduledTaskTrigger -Once -At ((Get-Date).AddMinutes(2)) -RepetitionInterval (New-TimeSpan -Minutes 10) -RepetitionDuration (New-TimeSpan -Days 3650)
$opts=New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger @($atLogon,$repeat) -Principal $principal -Settings $opts -Description 'Read-only CMD Hosting hardware detection and cloud manifest sync'|Out-Null
Write-Host 'CMD Hosting Portable V2 active; original agents and games remain untouched.'
