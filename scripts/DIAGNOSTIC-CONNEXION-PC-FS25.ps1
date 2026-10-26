#requires -version 5.1
# CMD Hosting — diagnostic lecture seule de liaison du PC et des vrais mods FS25.
[CmdletBinding()]param()
Set-StrictMode -Version Latest
$ErrorActionPreference='Continue'
function Say([string]$message){Write-Host ('[CMD Hosting] '+$message)}
Say 'Diagnostic PC / CMD Hosting / Farming Simulator 25 — aucun fichier modifié.'
$tasks=@(Get-ScheduledTask -ErrorAction SilentlyContinue|Where-Object {$_.TaskName -match '^CMDHosting'})
if(!$tasks.Count){Say 'Aucune tâche CMDHosting visible : agent absent de cette session ou lancé manuellement.'}
foreach($task in $tasks){Say ('Agent Windows : '+$task.TaskName+' — '+$task.State)}
$portable=Join-Path $env:LOCALAPPDATA 'CMDHosting\PortableAgentV2\machine-token.dpapi'
Say ('Agent matériel Portable V2 : '+$(if(Test-Path -LiteralPath $portable){'Jeton chiffré présent'}else{'Aucun jeton trouvé dans cette session Windows'}))
Say 'Portable V2 = surveillance matérielle ; ne relie pas automatiquement ton compte Mes serveurs au PC.'
$modsConfig=Join-Path $env:LOCALAPPDATA 'CMDHosting\ModsAgent\settings.json'
Say ('Agent des mods : '+$(if(Test-Path -LiteralPath $modsConfig){'Paramètres présents (secret masqué)'}else{'Configuration absente dans cette session Windows'}))
$endpoints=@('https://cmd-hosting-web-production.up.railway.app/api/status','https://cmd-hosting-cloud-agents-production.up.railway.app/health','https://cmd-hosting-mods-api-production.up.railway.app/api/mods/status')
foreach($endpoint in $endpoints){
 try{
  $response=Invoke-WebRequest -Method Get -Uri $endpoint -UseBasicParsing -TimeoutSec 15
  Say ('Accessible : '+([Uri]$endpoint).Host+' HTTP '+[int]$response.StatusCode)
 }catch{
  $code='réseau ou authentification'
  try{$code=[string][int]$_.Exception.Response.StatusCode}catch{}
  Say ('Indisponible : '+([Uri]$endpoint).Host+' '+$code)
 }
}
$clientProfile=Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'My Games\FarmingSimulator2025'
$locations=@(
 (Join-Path $clientProfile 'mods'),
 (Join-Path $clientProfile 'dedicated_server\mods'),
 (Join-Path $env:SystemDrive 'CMD-Servers\cmd-fs25-personnel\mods'),
 (Join-Path $env:SystemDrive 'CMD-Servers\fs25\mods')
)
$found=@()
foreach($folder in $locations){
 if(!(Test-Path -LiteralPath $folder -PathType Container)){continue}
 $count=@(Get-ChildItem -LiteralPath $folder -Filter '*.zip' -File -ErrorAction SilentlyContinue).Count
 $found+=@{Path=$folder;Zips=$count}
 Say ('FS25 : '+$count+' fichiers ZIP détectés dans '+$folder)
}
if(!$found.Count){Say 'FS25 : aucun dossier mods dans les emplacements courants (un chemin personnalisé reste possible).'}
$programX86=[Environment]::GetEnvironmentVariable('ProgramFiles(x86)')
$gameCandidates=@()
if($programX86){
 $gameCandidates+=Join-Path $programX86 'Farming Simulator 25\dedicatedServer.exe'
 $gameCandidates+=Join-Path $programX86 'Farming Simulator 2025\dedicatedServer.exe'
}
$gameCandidates+=Join-Path $env:SystemDrive 'CMD-Servers\fs25\dedicatedServer.exe'
$serverExe=$gameCandidates|Where-Object {$_ -and (Test-Path -LiteralPath $_ -PathType Leaf)}|Select-Object -First 1
if($serverExe){Say ('Serveur natif FS25 présent : '+$serverExe)}
else{Say 'Serveur dédié FS25 non détecté aux emplacements courants (installation ailleurs possible).'}
$site='https://cmd-hosting-web-production.up.railway.app/#machines'
Say 'Pour relier ton compte : connecte-toi au site, ouvre Mes machines, puis clique Associer PC.'
Say 'Un agent HTTP 200 ne prouve pas que le compte du téléphone voit le même PC.'
Say 'Le code de liaison doit être saisi sur la machine Windows, jamais partagé dans le chat.'
Start-Process $site
Say 'Page Mes machines ouverte dans le navigateur Windows.'
