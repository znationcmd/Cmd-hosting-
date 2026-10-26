// CMD Hosting — registered local game profiles, no Railway or simulated runtime.
// Uses the existing maintained DayZ and ARK managers; the game must be installed on this PC.
import {status as dayzStatus,prepare as dayzPrepare} from '../dayz-worlds/manager.mjs';
import {configured as arkStatus,makeConfig as arkPrepare} from '../asa-astraeos/manager.mjs';
import {gameProcessesRunning} from './exclusive-game-lock.mjs';
export const PROFILES=Object.freeze([
  {id:'cmd-lux',title:'CMD Lux',game:'dayz',map:'Lux',slots:100,manager:'dayz-worlds/manager.mjs'},
  {id:'cmd-namalsk',title:'CMD Namalsk',game:'dayz',map:'Namalsk',slots:100,manager:'dayz-worlds/manager.mjs'},
  {id:'cmd-deer-isle',title:'CMD Deer Isle',game:'dayz',map:'Deer Isle',slots:100,manager:'dayz-worlds/manager.mjs'},
  {id:'cmd-takistan-plus',title:'CMD Takistan Plus',game:'dayz',map:'Takistan Plus',slots:100,manager:'dayz-worlds/manager.mjs'},
  {id:'cmd-valhalla-astraeos',title:'CMD Valhalla Astraeos',game:'ark-asa',map:'Astraeos',slots:100,manager:'asa-astraeos/manager.mjs'}
]);
export function knownProfile(id){return PROFILES.find(p=>p.id===id)||null}
export async function profileChecks(){
  const [dayz,ark]=await Promise.allSettled([dayzStatus(),arkStatus()]);
  const dayzResults=dayz.status==='fulfilled'?dayz.value:[];
  const arkResult=ark.status==='fulfilled'?ark.value:null;
  let activeUnknown=false;
  try{activeUnknown=gameProcessesRunning()}catch{activeUnknown=true}
  return PROFILES.map(p=>{
    if(p.game==='dayz'){
      const details=dayzResults.find(x=>x.profile===p.id);
      const blockers=details?.missing?.map(String)||[dayz.status==='rejected'?String(dayz.reason?.message||'Diagnostic DayZ indisponible'):'Diagnostic DayZ indisponible'];
      return {...p,ready:Boolean(details?.ready),filesVerified:Boolean(details?.ready),modCount:details?.modsTotal||0,
       modsInstalled:details?.modsOnDisk||0,mission:details?.mission||null,blockers,activeGameDetected:activeUnknown,
       state:details?.ready?'prêt pour essai local':'fichiers ou mods manquants'};
    }
    const blockers=[];
    if(!arkResult){blockers.push(String(ark.reason?.message||'Diagnostic ARK indisponible'))}
    else{
      if(!arkResult.installed)blockers.push('Exécutable officiel ARK ASA absent sur le PC');
      if(!arkResult.allModIdsFound)blockers.push('Identifiants des mods CurseForge incomplets');
      if(arkResult.premiumRequiresEntitlement&&process.env.CMD_ASA_PREMIUM_ACK!=='yes')
        blockers.push('Licence du contenu premium à confirmer localement (CMD_ASA_PREMIUM_ACK=yes uniquement si autorisé)');
      if(!process.env.CMD_ASA_ADMIN_PASSWORD)
        blockers.push('Mot de passe administrateur ARK/RCON à définir sur le PC (pas dans GitHub)');
      if(!arkResult.crossplayTested)
        blockers.push('Compatibilité PC / PS5 / Xbox des mods non vérifiée (validation en jeu nécessaire)');
    }
    return {...p,ready:Boolean(arkResult?.installed&&arkResult?.allModIdsFound&&
      (!arkResult?.premiumRequiresEntitlement||process.env.CMD_ASA_PREMIUM_ACK==='yes')&&
      process.env.CMD_ASA_ADMIN_PASSWORD),
      filesVerified:Boolean(arkResult?.installed),modCount:arkResult?.modCount||24,
      modsInstalled:null,mission:'Astraeos_WP',blockers,activeGameDetected:activeUnknown,
      state:arkResult?.installed?'installé, contrôle des mods requis':'ARK ASA non installé'};
  });
}
export async function prepareProfile(id){
  const p=knownProfile(id);
  if(!p)throw Error('Profil CMD inconnu');
  return p.game==='dayz'?{count:await dayzPrepare(),status:'4 profils DayZ préparés; mods et missions non téléchargés'}:await arkPrepare();
}
