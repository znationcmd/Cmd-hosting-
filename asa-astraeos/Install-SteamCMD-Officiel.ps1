#requires -version 5.1
# CMD Hosting ARK ASA : bootstrap SteamCMD depuis Valve, sur approbation locale dans le lanceur.
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$base=Join-Path $env:SystemDrive 'CMD-Servers'
$steamDir=Join-Path $base 'tools\steamcmd'
$exe=Join-Path $steamDir 'steamcmd.exe'
if(Test-Path -LiteralPath $exe -PathType Leaf){Write-Host 'SteamCMD deja installe, conserve.';return}
$parts=@($base,(Join-Path $base 'tools'),$steamDir)
foreach($dir in $parts){
 if(Test-Path -LiteralPath $dir){
  if(((Get-Item -LiteralPath $dir -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0){
   throw 'Refus du dossier symbolique SteamCMD.'
  }
 }
}
$temp=Join-Path ([IO.Path]::GetTempPath()) ('cmd-asa-steamcmd-'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $steamDir,$temp | Out-Null
try{
 [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
 $zip=Join-Path $temp 'steamcmd.zip'
 $url='https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip'
 Write-Host 'Telechargement SteamCMD depuis Valve (HTTPS)...'
 Invoke-WebRequest -Uri $url -UseBasicParsing -OutFile $zip -TimeoutSec 240
 if((Get-Item -LiteralPath $zip).Length -lt 100000){throw 'Archive SteamCMD incomplete.'}
 Expand-Archive -LiteralPath $zip -DestinationPath (Join-Path $temp 'unpacked')
 $copy=Join-Path $temp 'unpacked\steamcmd.exe'
 if(!(Test-Path -LiteralPath $copy -PathType Leaf)){throw 'steamcmd.exe non trouve dans l archive officielle.'}
 if(!(Test-Path -LiteralPath $exe)){Copy-Item -LiteralPath $copy -Destination $exe}
 Write-Host ('SteamCMD officiel installe dans '+$steamDir)
}finally{
 if(Test-Path -LiteralPath $temp){Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue}
}
