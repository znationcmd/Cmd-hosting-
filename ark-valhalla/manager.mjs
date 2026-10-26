#!/usr/bin/env node
/**
 * CMD Hosting / CMD Valhalla Astraeos - local Windows only, not Railway.
 * Does not create fake game content, purchase a DLC or bypass paid mods.
 * Needs the official ARK ASA dedicated executable and 24 verified CurseForge mods.
 * Timezone-aware restart with RCON SaveWorld and DoExit; never force-kills a world.
 */
import {readFile,writeFile,mkdir,copyFile,open,unlink,stat} from 'node:fs/promises';
import {spawn,spawnSync} from 'node:child_process';
import {createConnection} from 'node:net';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(process.env.CMD_SERVERS_ROOT || path.join(process.env.SystemDrive||'C:','CMD-Servers'));
const GAME=path.join(ROOT,'CMD-Valhalla-Astraeos','ark-asa');
const EXE=path.join(GAME,'ShooterGame','Binaries','Win64','ArkAscendedServer.exe');
const CONFIG=path.join(GAME,'ShooterGame','Saved','Config','WindowsServer');
const STATE=path.join(ROOT,'CMD-Valhalla-Astraeos','cmdhosting-local');
const OVERRIDES=path.join(STATE,'mod-confirmations.json');
const LOCK=path.join(STATE,'manager.lock');
const MOD_ID=/^[0-9]{5,10}$/;
async function present(file){try{return (await stat(file)).isFile()}catch{return false}}
async function manifest(){return JSON.parse(await readFile(path.join(HERE,'manifest.json'),'utf8'))}
async function approvals(){
 try{return JSON.parse(await readFile(OVERRIDES,'utf8'))}catch(e){if(e.code==='ENOENT')return {mods:{},paidMapAuthorized:false};throw e}
}
async function templates(){
 await mkdir(STATE,{recursive:true});
 await mkdir(path.join(STATE,'templates'),{recursive:true});
 for(const name of ['Game.ini','GameUserSettings.ini']){
  const dest=path.join(STATE,'templates',name);
  if(!await present(dest))await copyFile(path.join(HERE,name),dest);
 }
 if(!await present(OVERRIDES))
  await writeFile(OVERRIDES,JSON.stringify({paidMapAuthorized:false,mods:{}},null,2)+'\n',{flag:'wx'});
 return {state:STATE,installation:GAME};
}
async function apply(){
 if(!await present(EXE))throw Error('ARK officiel absent. Installer d’abord Steam app 2430930 depuis le programme Windows.');
 await mkdir(CONFIG,{recursive:true});
 const result=[];
 for(const name of ['Game.ini','GameUserSettings.ini']){
  const target=path.join(CONFIG,name);
  if(await present(target)){result.push(name+': conservé (existant, fusion manuelle si nécessaire)');continue}
  await copyFile(path.join(HERE,name),target,1);
  result.push(name+': installé (nouveau uniquement)');
 }
 return result;
}
async function checks(){
 const [data,extra]=await Promise.all([manifest(),approvals()]);
 const missing=[],warnings=[];
 if(process.platform!=='win32')missing.push('Hôte Windows requis pour ArkAscendedServer.exe.');
 if(!await present(EXE))missing.push('Binaire ARK ASA officiel absent : '+EXE);
 if(!await present(path.join(GAME,'steamapps','appmanifest_2430930.acf')))
  warnings.push('Manifeste Steam officiel absent du chemin habituel; intégrité de l’installation à confirmer.');
 if(!extra.paidMapAuthorized)missing.push('DLC officiel Astraeos : les droits/accès doivent être confirmés localement, aucun achat automatique.');
 for(const name of ['Game.ini','GameUserSettings.ini']){
  if(!await present(path.join(CONFIG,name))){missing.push('Configuration manquante : '+name);continue}
  const text=await readFile(path.join(CONFIG,name),'utf8');
  if(name==='GameUserSettings.ini' && (!/XPMultiplier=10\.0/i.test(text)||!/OverrideOfficialDifficulty=10\.0/i.test(text)))
   missing.push('GameUserSettings.ini actuel ne contient pas les réglages Valhalla; fusion manuelle requise.');
  if(name==='Game.ini'&&!/BabyMatureSpeedMultiplier=900\.0/i.test(text))
   missing.push('Game.ini actuel ne contient pas maturation ×900; fusion manuelle requise.');
 }
 const known=[];
 for(const mod of data.mods){
  const approval=extra.mods?.[mod.name]||{};
  const id=approval.curseforgeId||mod.curseforgeId;
  if(!id || !MOD_ID.test(String(id))){
   missing.push('CurseForge : identifiant du mod non confirmé — '+mod.name);
   continue;
  }
  if(mod.verification==='name_to_confirm'&&!approval.nameMatched)
   missing.push('Vérifier la correspondance du mod RP demandé : '+mod.name+' (candidat RolePlay Additions: Jobs).');
  if(['platform_to_confirm','name_to_confirm'].includes(mod.verification)&&approval.consoleCrossplayConfirmed!==true){
   if(mod.crossplayReportedByOwner===true)
    warnings.push('Cross-play annoncé compatible par le propriétaire, à tester en connexion PC/PS5/Xbox : '+mod.name);
   else missing.push('Cross-play PC/PS5/Xbox non vérifié : '+mod.name);
  }
  if(mod.verification==='premium_review'&&approval.entitlementConfirmed!==true)
   missing.push('Licence/accès premium ou freemium à confirmer : '+mod.name);
  known.push(String(id));
 }
 if(new Set(known).size!==known.length)missing.push('Identifiants CurseForge dupliqués : vérifier les mods.');
 if(known.length!==24)missing.push('Nombre de mods correctement identifiés : '+known.length+'/24.');
 const adminConfig=path.join(CONFIG,'GameUserSettings.ini');
 let hasAdmin=false;
 try{
  const value=await readFile(adminConfig,'utf8');
  hasAdmin=/^\s*ServerAdminPassword\s*=\s*\S+/mi.test(value);
 }catch{}
 if(!hasAdmin)missing.push('Mot de passe administrateur RCON absent dans GameUserSettings.ini : redémarrages sûrs 08 h/12 h/22 h impossibles.');
 return {ready:missing.length===0,missing,warnings,officialExecutablePresent:await present(EXE),
  verifiedIdsCount:known.length,modsCount:data.mods.length,map:data.map.code,slots:100,
  restartTimes:data.restarts.times,timezone:'Europe/Paris',gameRoot:GAME,configRoot:CONFIG,
  windowsOnly:true,railway:false,mods:known,hasRconSecret:hasAdmin,
  crossplayClaim:data.crossplay,crossplayRuntimeVerified:false};
}
async function updateApprovals(mutator){
 await templates();
 const v=await approvals();
 mutator(v);
 const tmp=OVERRIDES+'.new-'+process.pid;
 const handle=await open(tmp,'wx');
 try{await handle.writeFile(JSON.stringify(v,null,2)+'\n')}finally{await handle.close()}
 const {rename}=await import('node:fs/promises');
 await rename(tmp,OVERRIDES);
}
async function setMod(name,id,consoleApproved=false,match=false,premium=false){
 const data=await manifest();
 if(!data.mods.some(m=>m.name===name))throw Error('Mod absent du profil : '+name);
 if(!MOD_ID.test(id))throw Error('ID CurseForge invalide (5 à 10 chiffres).');
 await updateApprovals(v=>{v.mods||={};v.mods[name]={...v.mods[name],curseforgeId:id,
  consoleCrossplayConfirmed:consoleApproved,nameMatched:match,entitlementConfirmed:premium};});
}
async function lock(){
 if(process.platform==='win32'){
  const proc=spawnSync('tasklist.exe',['/FI','IMAGENAME eq ArkAscendedServer.exe','/NH'],{encoding:'utf8',timeout:9000});
  if(/ArkAscendedServer\.exe/i.test(proc.stdout||''))throw Error('Serveur ASA déjà en cours sur la machine. Arrête-le proprement.');
 }
 await mkdir(STATE,{recursive:true});
 if(await present(LOCK)){
  const previous=JSON.parse(await readFile(LOCK,'utf8'));
  if(Number.isSafeInteger(previous.pid)){
   try{process.kill(previous.pid,0);throw Error('Gestionnaire ARK Valhalla déjà actif.')}
   catch(e){if(e.code!=='ESRCH')throw e}
  }
  await unlink(LOCK);
 }
 const h=await open(LOCK,'wx');
 try{await h.writeFile(JSON.stringify({pid:process.pid,at:new Date().toISOString()}))}
 finally{await h.close()}
}
async function unlock(){
 try{const v=JSON.parse(await readFile(LOCK,'utf8'));if(v.pid===process.pid)await unlink(LOCK)}catch{}
}
function parisSlot(at=new Date()){
 const x=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',
  day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(at);
 const v=Object.fromEntries(x.filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
 return {date:v.year+'-'+v.month+'-'+v.day,time:v.hour+':'+v.minute};
}
function packet(id,type,value){
 const payload=Buffer.from(value,'utf8');
 const out=Buffer.alloc(14+payload.length);
 out.writeInt32LE(10+payload.length,0);out.writeInt32LE(id,4);out.writeInt32LE(type,8);payload.copy(out,12);
 return out;
}
async function rcon(command,password){
 return new Promise((resolve,reject)=>{
  const sock=createConnection({host:'127.0.0.1',port:27020});
  let finished=false,authed=false,pending=Buffer.alloc(0);
  const timer=setTimeout(()=>done(Error('RCON local indisponible (10 secondes)')),10000);
  function done(error){
   if(finished)return;finished=true;clearTimeout(timer);sock.destroy();
   if(error)reject(error);else resolve(true);
  }
  sock.on('error',done);
  sock.on('connect',()=>sock.write(packet(401,3,password)));
  sock.on('data',data=>{
   pending=Buffer.concat([pending,data]);
   while(pending.length>=4){
    const len=pending.readInt32LE(0);
    if(len<10||len>4096){done(Error('Réponse RCON invalide'));return}
    if(pending.length<len+4)break;
    const id=pending.readInt32LE(4),type=pending.readInt32LE(8);
    pending=pending.subarray(len+4);
    if(!authed && id===-1){done(Error('Mot de passe administrateur RCON incorrect'));return}
    if(!authed && id===401 && type===2){authed=true;sock.write(packet(402,2,command));continue}
    if(authed&&id===402){done();return}
   }
  });
 });
}
function passwordFromIni(text){
 const m=/^\s*ServerAdminPassword\s*=\s*(\S+)\s*$/mi.exec(text);
 return m?.[1]?.trim()||'';
}
async function gracefulRestart(child){
 const config=await readFile(path.join(CONFIG,'GameUserSettings.ini'),'utf8');
 const pass=passwordFromIni(config);
 if(!pass){console.error('Redémarrage automatique REFUSÉ : mot de passe RCON absent.');return false}
 try{
  await rcon('ServerChat CMD Valhalla : sauvegarde et redémarrage imminent.',pass);
  await rcon('SaveWorld',pass);
  await new Promise(r=>setTimeout(r,15000));
  await rcon('DoExit',pass);
  await Promise.race([new Promise(resolve=>{if(child.exitCode!==null)resolve();else child.once('exit',resolve)}),new Promise((_,reject)=>setTimeout(()=>reject(Error('DoExit sans confirmation de sortie sous 90 secondes')),90000))]);
  return true;
 }catch(e){
  console.error('Redémarrage NON FORCE, sauvegardes protégées : '+e.message);
  return false;
 }
}
async function run(){
 const validation=await checks();
 if(!validation.ready){console.error('DÉMARRAGE BLOQUÉ — configuration/licences non validées :');
  for(const error of validation.missing)console.error(' - '+error);
  return false}
 if(process.platform!=='win32')return false;
 await lock();
 const data=await manifest();
 const args=[data.map.code+'?listen?SessionName='+encodeURIComponent(data.displayName),
  '-port=7777','-QueryPort=27015','-WinLiveMaxPlayers=100','-server','-log','-mods='+validation.mods.join(',')];
 let child,done=false,restarting=false;
 const launched=new Set();
 function spawnGame(){
  console.log('ARK Astraeos : lancement officiel 100 slots, mods CurseForge='+validation.mods.length);
  child=spawn(EXE,args,{cwd:path.dirname(EXE),stdio:'inherit',windowsHide:false});
  child.once('error',e=>{console.error('Erreur ARK : '+e.message);done=true});
  child.once('exit',(code)=>{console.log('ARK terminé : '+code);if(!restarting)done=true});
 }
 try{
  spawnGame();
  const scheduler=setInterval(async()=>{
   if(done||!child||child.exitCode!==null)return;
   const now=parisSlot(),slot=now.date+'-'+now.time;
   if(!data.restarts.times.includes(now.time)||launched.has(slot)||restarting)return;
   launched.add(slot);restarting=true;
   console.log('Redémarrage programmé '+now.time+' Europe/Paris : tentative SaveWorld → DoExit');
   try{
    if(await gracefulRestart(child)){
     spawnGame();
     console.log('Redémarrage sauvegardé.');
    }else if(child.exitCode!==null)done=true;
   }finally{restarting=false}
  },15000);
  try{while(!done)await new Promise(r=>setTimeout(r,1000))}
  finally{clearInterval(scheduler)}
  return true;
 }finally{await unlock()}
}
async function main(){
 const [cmd,a,b,c]=process.argv.slice(2);
 const commands=['prepare','check','apply','approve-map','verify-mod','run'];
 if(!commands.includes(cmd)){console.log('Usage : node manager.mjs prepare | check | apply | approve-map | verify-mod "Nom exact" ID [crossplay] [match] [premium] | run');return}
 if(cmd==='prepare'){console.log(await templates());return}
 if(cmd==='check'){console.log(JSON.stringify(await checks(),null,2));return}
 if(cmd==='apply'){await templates();console.log(await apply());return}
 if(cmd==='approve-map'){await updateApprovals(v=>{v.paidMapAuthorized=true});console.log('Droits carte Astraeos confirmés par l’administrateur, aucun achat réalisé.');return}
 if(cmd==='verify-mod'){await setMod(a,b,c==='true',process.argv[6]==='true',process.argv[7]==='true');console.log('Vérification locale enregistrée sans téléchargement.');return}
 if(cmd==='run'){if(!await run())process.exitCode=2}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 await main().catch(e=>{console.error('Erreur CMD Valhalla Astraeos : '+e.message);process.exitCode=1});
export {manifest,checks,templates,parisSlot,packet};
