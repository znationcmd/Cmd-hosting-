#!/usr/bin/env node
// CMD Hosting — four real DayZ Windows profiles, one server at a time, never Railway.
// Only reads installed game content and verified Workshop folders; never manufactures mod/game files.
import {readFile,writeFile,mkdir,open,unlink,readdir,cp,copyFile,stat} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {createInterface} from 'node:readline/promises';
import {acquireGameLock,releaseGameLock,gameProcessesRunning} from '../local-panel/exclusive-game-lock.mjs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const defaultBase=path.join(process.env.SystemDrive||'C:','CMD-Servers');
const gameRoot=path.resolve(process.env.CMD_DAYZ_ROOT||path.join(defaultBase,'cmd-dayz-personnel','dayz'));
const base=path.resolve(process.env.CMD_DAYZ_WORLDS_ROOT||path.join(defaultBase,'CMD-DayZ-4-Worlds'));
const lockfile=path.join(base,'one-server-at-a-time.lock');
const overridesFile=path.join(base,'workshop-ids.json');
const steamExe=path.join(defaultBase,'tools','steamcmd','steamcmd.exe');
const profilesDir=path.join(base,'profiles');
const ALLOWED=/^[0-9]{6,13}$/;
const safeMission=/^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)+$/;
async function manifest(){return JSON.parse(await readFile(path.join(HERE,'manifest.json'),'utf8'))}
async function overrides(){try{return JSON.parse(await readFile(overridesFile,'utf8'))}catch(e){if(e.code==='ENOENT')return {};throw e}}
async function saveOverrides(value){
 await mkdir(base,{recursive:true});
 const handle=await open(overridesFile+'.new','wx');
 try{await handle.writeFile(JSON.stringify(value,null,2)+'\n')}finally{await handle.close()}
 try{await (await import('node:fs/promises')).rename(overridesFile+'.new',overridesFile)}
 catch(e){throw e}
}
function resolveProfile(root,data,mods){
 const ids=mods?.[data.id]?.ids||{};
 return {...data,mission:mods?.[data.id]?.mission||data.map.mission,
  activeMods:data.mods.filter(m=>m.enabled).map(m=>({...m,workshopId:ids[m.name]||m.workshopId||null}))};
}
async function getProfile(id){const doc=await manifest(),profile=doc.profiles.find(p=>p.id===id);
 if(!profile)throw Error('Profil inconnu : '+id);
 return resolveProfile(base,profile,await overrides());
}
function configString(profile){
 const mission=profile.mission||'MISSION_A_CONFIGURER';
 return [
  '// CMD Hosting — '+profile.name+' — 100 slots — fichier conserve apres creation',
  'hostname = "'+profile.name+'";',
  'password = "";','passwordAdmin = "";','maxPlayers = 100;',
  'verifySignatures = 2;','forceSameBuild = 1;','disableVoN = 0;',
  'vonCodecQuality = 20;','disable3rdPerson = 0;','serverTime = "SystemTime";',
  'serverTimeAcceleration = 12;','serverNightTimeAcceleration = 4;',
  'serverTimePersistent = 0;','loginQueueConcurrentPlayers = 5;',
  'loginQueueMaxPlayers = 500;','instanceId = 1;','storageAutoFix = 1;',
  'class Missions { class DayZ { template = "'+mission+'"; }; };',''
 ].join('\r\n');
}
async function prepare(){
 const doc=await manifest();await mkdir(profilesDir,{recursive:true});
 const value=await overrides();
 if(!existsSync(overridesFile))await writeFile(overridesFile,JSON.stringify({},null,2)+'\n',{flag:'wx'});
 for(const p of doc.profiles){
  const dir=path.join(profilesDir,p.id);
  await mkdir(path.join(dir,'logs'),{recursive:true});
  await mkdir(path.join(dir,'profiles'),{recursive:true});
  const resolved=resolveProfile(base,p,value);
  const cfg=path.join(dir,'serverDZ.cfg');
  if(!existsSync(cfg))await writeFile(cfg,configString(resolved),{flag:'wx'});
  const checklist=path.join(dir,'mods-a-installer.txt');
  const rows=[resolved.name+' / '+resolved.map.name,'100 slots, un seul serveur demarre a la fois.','',
   ...resolved.mods.map(m=>(m.enabled?'[ACTIF] ':'[INACTIF] ')+m.name+' — Workshop '+(m.workshopId||'ID A VERIFIER'))];
  if(!existsSync(checklist))await writeFile(checklist,rows.join('\r\n')+'\r\n',{flag:'wx'});
 }
 return doc.profiles.length;
}
async function hasPbo(folder){
 const addons=path.join(folder,'addons');
 try{const items=await readdir(addons);return items.some(n=>/\.pbo$/i.test(n))}
 catch{return false}
}
async function inspect(profile){
 const missing=[];
 const executable=path.join(gameRoot,'DayZServer_x64.exe');
 if(!existsSync(executable))missing.push('Serveur DayZ officiel non installe : '+executable);
 if(!profile.mission||!safeMission.test(profile.mission))missing.push('Mission de '+profile.map.name+' non configuree');
 else {
  const mission=path.join(gameRoot,'mpmissions',profile.mission);
  if(!existsSync(path.join(mission,'init.c')))missing.push('Mission '+profile.mission+' absente (init.c)');
  if(!existsSync(path.join(mission,'db','types.xml')))missing.push('Mission '+profile.mission+' incomplete (db/types.xml)');
 }
 const modFolders=[];
 for(const mod of profile.activeMods){
  if(!mod.workshopId||!ALLOWED.test(mod.workshopId)){missing.push('Workshop ID introuvable pour : '+mod.name);continue}
  const folder='@'+mod.workshopId;
  const absolute=path.join(gameRoot,folder);
  if(!await hasPbo(absolute)){missing.push('Mod non installe : '+mod.name+' ('+mod.workshopId+')');continue}
  modFolders.push(folder);
 }
 return {profile:profile.id,slots:profile.slots,mission:profile.mission,missing,ready:!missing.length,
  modFolders,modsTotal:profile.activeMods.length,modsOnDisk:modFolders.length};
}
async function status(id){
 const profiles=id?[await getProfile(id)]:await Promise.all((await manifest()).profiles.map(p=>getProfile(p.id)));
 return Promise.all(profiles.map(inspect));
}
async function runningWindowsDayZ(){
 if(process.platform!=='win32')return false;
 const result=spawnSync('tasklist.exe',['/FI','IMAGENAME eq DayZServer_x64.exe','/NH'],{encoding:'utf8',timeout:8000,windowsHide:true});
 return /DayZServer_x64\.exe/i.test(result.stdout||'');
}
async function existingLock(){
 try{
  const data=JSON.parse(await readFile(lockfile,'utf8'));
  if(typeof data.pid==='number'){try{process.kill(data.pid,0);return data}catch(e){if(e.code==='EPERM')return data}}
  return {stale:true};
 }catch(e){if(e.code==='ENOENT')return null;return {stale:true}}
}
async function createLock(profile){
 // Shared across all five profiles, including ARK Ascended. Never run both servers.
 await acquireGameLock('dayz-'+profile.id);
 try{
 await mkdir(base,{recursive:true});
 if(gameProcessesRunning())throw Error('Un DayZ ou ARK est deja en cours : arrete-le proprement avant de changer de carte.');
 const old=await existingLock();
 if(old&&!old.stale)throw Error('Profil '+old.profile+' deja en cours. Un seul serveur a la fois.');
 if(old?.stale){if(await runningWindowsDayZ())throw Error('Processus DayZ encore actif.');await unlink(lockfile)}
 const handle=await open(lockfile,'wx');
 try{await handle.writeFile(JSON.stringify({pid:process.pid,profile:profile.id,startedAt:new Date().toISOString()}))}
 finally{await handle.close()}
 }catch(error){await releaseGameLock();throw error}
}
async function releaseLock(){
 try{const state=JSON.parse(await readFile(lockfile,'utf8'));if(state.pid===process.pid)await unlink(lockfile)}catch{}
 finally{await releaseGameLock()}
}
async function start(id){
 if(process.platform!=='win32')throw Error('Un serveur DayZ PC ne peut demarrer que sous Windows.');
 const profile=await getProfile(id);
 const check=await inspect(profile);
 if(!check.ready){console.log('DEMARRAGE BLOQUE : le serveur serait incomplet.');for(const item of check.missing)console.log(' - '+item);
  console.log('Consulte les mods-a-installer.txt et workshop-ids.json.');return false}
 await createLock(profile);
 try{
  const localDir=path.join(profilesDir,profile.id);
  const cfg=path.join(localDir,'serverDZ.cfg');
  const contents=await readFile(cfg,'utf8');
  if(!contents.includes('maxPlayers = 100;'))throw Error('Corrige serverDZ.cfg : nombre de slots differents de 100');
  if(!contents.includes('template = "'+profile.mission+'";'))throw Error('Le template de carte ne correspond pas a la mission installee : '+profile.mission);
  const args=['-config='+cfg,'-profiles='+path.join(localDir,'profiles'),'-port=2302',
   '-mod='+check.modFolders.join(';'),'-dologs','-adminlog','-netlog','-freezecheck'];
  console.log('DEMARRAGE : '+profile.name+' / 100 slots / '+profile.mission+' / '+check.modsTotal+' mods');
  console.log('Aucun autre profil ne pourra demarrer tant que DayZ tourne.');
  const game=spawn(path.join(gameRoot,'DayZServer_x64.exe'),args,{cwd:gameRoot,stdio:'inherit',windowsHide:false});
  const exit=await new Promise((res,rej)=>{game.once('error',rej);game.once('exit',(code,signal)=>res({code,signal}))});
  console.log('Serveur arrete. Code : '+exit.code);return exit.code===0;
 }finally{await releaseLock()}
}
async function setId(id,name,value){
 if(!ALLOWED.test(value))throw Error('Workshop ID invalide. Copie les chiffres apres id= sur Steam.');
 const p=await getProfile(id);
 const match=p.mods.find(m=>m.name.toLowerCase()===name.toLowerCase());
 if(!match)throw Error('Mod absent de ce profil : '+name);
 const data=await overrides();data[id]||={};data[id].ids||={};data[id].ids[match.name]=value;
 await saveOverrides(data);
 return {name:match.name,workshopId:value};
}
async function setMission(id,mission){
 if(!safeMission.test(mission))throw Error('Nom de mission invalide');
 const p=await getProfile(id);
 const dir=path.join(gameRoot,'mpmissions',mission);
 if(!existsSync(path.join(dir,'init.c')))throw Error('Mission introuvable. Installe les fichiers officiels du createur avant de la selectionner : '+mission);
 const data=await overrides();data[id]||={};data[id].mission=mission;
 await saveOverrides(data);
 const cfg=path.join(profilesDir,id,'serverDZ.cfg');
 const current=await readFile(cfg,'utf8');
 const next=current.replace(/template\s*=\s*"[^"]*"/,'template = "'+mission+'"');
 if(next===current)throw Error('Impossible de trouver template dans serverDZ.cfg');
 const backup=cfg+'.backup-'+Date.now();
 await copyFile(cfg,backup);
 await writeFile(cfg,next);
 return mission;
}
async function sync(id){
 if(process.platform!=='win32')throw Error('Installation Workshop reservee a Windows.');
 if(!existsSync(steamExe))throw Error('SteamCMD absent : installe dabord DayZ avec CMD Hosting. '+steamExe);
 const profile=await getProfile(id);
 const known=profile.activeMods.filter(m=>m.workshopId&&ALLOWED.test(m.workshopId));
 console.log('Telechargement des mods verifies via Steam Workshop ; certains demandent un compte Steam autorise.');
 for(const m of known){
  const dst=path.join(gameRoot,'@'+m.workshopId);
  if(await hasPbo(dst)){console.log('DEJA INSTALLE : '+m.name);continue}
  console.log('Workshop '+m.workshopId+' · '+m.name);
  const result=spawnSync(steamExe,['+login','anonymous','+workshop_download_item','221100',m.workshopId,'validate','+quit'],
   {cwd:path.dirname(steamExe),stdio:'inherit',timeout:1800000});
  if(result.status!==0){console.log('ECHEC / DROITS STEAM : '+m.name+'. Consulter Steam sur le PC.');continue}
  const src=path.join(path.dirname(steamExe),'steamapps','workshop','content','221100',m.workshopId);
  if(!await hasPbo(src)){console.log('Workshop non telecharge ou non autorise : '+m.name);continue}
  if(existsSync(dst)){console.log('Destination existante conservee : '+dst);continue}
  await cp(src,dst,{recursive:true,errorOnExist:true,force:false});
  const keys=path.join(dst,'keys');
  if(existsSync(keys)){
   await mkdir(path.join(gameRoot,'keys'),{recursive:true});
   for(const key of await readdir(keys)){
    if(!/\.bikey$/i.test(key))continue;
    const target=path.join(gameRoot,'keys',key);
    if(!existsSync(target))await copyFile(path.join(keys,key),target);
   }
  }
  console.log('MOD COPIE depuis Steam sur le disque : '+m.name);
 }
 const pending=profile.activeMods.filter(m=>!m.workshopId).map(m=>m.name);
 if(pending.length)console.log('IDS RESTANT A RESOUDRE :\n'+pending.map(x=>' - '+x).join('\n'));
}
async function menu(){
 await prepare();
 const rl=createInterface({input:process.stdin,output:process.stdout});
 try{
  while(true){
   const all=(await manifest()).profiles;
   console.log('\n=== CMD HOSTING — QUATRE CARTES DAYZ, UN SERVEUR ACTIF ===');
   all.forEach((p,i)=>console.log((i+1)+'. '+p.name+' (100 slots)'));
   console.log('5. Verifier les fichiers et mods\n6. Installer les mods deja identifies (SteamCMD)\n7. Renseigner l ID Workshop d un mod\n8. Selectionner un dossier de mission deja installe\n0. Quitter');
   const action=(await rl.question('Choix : ')).trim();
   if(action==='0')break;
   if(action==='5'){for(const v of await status())console.log(v.profile+' : '+(v.ready?'PRET':'NON PRET')+' ; '+v.modsOnDisk+'/'+v.modsTotal+' mods ; '+v.missing.length+' manquants');continue}
   if(action==='6'){const number=Number(await rl.question('Profil 1-4 : '));if(number>=1&&number<=4)await sync(all[number-1].id);continue}
   if(action==='7'){
    const number=Number(await rl.question('Profil 1-4 : '));if(!(number>=1&&number<=4))continue;
    const p=await getProfile(all[number-1].id);
    p.activeMods.forEach((m,i)=>console.log((i+1)+'. '+m.name+': '+(m.workshopId||'A TROUVER')));
    const i=Number(await rl.question('Numero mod : '))-1;
    if(!p.activeMods[i])continue;
    const value=(await rl.question('Workshop ID officiel : ')).trim();
    console.log(await setId(p.id,p.activeMods[i].name,value));continue;
   }
   if(action==='8'){
    const number=Number(await rl.question('Profil 1-4 : '));if(!(number>=1&&number<=4))continue;
    const mission=(await rl.question('Nom du dossier mpmissions deja present : ')).trim();
    console.log(await setMission(all[number-1].id,mission));continue;
   }
   if(/^[1-4]$/.test(action)){
    const id=all[Number(action)-1].id;
    await start(id);continue;
   }
  }
 }finally{rl.close()}
}
async function cli(){
 const [command,id,name,value]=process.argv.slice(2);
 try{
  if(command==='prepare'){console.log('PROFILS PREPARES : '+await prepare());return}
  if(command==='status'){await prepare();for(const r of await status(id)){console.log('\n'+r.profile+' : '+(r.ready?'PRET':'NON PRET')+' | '+r.modsOnDisk+'/'+r.modsTotal+' mods');
    for(const m of r.missing)console.log(' - '+m)}return}
  if(command==='start'){await prepare();if(!await start(id))process.exitCode=2;return}
  if(command==='sync'){await prepare();await sync(id);return}
  if(command==='set-id'){await prepare();console.log(await setId(id,name,value));return}
  if(command==='set-mission'){await prepare();console.log(await setMission(id,name));return}
  if(command==='menu'||!command){await menu();return}
  throw Error('Commande inconnue. prepare | status | menu | sync | start | set-id | set-mission');
 }catch(e){console.error('\nERREUR : '+e.message);process.exitCode=1}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await cli();
export {manifest,resolveProfile,configString,inspect,status,prepare};
