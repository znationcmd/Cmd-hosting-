#requires -version 5.1
# CMD Hosting Mods Agent V4 updater. Keeps encrypted pairing and existing server files.
[CmdletBinding()]
param([switch]$RunOnce)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$dir=Join-Path $env:LOCALAPPDATA 'CMDHosting\ModsAgent'
$settings=Join-Path $dir 'settings.json'
$target=Join-Path $dir 'cmd-hosting-mods-agent.ps1'
if (!(Test-Path -LiteralPath $settings -PathType Leaf)) {
    throw "Existing CMD Hosting Mods Agent settings.json was not found. Pair/install the existing agent first; no files were changed."
}
$source='https://raw.githubusercontent.com/znationcmd/Cmd-hosting-/9febe00edbd8afd4d1ef9667cd1499e9ec6641fe/scripts/cmd-hosting-mods-agent-v4.ps1'
$tmp=Join-Path $dir 'agent-v4.download'
Invoke-WebRequest -UseBasicParsing -Uri $source -OutFile $tmp -TimeoutSec 40
$content=Get-Content -LiteralPath $tmp -Raw -Encoding UTF8
if ($content.Length -lt 23000 -or $content.Length -gt 40000 -or
    !$content.Contains('CMD Hosting Windows Mods Agent V4') -or
    !$content.Contains('function ConfigureReforgerMods(') -or
    !$content.Contains('function InstallArma3Mod(')) {
    Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
    throw 'Downloaded file did not pass structure verification. Previous agent was not modified.'
}
if (Test-Path -LiteralPath $target -PathType Leaf) {
    $backup=$target+'.backup-'+(Get-Date -Format 'yyyyMMddHHmmss')
    Copy-Item -LiteralPath $target -Destination $backup -ErrorAction Stop
    Write-Host ('Previous agent backed up: '+$backup)
}
Move-Item -LiteralPath $tmp -Destination $target -Force -ErrorAction Stop
Write-Host ('Agent V4 updated: '+$target) -ForegroundColor Green
Write-Host 'Existing encrypted agent token and server settings were preserved.'
try {
    $task=Get-ScheduledTask -TaskName 'CMDHostingModsAgent' -ErrorAction Stop
    Write-Host ('Windows scheduled task: '+$task.State)
} catch {
    Write-Warning 'CMDHostingModsAgent scheduled task not found; run the agent -Install after verifying existing settings.'
}
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $target -Diagnose
if ($RunOnce) {
    Write-Host 'Running one synchronization iteration; compatible server checks and backups remain enabled.'
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $target -Once
}
Write-Host 'Update complete. Actual mod downloads require an online PC, proper Workshop credentials and valid configured servers.'
