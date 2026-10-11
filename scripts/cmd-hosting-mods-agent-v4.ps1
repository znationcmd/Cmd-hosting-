# CMD Hosting Windows Mods Agent V4 — DayZ PC / ARK ASA / Arma Reforger / Arma 3
# Run -Install once. Thereafter Windows Task Scheduler runs -Once every 10 minutes.
# Never stores a Steam password or restarts a game while players may be connected.
[CmdletBinding()]
param(
    [switch]$Install,
    [switch]$Once,
    [switch]$Diagnose,
    [string]$ServersFile = '',
    [string]$SteamCmdExe = '',
    [string]$SteamUser = '',
    [string]$ApiUrl = 'https://cmd-hosting-mods-api-production.up.railway.app'
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$homeFolder = Join-Path $env:LOCALAPPDATA 'CMDHosting\ModsAgent'
$settingsFile = Join-Path $homeFolder 'settings.json'
$secretFile = Join-Path $homeFolder 'agent-token.dpapi'
$stateFile = Join-Path $homeFolder 'state.json'
$logFile = Join-Path $homeFolder 'history.log'
New-Item -ItemType Directory -Path $homeFolder -Force | Out-Null

function Log($message) {
    $line = '{0} {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), [string]$message
    Write-Host $line
    Add-Content -LiteralPath $logFile -Value $line -Encoding UTF8
}
function LoadJson($file, $fallback) {
    if (!(Test-Path -LiteralPath $file -PathType Leaf)) { return $fallback }
    try { return (Get-Content -LiteralPath $file -Raw -Encoding UTF8 | ConvertFrom-Json) }
    catch { throw "Invalid JSON file: $file" }
}
function SaveJson($file,$data) {
    $tmp = $file + '.tmp'
    $json = ConvertTo-Json -InputObject $data -Depth 24
    [IO.File]::WriteAllText($tmp,$json,([System.Text.UTF8Encoding]::new($false)))
    Move-Item -LiteralPath $tmp -Destination $file -Force
}
function PlainToken($secure) {
    $pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}
function FindServersFile {
    $candidates=@(
        (Join-Path $env:LOCALAPPDATA 'CMDHosting\servers.json'),
        (Join-Path $env:LOCALAPPDATA 'CMD-Hosting\servers.json'),
        (Join-Path $env:APPDATA 'CMDHosting\servers.json'),
        (Join-Path $env:ProgramData 'CMDHosting\servers.json'),
        'C:\CMD-Hosting\servers.json',
        'C:\CMD-Servers\servers.json'
    )
    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate -PathType Leaf) { return $candidate }
    }
    return ''
}

function Show-Diagnostics {
    Write-Host 'CMD Hosting Mods Agent - Diagnostic Windows' -ForegroundColor Cyan
    Write-Host ('PowerShell version : '+$PSVersionTable.PSVersion)
    $found=$ServersFile
    if (!$found) {$found=FindServersFile}
    if (!$found -or !(Test-Path -LiteralPath $found -PathType Leaf)) {
        Write-Warning 'servers.json introuvable. La machine peut etre connectee a Railway mais aucun serveur de jeu localise.'
        Write-Host 'Relance avec -ServersFile "C:\chemin\servers.json".'
        return
    }
    Write-Host ('Fichier des serveurs : '+$found)
    try {$data=LoadJson $found $null}
    catch {Write-Warning ('JSON invalide : '+$_.Exception.Message);return}
    $entries=@($data.servers | Where-Object {$null -ne $_})
    Write-Host ('Nombre de serveurs declares : '+$entries.Count)
    if (!$entries.Count) {Write-Warning 'ZERO SERVEUR. Aucun mod ne pourra etre installe avant de configurer un serveur dans CMD Hosting Agent.'}
    foreach ($entry in $entries) {
        $exe=[string]$entry.exe
        $game=if($exe -match 'DayZServer_x64[.]exe$'){'DayZ PC'}elseif($exe -match 'ArkAscendedServer[.]exe$'){'ARK ASA'}else{'Non configure'}
        $valid=!!($exe -and (Test-Path -LiteralPath $exe -PathType Leaf))
        Write-Host (' - '+[string]$entry.id+' : '+$game+' ; executable trouve : '+$valid)
    }
    Write-Host ('Module installe : '+(Test-Path -LiteralPath $settingsFile))
    Write-Host ('Jeton enregistre : '+(Test-Path -LiteralPath $secretFile))
    if ((Test-Path -LiteralPath $settingsFile) -and (Test-Path -LiteralPath $secretFile)) {
        try {
            $saved=LoadJson $settingsFile $null
            $secure=(Get-Content -LiteralPath $secretFile -Raw | ConvertTo-SecureString)
            $key=PlainToken $secure
            $uri=([string]$saved.apiUrl).TrimEnd('/')+'/api/mods/agent/manifest'
            $result=Invoke-RestMethod -Uri $uri -Method Get -Headers @{Authorization=('Bearer '+$key)} -TimeoutSec 20
            Write-Host ('Connexion API : OK ; mods a traiter : '+@($result.items).Count) -ForegroundColor Green
        } catch {Write-Warning ('Connexion API refusee : '+$_.Exception.Message)}
    }
    try {
        $task=Get-ScheduledTask -TaskName 'CMDHostingModsAgent' -ErrorAction Stop
        Write-Host ('Tache Windows : '+$task.State)
    }catch{Write-Host 'Tache Windows : non installee'}
}
if ($Diagnose) {Show-Diagnostics; exit 0}

if ($Install) {
    if (!$ServersFile) { $ServersFile=FindServersFile }
    if (!$ServersFile) { $ServersFile=Read-Host 'Full path to existing CMD Hosting servers.json' }
    if (!(Test-Path -LiteralPath $ServersFile -PathType Leaf)) {
        throw 'CMD Hosting servers.json not found. Configure the existing CMD Hosting Agent first.'
    }
    $detected=LoadJson $ServersFile $null
    $entries=@($detected.servers | Where-Object {$null -ne $_})
    if (!$entries.Count) {
        Write-Warning 'Machine associee, mais ZERO serveur dans servers.json.'
        throw 'Configure le chemin du serveur DayZ PC ou ARK ASA dans CMD Hosting Agent avant d installer ce module.'
    }
    foreach ($entry in $entries) {
        $exe=[string]$entry.exe
        if ($exe -and !(Test-Path -LiteralPath $exe -PathType Leaf)) {
            Write-Warning ('Serveur '+$entry.id+' : executable introuvable '+$exe)
        }
    }
    Write-Host 'Diagnostic initial :'
    Show-Diagnostics

    if (!$SteamCmdExe) {
        foreach($candidate in @('C:\SteamCMD\steamcmd.exe','C:\steamcmd\steamcmd.exe','C:\CMD-Servers\steamcmd\steamcmd.exe')) {
            if (Test-Path -LiteralPath $candidate -PathType Leaf) { $SteamCmdExe=$candidate;break }
        }
    }
    if (!$SteamCmdExe) { $SteamCmdExe=Read-Host 'Full path to steamcmd.exe (required for DayZ PC)' }
    if (!$SteamUser) { $SteamUser=Read-Host 'Steam account name used by SteamCMD (password is never stored)' }
    if (!(Test-Path -LiteralPath $secretFile -PathType Leaf)) {
        Write-Host 'Get CMD_MODS_AGENT_TOKEN from Railway > CMD Hosting > cmd-hosting-mods-api > Variables.'
        $credential=Read-Host 'Private CMD Mods Agent token' -AsSecureString
        if (!$credential -or !(PlainToken $credential)) { throw 'Pairing token missing' }
        ConvertFrom-SecureString -SecureString $credential | Set-Content -LiteralPath $secretFile -Encoding UTF8
    }
    SaveJson $settingsFile @{
        apiUrl=$ApiUrl.TrimEnd('/'); serversFile=(Resolve-Path -LiteralPath $ServersFile).Path
        steamCmdExe=$SteamCmdExe; steamUser=$SteamUser
    }
    $installedFile=Join-Path $homeFolder 'cmd-hosting-mods-agent.ps1'
    if ($PSCommandPath -ne $installedFile) { Copy-Item -LiteralPath $PSCommandPath -Destination $installedFile -Force }
    $engine=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    $action=New-ScheduledTaskAction -Execute $engine -Argument ('-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "'+$installedFile+'" -Once')
    $trigger=New-ScheduledTaskTrigger -Once -At ((Get-Date).AddMinutes(2)) -RepetitionInterval (New-TimeSpan -Minutes 10) -RepetitionDuration (New-TimeSpan -Days 3650)
    $principal=New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited

    # Confirme les droits et la communication avant la tache planifiee.
    try {
        $sec=(Get-Content -LiteralPath $secretFile -Raw | ConvertTo-SecureString)
        $token=PlainToken $sec
        $manifest=Invoke-RestMethod -Uri ($ApiUrl.TrimEnd('/')+'/api/mods/agent/manifest') -Method Get -Headers @{Authorization=('Bearer '+$token)} -TimeoutSec 20
        Write-Host ('Connexion API : OK. Mods en attente : '+@($manifest.items).Count) -ForegroundColor Green
    } catch {
        throw ('Connexion du module impossible. Verifie CMD_MODS_AGENT_TOKEN dans Railway. Detail : '+$_.Exception.Message)
    }
    Register-ScheduledTask -TaskName 'CMDHostingModsAgent' -Description 'Automatic DayZ PC and ARK ASA mod synchronization for CMD Hosting' -Action $action -Trigger $trigger -Principal $principal -Force | Out-Null
    Log 'Tache Windows installee. Aucun fichier de jeu modifie pendant la configuration.'
    exit 0
}
if (!(Test-Path -LiteralPath $settingsFile) -or !(Test-Path -LiteralPath $secretFile)) {
    throw 'Run this script once with -Install, then select a CMD Hosting server.'
}
$config=LoadJson $settingsFile $null
if (!$config -or !$config.serversFile) { throw 'Missing settings' }
$secureToken=(Get-Content -LiteralPath $secretFile -Raw -Encoding UTF8).Trim() | ConvertTo-SecureString
$apiKey=PlainToken $secureToken
$api=([string]$config.apiUrl).TrimEnd('/')
$headers=@{Authorization='Bearer '+$apiKey}
$apiKey=$null

function ReportResult($mod,$status) {
    try {
        $payload=@{modId=[string]$mod.modId;state=[string]$status} | ConvertTo-Json -Compress
        Invoke-RestMethod -Method Post -Uri "$api/api/mods/agent/report" -Headers $headers -ContentType 'application/json' -Body $payload -TimeoutSec 20 | Out-Null
    } catch { Log ('Failed to send installation status: '+$_.Exception.Message) }
}
function IsGameRunning($executable) {
    if (!$executable) { return $false }
    $name=[IO.Path]::GetFileNameWithoutExtension([string]$executable)
    return @((Get-Process -Name $name -ErrorAction SilentlyContinue)).Count -gt 0
}
function BackupServers($path) {
    Copy-Item -LiteralPath $path -Destination ($path+'.mods-backup-'+(Get-Date -Format 'yyyyMMddHHmmss')) -ErrorAction Stop
}
function MatchServer($target,$entries,$gameKey) {
    $matches=@($entries | Where-Object {$_.id -eq $target})
    if ($matches.Count -eq 1) { return $matches[0] }
    $fallback=@($entries | Where-Object {$_.id -eq $gameKey})
    if ($fallback.Count -eq 1) { return $fallback[0] }
    return $null
}
function FindSteamCmd($candidate) {
    if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)) {return (Resolve-Path -LiteralPath $candidate).Path}
    $known=Get-Command steamcmd.exe -ErrorAction SilentlyContinue
    if ($known) {return $known.Source}
    return $null
}
function InstallDayZ($mod,$server,$steamExe,$steamAccount) {
    $id=[string]$mod.itemId
    if ($id -notmatch '^[1-9][0-9]{0,19}$') {throw 'Invalid Steam Workshop mod ID'}
    if (!$steamExe) {throw 'SteamCMD is not configured'}
    if (!$steamAccount) {throw 'Steam username is not configured'}
    $serverExe=[string]$server.exe
    if ([IO.Path]::GetFileName($serverExe) -ine 'DayZServer_x64.exe') {
        throw 'This server is not configured as a DayZ PC dedicated server'
    }
    if (!(Test-Path -LiteralPath $serverExe -PathType Leaf)) {throw 'DayZ server executable not found'}
    $root=[string]$server.cwd
    if (!$root) {$root=Split-Path -Parent $serverExe}
    if (!(Test-Path -LiteralPath $root -PathType Container)) {throw 'DayZ server directory missing'}
    if (IsGameRunning $serverExe) {return 'waiting'}
    Log ('SteamCMD DayZ 221100 workshop item '+$id)
    & $steamExe '+force_install_dir' $root '+login' $steamAccount '+workshop_download_item' '221100' $id 'validate' '+quit' | Out-Null
    if ($LASTEXITCODE -ne 0) {throw ('SteamCMD failed (exit '+$LASTEXITCODE+'). Log in to SteamCMD interactively first if Steam Guard is required.')}
    $steamRoot=Split-Path -Parent $steamExe
    $sources=@(
        (Join-Path $root ('steamapps\workshop\content\221100\'+$id)),
        (Join-Path $steamRoot ('steamapps\workshop\content\221100\'+$id))
    )
    $src=$null
    foreach ($candidate in $sources) {
        if (Test-Path -LiteralPath $candidate -PathType Container) {$src=$candidate;break}
    }
    if (!$src) {throw 'Workshop download directory not found; check SteamCMD installation path'}
    $name='@CMD_'+$id
    $link=Join-Path $root $name
    if (!(Test-Path -LiteralPath $link)) {
        New-Item -ItemType Junction -Path $link -Target $src -ErrorAction Stop | Out-Null
    }
    $keysDir=Join-Path $root 'keys'
    New-Item -ItemType Directory -Path $keysDir -Force | Out-Null
    Get-ChildItem -LiteralPath $src -Filter '*.bikey' -Recurse -File | ForEach-Object {
        $target=Join-Path $keysDir $_.Name
        if (!(Test-Path -LiteralPath $target)) { Copy-Item -LiteralPath $_.FullName -Destination $target }
    }
    $rawArgs=[string]$server.args
    $rx='(?i)(?:^|\s)-mod=(?:"([^"]*)"|(\S+))'
    $existing=@()
    $match=[regex]::Match($rawArgs,$rx)
    if ($match.Success) {
        $value=($match.Groups[1].Value + $match.Groups[2].Value)
        $existing=@($value.Split(';') | Where-Object {$_})
    }
    if ($existing -notcontains $name) {$existing+= $name}
    $argsWithoutMods=[regex]::Replace($rawArgs,$rx,'').Trim()
    $server.args=($argsWithoutMods+' -mod="'+($existing -join ';')+'"').Trim()
    return 'installed'
}

# V4 extension: Arma Reforger uses Bohemia Workshop (not Steam Workshop).
function ConfigureReforgerMods($mods,$server) {
  $exe=[string]$server.exe
  if ([IO.Path]::GetFileName($exe) -ine 'ArmaReforgerServer.exe' -or !(Test-Path -LiteralPath $exe -PathType Leaf)) {throw 'Dedicated Arma Reforger server absent'}
  if (IsGameRunning $exe) {return 'waiting'}
  $root=[string]$server.cwd
  if (!$root) {$root=Split-Path -Parent $exe}
  $config=Join-Path $root 'config.json'
  if (!(Test-Path -LiteralPath $config -PathType Leaf)) {throw 'Arma Reforger config.json not found'}
  if (((Get-Item -LiteralPath $config -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {throw 'Refuse to edit linked config.json'}
  $doc=LoadJson $config $null
  if (!$doc -or !$doc.PSObject.Properties['game']) {throw 'Invalid Reforger game configuration'}
  $entries=@()
  if ($doc.game.PSObject.Properties['mods']) {$entries=@($doc.game.mods | Where-Object {$null -ne $_})}
  $needsSave=$false
  foreach($m in $mods) {
    $guid=[string]$m.itemId
    if ($guid -notmatch '^[0-9a-fA-F]{16}$') {throw 'Invalid Bohemia Workshop mod GUID'}
    $guid=$guid.ToUpperInvariant()
    if (@($entries | Where-Object {[string]$_.modId -ieq $guid}).Count -eq 0) {
      $title=[string]$m.title
      if ($title.Length -gt 120) {$title=$title.Substring(0,120)}
      $entries+=@{modId=$guid;name=$title}
      $needsSave=$true
    }
  }
  $scenario=''
  if ($server.PSObject.Properties['scenarioId']) {$scenario=[string]$server.scenarioId}
  if ($scenario) {
    if ($scenario -notmatch '^\{[0-9a-fA-F]{16}\}Missions/[A-Za-z0-9_./-]{1,140}\.conf$') {throw 'Invalid Bohemia scenario resource path'}
    $current=''
    if ($doc.game.PSObject.Properties['scenarioId']) {$current=[string]$doc.game.scenarioId}
    if ($current -cne $scenario) {$doc.game | Add-Member -NotePropertyName scenarioId -NotePropertyValue $scenario -Force;$needsSave=$true}
  }
  if ($needsSave) {
    $doc.game | Add-Member -NotePropertyName mods -NotePropertyValue @($entries) -Force
    Copy-Item -LiteralPath $config -Destination ($config+'.cmd-backup-'+(Get-Date -Format 'yyyyMMddHHmmss')) -ErrorAction Stop
    SaveJson $config $doc
    Log 'Reforger config.json updated safely. The game downloads these mods on next start.'
  }
  return 'configured'
}
function InstallArma3Mod($mod,$server,$steamExe,$steamUser) {
  $workshopId=[string]$mod.itemId
  if ($workshopId -notmatch '^[1-9][0-9]{0,19}$' -or [string]$mod.appId -ne '107410') {throw 'Invalid Arma 3 Workshop entry'}
  if (!$steamExe -or !(Test-Path -LiteralPath $steamExe -PathType Leaf)) {throw 'SteamCMD absent'}
  if (!$steamUser) {throw 'Steam login required to download Arma 3 Workshop content'}
  $exe=[string]$server.exe
  if ([IO.Path]::GetFileName($exe) -ine 'arma3server_x64.exe' -or !(Test-Path -LiteralPath $exe -PathType Leaf)) {throw 'Arma 3 server executable absent'}
  if (IsGameRunning $exe) {return 'waiting'}
  $root=[string]$server.cwd
  if (!$root) {$root=Split-Path -Parent $exe}
  if (!(Test-Path -LiteralPath $root -PathType Container)) {throw 'Arma 3 server directory absent'}
  & $steamExe '+login' $steamUser '+workshop_download_item' '107410' $workshopId 'validate' '+quit' | Out-Null
  if ($LASTEXITCODE -ne 0) {throw 'SteamCMD failed: Steam license or Steam Guard may be required'}
  $source=Join-Path (Split-Path -Parent $steamExe) ('steamapps\workshop\content\107410\'+$workshopId)
  if (!(Test-Path -LiteralPath $source -PathType Container)) {throw 'Workshop directory not found after download'}
  $name='@CMD_'+$workshopId
  $link=Join-Path $root $name
  if (!(Test-Path -LiteralPath $link)) {New-Item -ItemType Junction -Path $link -Target $source -ErrorAction Stop | Out-Null}
  $keys=Join-Path $root 'keys'
  New-Item -ItemType Directory -Path $keys -Force | Out-Null
  Get-ChildItem -LiteralPath $source -Filter '*.bikey' -Recurse -File | ForEach-Object {
    $dest=Join-Path $keys $_.Name
    if (!(Test-Path -LiteralPath $dest)) {Copy-Item -LiteralPath $_.FullName -Destination $dest -ErrorAction Stop}
  }
  $args=[string]$server.args
  $rx='(?i)(?:^|\s)-mod=(?:"([^"]*)"|(\S+))'
  $match=[regex]::Match($args,$rx)
  $loaded=@()
  if ($match.Success) {$loaded=@(($match.Groups[1].Value+$match.Groups[2].Value).Split(';') | Where-Object {$_})}
  if ($loaded -notcontains $name) {$loaded+=$name}
  $server.args=([regex]::Replace($args,$rx,'').Trim()+' -mod="'+($loaded -join ';')+'"').Trim()
  return 'installed'
}

function ConfigureArk($group,$server,$oldState,$gameId) {
    $exe=[string]$server.exe
    if ([IO.Path]::GetFileName($exe) -ine 'ArkAscendedServer.exe') {throw 'Not an ARK Survival Ascended server'}
    if (!(Test-Path -LiteralPath $exe -PathType Leaf)) {throw 'ARK ASA executable missing'}
    if (IsGameRunning $exe) {return 'waiting'}
    $valid=@($group | Where-Object {$_.itemId -match '^[1-9][0-9]{0,12}$'})
    if ($valid.Count -ne $group.Count) {throw 'Invalid CurseForge ID in ARK configuration'}
    $wanted=@($valid | ForEach-Object {[string]$_.itemId} | Select-Object -Unique)
    $allArgs=[string]$server.args
    $rx='(?i)(?:^|\s)-mods=(?:"([0-9,]*)"|([0-9,]*))'
    $hit=[regex]::Match($allArgs,$rx)
    $existing=@()
    if ($hit.Success) { $existing=@(($hit.Groups[1].Value+$hit.Groups[2].Value).Split(',') | Where-Object {$_}) }
    $previous=@($oldState.arkManagedByGame[$gameId] | ForEach-Object {[string]$_})
    $external=@($existing | Where-Object {$previous -notcontains $_})
    $combined=@($external + $wanted | Select-Object -Unique)
    $without=[regex]::Replace($allArgs,$rx,'').Trim()
    if ($combined.Count) { $server.args=($without+' -mods='+($combined -join ',')).Trim() }
    else {$server.args=$without}
    $oldState.arkManagedByGame[$gameId]=@($wanted)
    return 'configured' # ARK itself downloads the selected mods at its next startup.
}

try {
    $manifest=Invoke-RestMethod -Uri "$api/api/mods/agent/manifest" -Method Get -Headers $headers -TimeoutSec 25
    if (!$manifest -or !$manifest.items) {Log 'No enabled DayZ / ARK / Arma mods require synchronization.';exit 0}
    $items=@($manifest.items)
    $agentFile=[string]$config.serversFile
    if (!(Test-Path -LiteralPath $agentFile -PathType Leaf)) {throw 'Original CMD Hosting servers.json is unavailable'}
    $settings=LoadJson $agentFile $null
    $servers=@($settings.servers)
    if (!$servers.Count) {Log 'No game server declared by CMD Hosting Agent. No mod installation was attempted.';exit 0}
    $state=LoadJson $stateFile $null
    if (!$state) { $state=@{records=@{};arkManagedByGame=@{}} }
    # ConvertFrom-Json returns PSCustomObject; make the mutable state a hashtable.
    $records=@{}
    if ($state.records) {
        if ($state.records -is [System.Collections.IDictionary]) {foreach ($key in $state.records.Keys) {$records[$key]=$state.records[$key]}}
        else {foreach ($property in $state.records.PSObject.Properties) {$records[$property.Name]=$property.Value}}
    }
    $arkManagedByGame=@{}
    if ($state.arkManagedByGame) {
        if ($state.arkManagedByGame -is [System.Collections.IDictionary]) {foreach($key in $state.arkManagedByGame.Keys){$arkManagedByGame[$key]=@($state.arkManagedByGame[$key])}}
        else {foreach($property in $state.arkManagedByGame.PSObject.Properties){$arkManagedByGame[$property.Name]=@($property.Value)}}
    }
    $state=@{records=$records;arkManagedByGame=$arkManagedByGame}
    $changed=$false
    $steamExe=FindSteamCmd ([string]$config.steamCmdExe)
    $steamAccount=[string]$config.steamUser
    foreach ($group in ($items | Group-Object gameId)) {
        $members=@($group.Group)
        $first=$members[0]
        $server=MatchServer ([string]$first.serverId) $servers ([string]$first.gameKey)
        if (!$server) {
            Log ('Server not mapped for '+[string]$first.gameName+'. No files changed.')
            foreach ($m in $members) {ReportResult $m 'waiting'}
            continue
        }
        if ($first.gameKey -eq 'dayz') {
            foreach ($mod in $members) {
                $entryKey=[string]$mod.modId
                $frequency=[Math]::Max(30,[Math]::Min(1440,[int]$mod.frequencyMinutes))
                $previous=$records[$entryKey]
                if ($previous -and (!$mod.autoUpdate) -and $previous.status -eq 'installed' -and $previous.version -eq ([string]$mod.version)) {continue}
                if ($previous -and $previous.status -eq 'installed' -and $previous.version -eq ([string]$mod.version)) {
                    $elapsed=(Get-Date)-(Get-Date $previous.at)
                    if ($elapsed.TotalMinutes -lt $frequency) {continue}
                }
                try {
                    $beforeArgs=[string]$server.args
                    $status=InstallDayZ $mod $server $steamExe $steamAccount
                    if ([string]$server.args -ne $beforeArgs) {$changed=$true}
                    if ($status -eq 'installed') {
                        $records[$entryKey]=@{version=[string]$mod.version;status=$status;at=(Get-Date).ToString('o')}
                        Log ('DayZ mod installed on disk and configured: '+[string]$mod.itemId)
                    }
                    ReportResult $mod $status
                } catch {
                    Log ('DayZ mod '+[string]$mod.itemId+': '+$_.Exception.Message)
                    ReportResult $mod 'failed'
                }
            }
        } elseif ($first.gameKey -eq 'ark') {
            try {
                $oldArgs=[string]$server.args
                $status=ConfigureArk $members $server $state ([string]$first.gameId)
                if ([string]$server.args -ne $oldArgs) {$changed=$true}
                foreach ($mod in $members) {
                    $records[[string]$mod.modId]=@{version=[string]$mod.version;status=$status;at=(Get-Date).ToString('o')}
                    ReportResult $mod $status
                }
                Log ('ARK CurseForge mods '+$status+'. ARK downloads them on next successful startup.')
            } catch {
                Log ('ARK configuration: '+$_.Exception.Message)
                foreach ($mod in $members) {ReportResult $mod 'failed'}
            }

        } elseif ([string]$first.gameName -match '(?i)Arma Reforger' -and [string]$first.provider -eq 'arma') {
          try {
            $result=ConfigureReforgerMods $members $server
            foreach($m in $members) {ReportResult $m $result}
            Log ('Reforger mods '+$result+' (Bohemia downloads mods when server starts)')
          } catch {
            Log ('Arma Reforger: '+$_.Exception.Message)
            foreach($m in $members) {ReportResult $m 'failed'}
          }
        } elseif ([string]$first.gameName -match '(?i)Arma 3' -and [string]$first.provider -eq 'steam') {
          foreach($m in $members) {
            try {
              $before=[string]$server.args
              $result=InstallArma3Mod $m $server $steamExe $steamAccount
              if ([string]$server.args -ne $before) {$changed=$true}
              ReportResult $m $result
              Log ('Arma 3 '+[string]$m.itemId+' '+$result)
            } catch {
              Log ('Arma 3: '+$_.Exception.Message)
              ReportResult $m 'failed'
            }
          }
        }
    }
    if ($changed) {
        BackupServers $agentFile
        SaveJson $agentFile $settings
        Log 'CMD Hosting servers.json updated safely (backup kept). Restart games during maintenance.'
    }
    SaveJson $stateFile $state
} catch {
    Log ('Synchronization error: '+$_.Exception.Message)
    exit 1
}