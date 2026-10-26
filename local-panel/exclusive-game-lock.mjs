// Shared Windows-only exclusive server lock for local DayZ and ARK; never Railway.
// Starts fail closed if any unmanaged DayZ or ARK game process exists.
import {open,readFile,unlink,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
const ROOT=path.resolve(process.env.CMD_SERVERS_ROOT||path.join(process.env.SystemDrive||'C:','CMD-Servers'));
const LOCK=path.join(ROOT,'.cmd-hosting-active-game.lock');
// Dedicated executables only: never treat installed Steam GAME CLIENTS as hosted servers.
export const DEDICATED_SERVER_EXECUTABLES=Object.freeze([
 'DayZServer_x64.exe','ArkAscendedServer.exe','ShooterGameServer.exe',
 'PalServer.exe','ArmaReforgerServer.exe','arma3server_x64.exe',
 '7DaysToDieServer.exe','FactoryServer.exe','valheim_server.exe',
 'enshrouded_server.exe','ProjectZomboidServer64.exe','PalServer-Win64-Shipping.exe'
]);
export function parseRunningDedicatedServers(tasklistOutput=''){
 const names=new Set(DEDICATED_SERVER_EXECUTABLES.map(name=>name.toLowerCase()));
 return String(tasklistOutput).split(/\r?\n/).map(line=>/^\s*"([^"]+\.exe)"\s*,/i.exec(line)?.[1])
  .filter(name=>name&&names.has(name.toLowerCase()));
}
export function gameProcessesRunning(){
 if(process.platform!=='win32')return false;
 const result=spawnSync('tasklist.exe',['/FO','CSV','/NH'],{encoding:'utf8',windowsHide:true,timeout:12000});
 if(result.error||result.status!==0)throw Error('Impossible de vérifier les processus des serveurs dédiés : démarrage refusé.');
 return parseRunningDedicatedServers(result.stdout).length>0;
}
export async function acquireGameLock(game){
 if(typeof game!=='string'||!/^[a-z0-9-]{3,40}$/.test(game))throw Error('Identifiant de jeu non valide.');
 await mkdir(ROOT,{recursive:true});
 if(gameProcessesRunning())throw Error('Un serveur DayZ ou ARK fonctionne deja sur cet ordinateur : arrete-le avant de changer de carte.');
 let fd;
 try{fd=await open(LOCK,'wx',0o600)}
 catch(e){
  if(e.code!=='EEXIST')throw e;
  let prior;
  try{prior=JSON.parse(await readFile(LOCK,'utf8'))}catch{throw Error('Verrou inconnu : intervention manuelle requise pour proteger les mondes.')}
  if(!Number.isInteger(prior.pid)||prior.pid<=0)throw Error('Verrou serveur invalide. Pas de suppression automatique.');
  let alive=false;
  try{process.kill(prior.pid,0);alive=true}catch(err){if(err.code==='EPERM')alive=true;else if(err.code!=='ESRCH')alive=true}
  if(alive||gameProcessesRunning())throw Error('Serveur '+prior.game+' deja actif (verrou de securite).');
  // An unrelated process could race with us; don't remove stale locks automatically.
  throw Error('Ancien verrou de '+prior.game+' detecte : verifier les processus puis retirer manuellement le fichier '+LOCK);
 }
 try{await fd.writeFile(JSON.stringify({pid:process.pid,game,createdAt:new Date().toISOString()}))}
 finally{await fd.close()}
 if(gameProcessesRunning()){await releaseGameLock();throw Error('Un autre serveur vient de demarrer.')}
 return {game,lock:LOCK};
}
export async function releaseGameLock(){
 try{
  const state=JSON.parse(await readFile(LOCK,'utf8'));
  if(state.pid===process.pid)await unlink(LOCK);
 }catch(e){if(e.code==='ENOENT')return;}
}
export const LOCK_PATH=LOCK;
