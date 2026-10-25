#!/usr/bin/env node
// CMD Hosting — ARK Survival Ascended Astraeos PC (100 slots, one active game, no Railway).
// This is a Windows launcher around OFFICIAL server files, not an emulator or hosting service.
import {readFile,writeFile,open,mkdir,stat,copyFile,rename,access} from 'node:fs/promises';
import {spawn,spawnSync} from 'node:child_process';
import {createInterface} from 'node:readline/promises';
import {createConnection} from 'node:net';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {acquireGameLock,releaseGameLock} from '../local-panel/exclusive-game-lock.mjs';
const DIR=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(process.env.CMD_SERVERS_ROOT||path.join(process.env.SystemDrive||'C:','CMD-Servers'));
const INSTANCE=path.join(ROOT,'cmd-asa-personnel','ark-asa');
const MAIN=path.join(INSTANCE,'ShooterGame','Binaries','Win64','ArkAscendedServer.exe');
const PROFILE=path.join(ROOT,'CMD-Valhalla-Extinction-Astraeos');
const MOD_ROOT=path.join(INSTANCE,'ShooterGame','Saved','Config','WindowsServer');
const STEAM=path.join(ROOT,'tools','steamcmd','steamcmd.exe');
const MOD_OK=/^[1-9][0-9]{4,8}$/;
const GAME_ID='cmd-valhalla-extinction-astraeos';
export async function manifest(){return JSON.parse(await readFile(path.join(DIR,'manifest.json'),'utf8'))}
export async function makeConfig(){
 const m=await manifest();
 if(m.map!=='Astraeos_WP'||m.maxPlayers!==100||!m.mods.length)throw Error('Profil Astraeos invalide.');
 await mkdir(PROFILE,{recursive:true});await mkdir(path.join(PROFILE,'logs'),{recursive:true});
 await mkdir(path.join(PROFILE,'backup'),{recursive:true});
 const ini=path.join(DIR,'Game.ini'),gus=path.join(DIR,'GameUserSettings.ini');
 for(const name of ['Game.ini','GameUserSettings.ini']){
  const dest=path.join(PROFILE,name);
  try{await copyFile(path.join(DIR,name),dest,1)}catch(e){if(e.code!=='EEXIST')throw e}
 }
 const guide=path.join(PROFILE,'curseforge-mods.json');
 try{await writeFile(guide,JSON.stringify(m.mods,null,2)+'\n',{flag:'wx'})}catch(e){if(e.code!=='EEXIST')throw e}
 return {profile:PROFILE,files:['Game.ini','GameUserSettings.ini','curseforge-mods.json'],map:m.map,mods:m.mods.length};
}
async function steamInstall(){
 if(process.platform!=='win32')throw Error('ARK Survival Ascended serveur officiel : Windows requis.');
 if(!(await fileExists(STEAM)))throw Error('SteamCMD non installe dans '+STEAM+'. Installe SteamCMD officiel avant.');
 if(await fileExists(MAIN))return {installed:true,unchanged:true};
 const reply=spawnSync(STEAM,['+@ShutdownOnFailedCommand','1','+force_install_dir',INSTANCE,
  '+login','anonymous','+app_update','2430930','validate','+quit'],
 {cwd:path.dirname(STEAM),stdio:'inherit',timeout:60*60*1000,windowsHide:false});
 if(reply.error||reply.status!==0)throw Error('SteamCMD n a pas installe 2430930. Verifie son message, le stockage et tes droits.');
 if(!(await fileExists(MAIN)))throw Error('ArkAscendedServer.exe absent : installation non terminee.');
 return {installed:true,unchanged:false};
}
async function fileExists(p){try{const x=await stat(p);return x.isFile()}catch{return false}}
async function configured(){
 const m=await manifest();
 const installed=await fileExists(MAIN);
 const modsUnresolved=m.mods.filter(x=>!MOD_OK.test(String(x.curseForgeId)));
 const danger=Boolean(m.mods.find(x=>x.notes==='premium'));
 return {name:m.name,game:m.game,map:m.map,slots:m.maxPlayers,modCount:m.mods.length,
  allModIdsFound:modsUnresolved.length===0,premiumRequiresEntitlement:danger,
  crossplayRequested:m.crossplayRequested,crossplayTested:false,
  restartLocalTimes:m.restartLocalParis,timeZone:m.timeZone,
  installed,serverVerifiedRunning:false,gameRoot:INSTANCE,
  errors:installed?[]:['ARK Survival Ascended serveur dedie pas installe : '+MAIN],
  warnings:['100 slots, FPS et connexion consoles non verifies',
  'Tous les mods doivent exister, etre a jour et accepter PC / Xbox / PS5 pour le crossplay.',
  'Le mod Moro Livyatan necessite des droits Premium : aucune acquisition automatique.',
  'Les transferts Element via SCS et le delai dinos de 7 jours necessitent validation en jeu.']};
}
async function backupExisting(file){
 if(!(await fileExists(file)))return null;
 const bak=path.join(PROFILE,'backup',path.basename(file)+'-'+Date.now()+'.bak');
 await copyFile(file,bak,1);
 return bak;
}
async function applyConfigs(secret){
 if(!secret||secret.length<10||secret.length>120||/[\r\n=\u0000-\u001f]/.test(secret))
  throw Error('Mot de passe administrateur local invalide : minimum 10 caracteres, sans retour ligne ou =.');
 await makeConfig();await mkdir(MOD_ROOT,{recursive:true});
 const gTarget=path.join(MOD_ROOT,'Game.ini'),sTarget=path.join(MOD_ROOT,'GameUserSettings.ini');
 // Never overwrite operator-modified configs. Game.ini is copied only when absent.
 if(!(await fileExists(gTarget)))await copyFile(path.join(PROFILE,'Game.ini'),gTarget,1);
 if(!(await fileExists(sTarget))){
  const template=await readFile(path.join(PROFILE,'GameUserSettings.ini'),'utf8');
  await writeFile(sTarget,template.replace('[ServerSettings]','[ServerSettings]\nServerAdminPassword='+secret),{flag:'wx'});
 }else{
  const old=await readFile(sTarget,'utf8');
  const val='ServerAdminPassword='+secret;
  let next=old;
  if(/^[ \t]*ServerAdminPassword[ \t]*=/im.test(old))
   next=old.replace(/^[ \t]*ServerAdminPassword[ \t]*=.*$/im,val);
  else if(old.includes('[ServerSettings]'))
   next=old.replace('[ServerSettings]','[ServerSettings]\r\n'+val);
  else throw Error('GameUserSettings.ini existant sans [ServerSettings] : aucune modification, configure le mot de passe localement.');
  if(next!==old){
   await backupExisting(sTarget);
   const tmp=sTarget+'.cmdhosting-'+process.pid+'.tmp';
   try{await writeFile(tmp,next,{flag:'wx'});await rename(tmp,sTarget)}
   catch(e){try{await (await import('node:fs/promises')).unlink(tmp)}catch{}throw e}
  }
 }
 return {game:gTarget,settings:sTarget,protectedSecret:true};
}
export function parisClock(date=new Date()){
 const opts={timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit',
  year:'numeric',month:'2-digit',day:'2-digit',hourCycle:'h23'};
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',opts).formatToParts(date).map(x=>[x.type,x.value]));
 return {date:[parts.year,parts.month,parts.day].join('-'),time:parts.hour+':'+parts.minute};
}
export function launchArgs(m){
 if(!Number.isInteger(m.maxPlayers)||m.maxPlayers!==100)throw Error('Profil 100 slots attendu.');
 if(m.map!=='Astraeos_WP'||m.mods.some(x=>!MOD_OK.test(String(x.curseForgeId))))throw Error('Carte ou mods invalides');
 const ids=[...new Set(m.mods.map(x=>String(x.curseForgeId)))];
 return [m.map+'?SessionName='+m.name+'?Port=7777?QueryPort=27015?RCONPort=27020',
  '-ServerPlatform=ALL','-WinLiveMaxPlayers=100','-mods='+ids.join(','),
  '-log','-NoBattlEye'];
}
function rconPacket(id,type,body){
 const value=Buffer.from(body,'utf8'),b=Buffer.alloc(value.length+14);
 b.writeInt32LE(value.length+10,0);b.writeInt32LE(id,4);b.writeInt32LE(type,8);value.copy(b,12);
 return b;
}
async function rcon(password,cmd){
 // Only connect to local RCON; never send the password to Railway/Internet.
 return new Promise((resolve,reject)=>{
  const socket=createConnection({host:'127.0.0.1',port:27020});
  let buffer=Buffer.alloc(0),authenticated=false,done=false;
  const timeout=setTimeout(()=>finish(Error('RCON timeout')),5500);
  function finish(err){
   if(done)return;done=true;clearTimeout(timeout);socket.destroy();err?reject(err):resolve(true)
  }
  socket.once('connect',()=>socket.write(rconPacket(425,3,password)));
  socket.on('data',chunk=>{
   buffer=Buffer.concat([buffer,chunk]);
   while(buffer.length>=4){
    const n=buffer.readInt32LE(0);if(n<10||n>8192){finish(Error('Reponse RCON invalide'));return}
    if(buffer.length<n+4)break;
    const pkt=buffer.subarray(4,n+4);buffer=buffer.subarray(n+4);
    const id=pkt.readInt32LE(0),type=pkt.readInt32LE(4);
    if(id===-1){finish(Error('Mot de passe RCON refuse'));return}
    if(!authenticated&&type===2&&id===425){
     authenticated=true;socket.write(rconPacket(426,2,cmd));
    }else if(authenticated&&id===426){finish(null);return}
   }
  });
  socket.once('error',finish);
  socket.once('end',()=>{if(!done)finish(Error('RCON ferme'))});
 });
}
export function nextRestartDue(m,date,lastKey){
 const clock=parisClock(date),key=clock.date+' '+clock.time;
 return m.restartLocalParis.includes(clock.time)&&key!==lastKey?key:null;
}
async function launch(){
 if(process.platform!=='win32')throw Error('Le serveur ARK Ascended doit tourner sur Windows, pas Railway.');
 const m=await manifest();
 await makeConfig();
 if(!(await fileExists(MAIN)))throw Error('ARK non installe. Choisis Installer dans le menu sur Windows.');
 const password=process.env.CMD_ASA_ADMIN_PASSWORD||'';
 if(!password)throw Error('Mot de passe absent : definir CMD_ASA_ADMIN_PASSWORD localement. Pas de secret sur GitHub.');
 if(m.mods.some(x=>x.notes==='premium')&&process.env.CMD_ASA_PREMIUM_ACK!=='yes')
  throw Error('Moro Livyatan Premium : confirmer localement la licence avec CMD_ASA_PREMIUM_ACK=yes, sans contournement.');
 await acquireGameLock('asa-astraeos');
 try{
  await applyConfigs(password);
  const args=launchArgs(m);
  let relaunch=true;
  while(relaunch){
   relaunch=false;
   console.log('Demarrage ARK Astraeos sur Windows, 100 slots, '+m.mods.length+' IDs mods.');
   console.log('Liste officielle des mods geree par le serveur ARK via -mods; verification de telechargement en jeu obligatoire.');
   console.log('Redemarrage programme : 08:00, 12:00, 22:00 (Europe/Paris), seulement avec RCON fonctionnel.');
   const child=spawn(MAIN,args,{cwd:path.dirname(MAIN),stdio:'inherit',windowsHide:false});
   let scheduled=false,working=false,lastKey='';
   const timer=setInterval(async()=>{
    const due=nextRestartDue(m,new Date(),lastKey);
    if(!due||scheduled||working||!child.pid)return;
    lastKey=due;working=true;
    try{
     console.log('Redemarrage programme '+due+' : sauvegarde ARK via RCON local...');
     await rcon(password,'SaveWorld');
     await new Promise(res=>setTimeout(res,1500));
     await rcon(password,'DoExit');
     scheduled=true;
     console.log('Fermeture propre demandee au serveur. Aucun taskkill FORCE.');
    }catch(error){console.warn('Redemarrage non effectue : '+error.message+'; partie conservee.')}
    finally{working=false}
   },10000);
   const result=await new Promise((resolve,reject)=>{
    child.once('exit',(code,signal)=>resolve({code,signal}));
    child.once('error',reject);
   }).finally(()=>clearInterval(timer));
   if(scheduled){console.log('Redemarrage du serveur apres fermeture propre...');relaunch=true}
   else console.log('ARK arrete sans ordre de redemarrage; code='+result.code+'.');
  }
 }finally{await releaseGameLock()}
}
async function menu(){
 const rl=createInterface({input:process.stdin,output:process.stdout});
 try{
  while(true){
   console.log('\n=== CMD VALHALLA EXTINCTION ASTRAEOS — 100 SLOTS — SANS RAILWAY ===');
   console.log('1. Preparer les configurations\n2. Verifier les fichiers\n3. Installer serveur officiel ASA (SteamCMD)\n4. Demarrer Astraeos (exclusif)\n0. Quitter');
   const n=(await rl.question('Choix : ')).trim();
   if(n==='0')break;
   if(n==='1')console.log(await makeConfig());
   else if(n==='2')console.log(await configured());
   else if(n==='3'){
    const response=(await rl.question('Installer le serveur ARK officiel sur ce PC, sans effacer de sauvegardes ? (OUI) : ')).trim();
    if(response==='OUI')console.log(await steamInstall());
   }else if(n==='4'){
    if(!process.env.CMD_ASA_ADMIN_PASSWORD){console.log('Mot de passe requis : utiliser un lanceur Windows qui le demande localement.');continue}
    await launch();
   }
  }
 }finally{rl.close()}
}
async function cli(){
 const [cmd]=process.argv.slice(2);
 try{
  if(cmd==='prepare'){console.log(await makeConfig());return}
  if(cmd==='status'){console.log(JSON.stringify(await configured(),null,2));return}
  if(cmd==='install'){console.log(await steamInstall());return}
  if(cmd==='start'){await launch();return}
  if(cmd==='menu'||!cmd){await menu();return}
  throw Error('Utilise prepare, status, install, start ou menu');
 }catch(e){console.error('ARK Astraeos : '+e.message);process.exitCode=1}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await cli();
export {configured,steamInstall,applyConfigs};
