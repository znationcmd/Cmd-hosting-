# CMD Hosting — Portable agent optional Windows install (V1)
# Uses existing V5/Mods pairing on the owner's machine when possible.
# Creates a separate scheduled heartbeat; NEVER changes V5, mods, game files or rentals.
#requires -version 5.1
[CmdletBinding()]
param([switch]$Install,[switch]$Once,[switch]$Diagnose)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$root=Join-Path $env:LOCALAPPDATA 'CMDHosting\PortableAgent'
$tokenHere=Join-Path $root 'portable-token.dpapi'
$modsToken=Join-Path $env:LOCALAPPDATA 'CMDHosting\ModsAgent\agent-token.dpapi'
$monitor=Join-Path $root 'portable-host-agent.mjs'
$probe=Join-Path $root 'host-capability.mjs'
$task='CMDHostingPortableAgent'
$base='https://raw.githubusercontent.com/znationcmd/Cmd-hosting-/28803c745190cecd6b54365a360a01af81266ed8/provisioning/'
function FindNode {
 $cmd=Get-Command node.exe -ErrorAction SilentlyContinue
 if(!$cmd){throw 'Node.js 20+ requis pour cet agent portable (les anciens agents restent inchanges).'}
 $version=(& $cmd.Source --version)
 if($version -notmatch '^v([0-9]+)\.' -or [int]$Matches[1] -lt 20){throw 'Node.js 20+ requis.'}
 return [string]$cmd.Source
}
function SecureTokenPath {
 if(Test-Path -LiteralPath $modsToken -PathType Leaf){return $modsToken}
 if(Test-Path -LiteralPath $tokenHere -PathType Leaf){return $tokenHere}
 return ''
}
function WithToken {
 param([string]$nodeExe)
 $source=SecureTokenPath
 if(!$source){throw 'Cette machine doit d abord etre associee avec un jeton valide.'}
 $secured=(Get-Content -LiteralPath $source -Raw -Encoding UTF8).Trim()|ConvertTo-SecureString
 $ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secured)
 try{
  $env:CMD_CLOUD_AGENT_TOKEN=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  & $nodeExe $monitor --once
  if($LASTEXITCODE -ne 0){throw 'La supervision Railway a refuse la connexion.'}
 }finally{
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  Remove-Item Env:\CMD_CLOUD_AGENT_TOKEN -ErrorAction SilentlyContinue
 }
}
if($Diagnose){
 Write-Host ('Agent portable : '+(Test-Path -LiteralPath $monitor))
 Write-Host ('Association securisee disponible : '+!!(SecureTokenPath))
 try{Write-Host ('Node : '+(FindNode))}catch{Write-Warning $_.Exception.Message}
 $existing=Get-ScheduledTask -TaskName $task -ErrorAction SilentlyContinue
 Write-Host ('Tache Windows : '+$(if($existing){$existing.State}else{'non installee'}))
 exit 0
}
if($Once){
 if(!(Test-Path -LiteralPath $monitor -PathType Leaf)){throw 'Agent portable non installe. Les agents existants ne sont pas concernes.'}
 WithToken (FindNode)
 exit 0
}
if(!$Install){throw 'Utiliser -Install, -Once ou -Diagnose.'}
$node=FindNode
New-Item -ItemType Directory -Path $root -Force|Out-Null
if(Get-ScheduledTask -TaskName $task -ErrorAction SilentlyContinue){
 Write-Host 'La tache portable est deja installee. Aucun doublon cree.'
 exit 0
}
foreach($entry in @(@('host-capability.mjs',$probe),@('portable-host-agent.mjs',$monitor))){
 $tmp=$entry[1]+'.download'
 Invoke-WebRequest -UseBasicParsing -Uri ($base+$entry[0]) -OutFile $tmp -TimeoutSec 30
 if((Get-Item $tmp).Length -lt 2800){Remove-Item $tmp -Force;throw 'Telechargement incomplet.'}
 Move-Item -LiteralPath $tmp -Destination $entry[1] -Force
}
& $node $monitor --diagnose
if($LASTEXITCODE -ne 0){throw 'Diagnostic portable invalide.'}
if(!(SecureTokenPath)){
 Write-Host 'Autorisation unique d association de cette nouvelle machine avec Railway.'
 $secret=Read-Host 'Jeton Railway CMD_CLOUD_AGENT_TOKEN (masque)' -AsSecureString
 if(!$secret){throw 'Association annulee.'}
 ConvertFrom-SecureString $secret|Set-Content -LiteralPath $tokenHere -Encoding UTF8
}
WithToken $node
$ps=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$arg='-NoLogo -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "'+$PSCommandPath+'" -Once'
$action=New-ScheduledTaskAction -Execute $ps -Argument $arg
$who=[Security.Principal.WindowsIdentity]::GetCurrent().Name
$atLogon=New-ScheduledTaskTrigger -AtLogOn -User $who
$every10=New-ScheduledTaskTrigger -Once -At ((Get-Date).AddMinutes(2)) -RepetitionInterval (New-TimeSpan -Minutes 10) -RepetitionDuration (New-TimeSpan -Days 3650)
$principal=New-ScheduledTaskPrincipal -UserId $who -LogonType Interactive -RunLevel Limited
$settings=New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew
$installedScript=Join-Path $root 'Installer-CMDHostingPortable.ps1'
if($PSCommandPath -ne $installedScript){Copy-Item -LiteralPath $PSCommandPath -Destination $installedScript -Force}
$arg='-NoLogo -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "'+$installedScript+'" -Once'
$action=New-ScheduledTaskAction -Execute $ps -Argument $arg
Register-ScheduledTask -TaskName $task -Action $action -Trigger @($atLogon,$every10) -Principal $principal -Settings $settings -Description 'CMD Hosting portable cloud heartbeat: no game changes' | Out-Null
Write-Host 'Supervision portable active. V5, mods et installations de jeux inchanges.'
