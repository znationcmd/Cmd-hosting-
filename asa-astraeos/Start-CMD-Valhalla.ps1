#requires -version 5.1
# Lanceur local CMD Hosting; aucun Railway, aucun mot de passe partage par reseau.
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $MyInvocation.MyCommand.Path
$manager=Join-Path $root 'manager.mjs'
if(!(Get-Command node.exe -ErrorAction SilentlyContinue)){
 Write-Host 'Node.js 22 ou plus requis : https://nodejs.org'
 Read-Host 'Entree pour quitter'|Out-Null;exit 1
}
while($true){
 Write-Host ''
 Write-Host 'CMD HOSTING - CMD VALHALLA EXTINCTION ASTRAEOS'
 Write-Host '100 SLOTS - CARTE ASTRAEOS - 24 MODS - WINDOWS LOCAL'
 Write-Host 'Un seul jeu actif a la fois : DayZ OU ARK'
 Write-Host '1. Preparer les fichiers INI'
 Write-Host '2. Verifier le serveur sur disque'
 Write-Host '3. Installer le serveur officiel ARK ASA (SteamCMD 2430930)'
 Write-Host '4. Demarrer le serveur ASTRAEOS avec redemarrages programmes'
 Write-Host '0. Quitter'
 $choice=Read-Host 'Choix'
 switch($choice){
  '0' {return}
  '1' {& node.exe $manager prepare}
  '2' {& node.exe $manager status}
  '3' {
   $yes=Read-Host 'Installer le serveur officiel sur CE Windows ? Tape OUI'
   if($yes -ceq 'OUI'){& node.exe $manager install}
  }
  '4' {
   $secret=Read-Host 'Mot de passe administrateur ARK (non enregistre sur GitHub)' -AsSecureString
   $ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
   try{
    $env:CMD_ASA_ADMIN_PASSWORD=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    $ok=Read-Host 'Le mod Moro Livyatan est Premium. Confirmes-tu disposer des droits necessaires ? OUI/NON'
    if($ok -cne 'OUI'){
     Write-Host 'Aucun contournement : droits Premium a confirmer avant le demarrage.'
    }else{
     $env:CMD_ASA_PREMIUM_ACK='yes'
     & node.exe $manager start
    }
   }finally{
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    Remove-Item Env:\CMD_ASA_ADMIN_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:\CMD_ASA_PREMIUM_ACK -ErrorAction SilentlyContinue
   }
  }
 }
}
