# CMD Hosting - isolated SteamCMD install contract test on real Windows CI.
# SteamCMD is replaced with a small local stub built in C#. No network or paid games.
# Tests real existing Install-CMDGameServer.ps1, its flags, paths and non-overwrite.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$installer=Join-Path $PSScriptRoot '..\scripts\Install-CMDGameServer.ps1'
$root=Join-Path $env:SystemDrive ('CMDHostingSteamFixture-'+[guid]::NewGuid().ToString('N'))
$mockDir=Join-Path $root 'stub'
$exe=Join-Path $mockDir 'steamcmd.exe'
$rootGames=Join-Path $root 'games'
function Check([bool]$ok,[string]$message){if(!$ok){throw ('SteamCMD installer fixture failed: '+$message)}}
try{
 New-Item -ItemType Directory -Path $mockDir -Force|Out-Null
 New-Item -ItemType Directory -Path $rootGames -Force|Out-Null
 $src=@'
using System;
using System.IO;
public static class Program {
 public static int Main(string[] args) {
   string folder=null, app=null; bool anonymous=false;
   for(int i=0;i<args.Length;i++) {
     if(args[i]=="+force_install_dir" && i+1<args.Length) folder=args[++i];
     else if(args[i]=="+app_update" && i+1<args.Length) app=args[++i];
     else if(args[i]=="+login" && i+1<args.Length) anonymous=args[++i]=="anonymous";
   }
   if(String.IsNullOrEmpty(folder)||String.IsNullOrEmpty(app)||!anonymous) {
      Console.Error.WriteLine("Invalid SteamCMD arguments");return 3;
   }
   string name=app=="223350" ? "DayZServer_x64.exe":
       app=="294420" ? "7DaysToDieServer.exe":null;
   if(name==null) {Console.Error.WriteLine("Unexpected Steam app ID");return 4;}
   Directory.CreateDirectory(folder);
   File.WriteAllText(Path.Combine(folder,name),"CI fake binary - not an actual game");
   if(app=="223350"){
      Directory.CreateDirectory(Path.Combine(folder,"mpmissions","dayzOffline.chernarusplus"));
      File.WriteAllText(Path.Combine(folder,"serverDZ.cfg"),
         "class Missions {class DayZ {template = \"dayzOffline.chernarusplus\";};};");
   }
   if(app=="294420"){
      File.WriteAllText(Path.Combine(folder,"serverconfig.xml"),
          "<ServerSettings><property name=\"GameWorld\" value=\"Navezgane\"/></ServerSettings>");
   }
   Console.WriteLine("CI stub wrote a fake executable for app "+app);
   return 0;
 }
}
'@
 $projectDir=Join-Path $root 'mock-src'
 New-Item -ItemType Directory -Path $projectDir -Force|Out-Null
 $project=Join-Path $projectDir 'steamcmd.csproj'
 $projectXml=@'
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
    <AssemblyName>steamcmd</AssemblyName>
    <UseAppHost>true</UseAppHost>
  </PropertyGroup>
</Project>
'@
 [IO.File]::WriteAllText($project,$projectXml)
 [IO.File]::WriteAllText((Join-Path $projectDir 'Program.cs'),$src)
 & dotnet build $project -c Release --nologo -o $mockDir
 if($LASTEXITCODE -ne 0){throw 'Failed to compile isolated SteamCMD CLI stub.'}
 Check (Test-Path -LiteralPath $exe -PathType Leaf) 'SteamCMD stub did not compile'
 $id='smokeDayZ01'
 & $installer -Game 'DayZ' -ServerId $id -InstallRoot $rootGames -SteamCmdPath $exe -Install -AcceptPublisherTerms|Out-Null
 $folder=Join-Path (Join-Path $rootGames $id) 'dayz'
 Check (Test-Path -LiteralPath (Join-Path $folder 'DayZServer_x64.exe')) 'dayz appid did not create expected executable'
 Check (Test-Path -LiteralPath (Join-Path $folder 'serverDZ.cfg')) 'dayz server config fixture absent'
 $overwritePrevented=$false
 try{
   & $installer -Game 'DayZ' -ServerId $id -InstallRoot $rootGames -SteamCmdPath $exe -Install -AcceptPublisherTerms|Out-Null
 }catch{$overwritePrevented=$true}
 Check $overwritePrevented 'installer overwrote a rental'
 $wrongIdRejected=$false
 try{
   & $installer -Game 'DayZ' -ServerId '../escape' -InstallRoot $rootGames -SteamCmdPath $exe|Out-Null
 }catch{$wrongIdRejected=$true}
 Check $wrongIdRejected 'invalid server ID escaped validation'
 $seven='smoke7dtd01'
 & $installer -Game '7 Days to Die' -ServerId $seven -InstallRoot $rootGames -SteamCmdPath $exe -Install -AcceptPublisherTerms|Out-Null
 Check (Test-Path -LiteralPath (Join-Path (Join-Path $rootGames $seven) '7dtd\7DaysToDieServer.exe')) '7DTD appid incorrect'
 Write-Host 'SteamCMD installation CONTRACT test PASS: isolated DayZ + 7DTD app ids, expected binaries, no overwrite, invalid ID rejected (STUB, not real game download).'
}finally{
 if(Test-Path -LiteralPath $root){Remove-Item -LiteralPath $root -Recurse -Force}
}
