# CMD Hosting — authorized offline ZIP importer for Farming Simulator 19/22/25 and Factorio.
# This script NEVER downloads arbitrary URLs and NEVER restarts a server.
# Default is PlanOnly; -Apply explicitly confirms the operation.
[CmdletBinding()]
param(
 [Parameter(Mandatory=$true)][ValidateSet('FS19','FS22','FS25','Factorio')][string]$Game,
 [Parameter(Mandatory=$true)][string]$ModsDirectory,
 [Parameter(Mandatory=$true)][string]$ModZip,
 [switch]$Apply,
 [switch]$PublisherApproved,
 [switch]$ServerStopped
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$dir=Get-Item -LiteralPath $ModsDirectory -ErrorAction Stop
$pkg=Get-Item -LiteralPath $ModZip -ErrorAction Stop
if(-not $dir.PSIsContainer -or $pkg.PSIsContainer){throw 'Select an existing mods directory and an existing ZIP file.'}
if($dir.Attributes -band [System.IO.FileAttributes]::ReparsePoint){throw 'Refusing a symbolic-link mods destination.'}
if($pkg.Length -le 0 -or $pkg.Length -gt 1073741824){throw 'Invalid ZIP size (maximum 1 GiB).'}
if($pkg.Extension.ToLowerInvariant() -ne '.zip' -or $pkg.Name -notmatch '^[A-Za-z0-9][A-Za-z0-9_.-]{0,120}\.zip$'){throw 'Invalid mod package filename.'}
try{Add-Type -AssemblyName System.IO.Compression.FileSystem -ErrorAction SilentlyContinue}catch{}
$archive=[System.IO.Compression.ZipFile]::OpenRead($pkg.FullName)
try{
 if($archive.Entries.Count -lt 1 -or $archive.Entries.Count -gt 20000){throw 'Unexpected ZIP entry count.'}
 $total=[long]0
 $modDesc=$false
 $factorioInfo=$false
 foreach($entry in $archive.Entries){
  $n=$entry.FullName.Replace('\','/')
  if($n.StartsWith('/') -or $n -match '(?:^|/)\.\.(?:/|$)' -or $n -match '^[a-zA-Z]:' -or $n.Contains([char]0)){throw 'Unsafe ZIP entry path.'}
  $total += [long]$entry.Length
  if($total -gt 2147483648){throw 'Uncompressed ZIP exceeds 2 GiB.'}
  if($n -eq 'modDesc.xml'){$modDesc=$true}
  if($n -match '^[^/]+/info\.json$'){$factorioInfo=$true}
 }
 if($Game -like 'FS*' -and -not $modDesc){throw 'Missing modDesc.xml at archive root: not a Farming Simulator mod.'}
 if($Game -eq 'Factorio' -and -not $factorioInfo){throw 'Missing Factorio info.json in the mod folder.'}
}finally{$archive.Dispose()}
$hash=(Get-FileHash -LiteralPath $pkg.FullName -Algorithm SHA256).Hash
$dest=Join-Path $dir.FullName $pkg.Name
$plan=[ordered]@{
 game=$Game;source=$pkg.FullName;destination=$dest;sha256=$hash
 installMode=if($Apply){'requested'}else{'preview_only'}
 existingVersionPresent=(Test-Path -LiteralPath $dest -PathType Leaf)
 backupRequired=$true
 licenseAndPublisherVerified=$false
 serverStoppedVerified=$false
 agentConnected=$false
}
if(-not $Apply){$plan | ConvertTo-Json -Depth 3;return}
if(-not $PublisherApproved -or -not $ServerStopped){throw 'Applying requires -PublisherApproved -ServerStopped and an offline server.'}
$running=@()
$names=if($Game -eq 'Factorio'){@('factorio')}else{@('dedicatedServer','FarmingSimulator2025Game','FarmingSimulator2022Game','FarmingSimulator2019Game')}
foreach($name in $names){$running+=@(Get-Process -Name $name -ErrorAction SilentlyContinue)}
if($running.Count -gt 0){throw 'Detected a running game/server process; stop it before modifying mods.'}
$parent=Split-Path -Parent $dir.FullName
$backupDir=Join-Path $parent 'CMDHostingModBackups'
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
$backup=''
$tmp=Join-Path $dir.FullName ('.cmd-new-'+[Guid]::NewGuid().ToString('N')+'.tmp')
try{
 Copy-Item -LiteralPath $pkg.FullName -Destination $tmp -ErrorAction Stop
 if((Get-FileHash -LiteralPath $tmp -Algorithm SHA256).Hash -ne $hash){throw 'Mod checksum mismatch in staging.'}
 if(Test-Path -LiteralPath $dest -PathType Leaf){
  $backup=Join-Path $backupDir ($pkg.BaseName+'-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'-'+[Guid]::NewGuid().ToString('N')+'.zip')
  Copy-Item -LiteralPath $dest -Destination $backup -ErrorAction Stop
  Remove-Item -LiteralPath $dest -Force -ErrorAction Stop
 }
 Move-Item -LiteralPath $tmp -Destination $dest -ErrorAction Stop
 if((Get-FileHash -LiteralPath $dest -Algorithm SHA256).Hash -ne $hash){throw 'Checksum verification failed after install.'}
 [pscustomobject]@{ok=$true;game=$Game;installed=$dest;sha256=$hash;backup=$backup;requiresManualServerRestart=$true}|ConvertTo-Json -Depth 3
}catch{
 if(Test-Path -LiteralPath $tmp){Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue}
 if($backup -and (Test-Path -LiteralPath $backup) -and -not (Test-Path -LiteralPath $dest)){Copy-Item -LiteralPath $backup -Destination $dest -ErrorAction SilentlyContinue}
 throw
}
