#!/usr/bin/env node
/**
 * CMD Hosting • Fichiers des vrais serveurs (autonome, sans Railway).
 * Node 22+; zero NPM dependency. Standalone host-side file service.
 * A registered game server exposes its own on-disk installation, never a demo tree.
 * Localhost only by default. Do NOT port-forward HTTP to the public Internet.
 */
import http from 'node:http';
import {spawn} from 'node:child_process';
import {PROFILES,knownProfile,profileChecks,prepareProfile} from './game-profiles.mjs';
import {lifetimeRegistry,GAME_SUGGESTIONS} from './persistent-profiles.mjs';
import {gameProcessesRunning} from './exclusive-game-lock.mjs';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {readFile,readdir,writeFile,rename,mkdir,lstat,realpath,copyFile,open,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const stateDir=path.resolve(process.env.CMD_FILES_STATE_DIR||path.join(os.homedir(),'.cmdhosting','files-panel'));
const defaultServersRoot=process.env.CMD_SERVERS_ROOT||(
 process.platform==='win32'?path.join(process.env.SystemDrive||'C:','CMD-Servers'):path.join(os.homedir(),'CMD-Servers'));
const installRoot=path.resolve(defaultServersRoot);
const manifestPath=path.join(stateDir,'servers.json');
const keyFile=path.join(stateDir,'access-token.txt');
const lifetime=lifetimeRegistry({file:path.join(stateDir,'persistent-game-profiles.json')});
const listenHost=process.env.CMD_FILES_LISTEN_HOST||'127.0.0.1';
const port=Number(process.env.CMD_FILES_PORT||8788);
const DAYZ_SCRIPT=path.resolve(HERE,'..','scripts','Installer-DayZ-PC-1-clic.ps1');
let dayzSetup={state:'idle',startedAt:null,finishedAt:null,exitCode:null};
const profileSessions=new Map();
const profileManagerPaths=new Map([
 ['dayz',path.resolve(HERE,'..','dayz-worlds','manager.mjs')],
 ['ark-asa',path.resolve(HERE,'..','asa-astraeos','manager.mjs')]
]);
function activeSession(){
 for(const [id,item] of profileSessions)if(item.state==='démarrage'||item.state==='processus-actif')return {id,...item};
 return null;
}
async function gameProfileStatus(){
 const checked=await profileChecks(),active=activeSession();
 return checked.map(p=>({...p,
  localOnly:true,startedByThisPanel:active?.id===p.id,
  processState:profileSessions.get(p.id)?.state||'arrêté',
  processId:profileSessions.get(p.id)?.pid||null,
  // A running launcher is NOT proof the actual game is reachable from the Internet.
  publiclyReachableVerified:false}));
}
const locallyRequested=req=>{
 const ip=req.socket.remoteAddress||'';
 return ip==='127.0.0.1'||ip==='::1'||ip==='::ffff:127.0.0.1';
};
function localNetworkAddresses(){
 if(listenHost==='127.0.0.1'||listenHost==='::1')return [];
 const found=[];
 for(const items of Object.values(os.networkInterfaces())){
  for(const info of items||[]){
   if(info.internal||info.family!=='IPv4')continue;
   const addr=info.address;
   // Display private LAN addresses only, never publish public network interfaces.
   if(!(/^10\\./.test(addr)||/^192\\.168\\./.test(addr)||/^172\\.(1[6-9]|2[0-9]|3[01])\\./.test(addr)))continue;
   found.push('http://'+addr+':'+port);
  }
 }
 return [...new Set(found)];
}
async function dayzSetupStatus(){
 let installerAvailable=false;
 try{installerAvailable=(await stat(DAYZ_SCRIPT)).isFile()}catch{}
 const gameDir=path.join(installRoot,'cmd-dayz-personnel','dayz');
 let exeFound=false,manifestFound=false;
 try{exeFound=(await stat(path.join(gameDir,'DayZServer_x64.exe'))).isFile()}catch{}
 try{manifestFound=(await stat(path.join(gameDir,'steamapps','appmanifest_223350.acf'))).isFile()}catch{}
 return {allowed:process.platform==='win32',installerAvailable,installRoot,gameDir,
  filesPresent:exeFound&&manifestFound,realGameFilesOnly:true,...dayzSetup};
}

const MAX_TEXT=2*1024*1024,MAX_UPLOAD=25*1024*1024;
const TEXT=/\.(?:cfg|json|xml|ini|txt|c|conf|config|yaml|yml|properties|log|rpt|adm|lua|toml|bat|ps1|md|csv)$/i;
const SECURE=/^(?:\.env(?:\..*)?|auth\.json|credentials?\.(?:json|txt)|access-token\.txt|machine-token\.dpapi)$/i;
const profiles={
 dayz:{name:'DayZ PC',landmark:'DayZServer_x64.exe',configs:['serverDZ.cfg','mpmissions'],maps:'mission'},
 'ark-asa':{name:'ARK Survival Ascended',landmark:'ShooterGame/Binaries/Win64/ArkAscendedServer.exe',configs:['ShooterGame/Saved/Config/WindowsServer/Game.ini','ShooterGame/Saved/Config/WindowsServer/GameUserSettings.ini']},
 'ark-ase':{name:'ARK Survival Evolved',landmark:'ShooterGame/Binaries/Win64/ShooterGameServer.exe',configs:['ShooterGame/Saved/Config/WindowsServer/Game.ini','ShooterGame/Saved/Config/WindowsServer/GameUserSettings.ini']},
 'arma-reforger':{name:'Arma Reforger',landmark:'ArmaReforgerServer.exe',configs:['config.json']},
 'arma-3':{name:'Arma 3',landmark:'arma3server_x64.exe',configs:['server.cfg','basic.cfg','mpmissions']},
 '7dtd':{name:'7 Days to Die',landmark:'7DaysToDieServer.exe',configs:['serverconfig.xml']},
 palworld:{name:'Palworld',landmark:'PalServer.exe',configs:['Pal/Saved/Config/WindowsServer/PalWorldSettings.ini','Mods/PalModSettings.ini','Mods/Workshop']},
 satisfactory:{name:'Satisfactory',landmark:'FactoryServer.exe',configs:['FactoryGame/Saved/Config/WindowsServer/Game.ini']},
 anomalia:{name:'ANOMALIA PRIMEVAL OUTBOUNDUN',landmark:'AnomaliaServer.exe',configs:[]}
};
function bad(code,message){const err=new Error(message);err.status=code;return err}
function validId(input){return typeof input==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{1,63}$/.test(input)}
function normRel(v,{root=false}={}){
 if(root&&(v===undefined||v===null||v===''))return '';
 if(typeof v!=='string'||v.length>700||v.includes('\0')||v.startsWith('/')||v.startsWith('\\')||/^[a-z]:/i.test(v))throw bad(400,'Chemin invalide');
 const parts=v.replaceAll('\\','/').split('/');
 if(parts.some(x=>!x||x==='.'||x==='..'||x.includes(':')))throw bad(400,'Chemin hors du serveur interdit');
 if(parts.some(x=>SECURE.test(x)))throw bad(403,'Fichier de connexion protégé');
 return parts.join('/');
}
function within(root,child){
 const rel=path.relative(root,child);
 return rel===''||(!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel));
}
async function pathChecked(root,rel,{exists=true,dir=false}={}){
 const rootEntry=await lstat(root);
 if(rootEntry.isSymbolicLink())throw bad(403,'Racine liée non autorisée');
 const realRoot=await realpath(root);
 const parts=rel?rel.split('/'):[];
 let current=realRoot;
 for(let i=0;i<parts.length;i++){
  current=path.join(current,parts[i]);
  if(!within(realRoot,current))throw bad(403,'Sortie du serveur interdite');
  let entry;
  try{entry=await lstat(current)}catch(e){if(e.code==='ENOENT'&&!exists&&i===parts.length-1)return current;throw e}
  if(entry.isSymbolicLink())throw bad(403,'Lien symbolique interdit');
  if(i<parts.length-1&&!entry.isDirectory())throw bad(400,'Parent non dossier');
 }
 if(dir&&!(await lstat(current)).isDirectory())throw bad(400,'Ce n’est pas un dossier');
 return current;
}
async function config(){
 try {
  const v=JSON.parse(await readFile(manifestPath,'utf8'));
  if(!Array.isArray(v.servers)||v.servers.length>500)throw Error('Manifest incompatible');
  return v;
 }catch(e){if(e.code==='ENOENT')return {schema:'cmd-hosting/file-panel-v1',servers:[]};throw e}
}
async function saveManifest(doc){
 await mkdir(stateDir,{recursive:true,mode:0o700});
 const tmp=manifestPath+'.'+process.pid+'.tmp';
 await writeFile(tmp,JSON.stringify(doc,null,2)+'\n',{flag:'wx',mode:0o600});
 await rename(tmp,manifestPath);
}
function isGameDir(name){return Object.hasOwn(profiles,name)}
async function discover(){
 const found=[],seen=new Set();
 async function inspect(folder,depth){
  let entries;try{entries=await readdir(folder,{withFileTypes:true})}catch{return}
  for(const p of entries){
   if(!p.isDirectory()||p.isSymbolicLink()||p.name.startsWith('.'))continue;
   const candidate=path.join(folder,p.name);
   for(const [game,spec] of Object.entries(profiles)){
    if(game==='anomalia')continue; // no verified ANOMALIA dedicated server published
    try{
     const exe=await pathChecked(candidate,normRel(spec.landmark));
     if((await lstat(exe)).isFile()){
      const key=path.resolve(candidate).toLowerCase();
      if(!seen.has(key)){seen.add(key);found.push({id:'detected-'+found.length,game,name:spec.name+' · '+p.name,root:candidate,detected:true});}
     }
    }catch{/*not an installation*/}
   }
   if(depth>0)await inspect(candidate,depth-1);
  }
 }
 await inspect(installRoot,2);
 return found;
}
async function instances(){
 const manual=(await config()).servers;
 const detected=await discover();
 const saved=(await lifetime.list()).filter(p=>p.directory).map(p=>({
  id:p.id,game:p.gameKey,name:p.name,root:p.directory,detected:false,
  persistentProfile:true,gameName:p.gameName,map:p.map,slots:p.slots
 }));
 const known=new Set([...manual,...saved].map(x=>path.resolve(x.root).toLowerCase()));
 return [...manual.map(x=>({...x,detected:false})),...saved,
  ...detected.filter(x=>!known.has(path.resolve(x.root).toLowerCase()))];
}
async function selected(id){
 const item=(await instances()).find(x=>x.id===id);
 if(!item)throw bad(404,'Serveur non enregistré');
 if(!within(installRoot,path.resolve(item.root)))throw bad(403,'Installation hors du dossier autorisé');
 // Windows realpath may canonicalize 8.3 short-directory names; compare canonical
 // roots, not the original spelling, while rejecting junction escapes.
 const actualRoot=await realpath(item.root);
 const actualInstallRoot=await realpath(installRoot);
 if(!within(actualInstallRoot,actualRoot)||actualRoot===actualInstallRoot)
  throw bad(403,'Racine réelle du serveur hors du disque autorisé');
 const st=await lstat(item.root);
 if(!st.isDirectory()||st.isSymbolicLink())throw bad(400,'Dossier indisponible');
 await pathChecked(item.root,'',{dir:true});
 return item;
}
async function listed(){
 const all=await instances();
 return Promise.all(all.map(async x=>{
  const spec=profiles[x.game];
  const expected=spec?.landmark||'';
  let installed=false;
  if(expected)try{const p=await pathChecked(x.root,normRel(expected));installed=(await lstat(p)).isFile()}catch{}
  const configs=[];
  for(const rel of spec?.configs||[])try{await pathChecked(x.root,normRel(rel));configs.push(rel)}catch{}
  return {id:x.id,game:x.game,name:x.name,root:x.root,installed,detected:x.detected,
   configFiles:configs,expectedBinary:expected,kind:spec?'verified-adapter':'custom-directory',
   note:installed?'Binaire du serveur détecté. Démarrage et connexion non vérifiés.':'Fichiers officiels non vérifiés. Aucun serveur actif revendiqué.'};
 }));
}
function reply(res,status,data){const body=JSON.stringify(data);res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(body)}
async function body(req,limit=MAX_TEXT+10000){
 const chunks=[];let len=0;for await(const chunk of req){len+=chunk.length;if(len>limit)throw bad(413,'Fichier trop volumineux');chunks.push(chunk)}
 return Buffer.concat(chunks);
}
async function jsonBody(req,limit){try{return JSON.parse((await body(req,limit)).toString('utf8'))}catch(e){if(e.status)throw e;throw bad(400,'JSON invalide')}}
async function backUp(instance,rel,file){
 const safe=normRel(rel);
 const dest=path.join(stateDir,'backups',instance.id,...safe.split('/'));
 await mkdir(path.dirname(dest),{recursive:true,mode:0o700});
 const stamp=new Date().toISOString().replace(/[:.]/g,'-');
 await copyFile(file,dest+'.'+stamp+'.bak');
}
async function atomicSave(instance,rel,content,{create=false}={}){
 if(!TEXT.test(rel))throw bad(400,'Edition limitée aux fichiers texte de configuration');
 const target=await pathChecked(instance.root,rel,{exists:!create});
 const dir=path.dirname(target);
 if(!create){const before=await lstat(target);if(!before.isFile()||before.size>MAX_TEXT)throw bad(400,'Fichier binaire ou trop volumineux');await backUp(instance,rel,target)}
 else {try{await lstat(target);throw bad(409,'Le fichier existe déjà')}catch(e){if(e.status)throw e;if(e.code!=='ENOENT')throw e}}
 const tmp=target+'.cmdhosting-'+process.pid+'-'+randomBytes(4).toString('hex')+'.tmp';
 try{await writeFile(tmp,content,{mode:0o600,flag:'wx'});await rename(tmp,target)}finally{
  try{const {unlink}=await import('node:fs/promises');await unlink(tmp)}catch{}
 }
}
const workshopSources=Object.freeze({
 dayz:{name:'Steam Workshop DayZ PC',url:'https://steamcommunity.com/app/221100/workshop/'},
 'ark-asa':{name:'CurseForge ARK Survival Ascended',url:'https://www.curseforge.com/ark-survival-ascended/mods'},
 'ark-ase':{name:'Steam Workshop ARK Survival Evolved',url:'https://steamcommunity.com/app/346110/workshop/'},
 'arma-reforger':{name:'Arma Reforger Workshop',url:'https://reforger.armaplatform.com/workshop'},
 palworld:{name:'Steam Workshop Palworld',url:'https://steamcommunity.com/app/1623730/workshop/'}
});
async function profileModView(id){
 const known=knownProfile(id);
 const personal=known?null:(await lifetime.list()).find(x=>x.id===id);
 if(!known&&!personal)throw bad(404,'Profil introuvable.');
 const game=known?.game||personal.gameKey;
 let mods=[],map=known?.map||personal?.map||'';
 if(known){
  const manifestFile=path.resolve(HERE,'..',known.game==='dayz'?'dayz-worlds':'asa-astraeos','manifest.json');
  const raw=JSON.parse(await readFile(manifestFile,'utf8'));
  const snapshot=known.game==='dayz'?raw.profiles.find(x=>x.id===id):raw;
  if(!snapshot)throw bad(404,'Profil de mods introuvable.');
  mods=(snapshot.mods||[]).map(m=>({
   name:m.name,sourceId:m.workshopId||m.curseForgeId||null,
   enabled:m.enabled!==false,installedVerified:false,
   state:'prévu — installation à vérifier'
  }));
 }
 return {id,game,map,mods,workshop:workshopSources[game]||null,
  filesInstalledNotAssumed:true,source:'manifest local sur le PC',
  note:mods.length?'Liste demandée : aucune installation de mod affirmée sans contrôle disque.':
  'Les mods disponibles dépendent des fichiers du serveur installé et des conditions du jeu.'};
}
async function action(req,res,url){
 const route=url.pathname,method=req.method;
 if(route==='/api/status'&&method==='GET')return reply(res,200,{name:'CMD Hosting Fichiers',mode:'local-host',railway:false,defaultRoot:installRoot,bind:listenHost,pcOnline:true,lanEnabled:listenHost==='0.0.0.0',lanAddresses:localNetworkAddresses(),remoteInternetEnabled:false,phoneRequiresSameWifi:true,gameServerInstalledNotImplied:true});
 if(route==='/api/servers'&&method==='GET')return reply(res,200,{servers:await listed(),catalogueNote:'Tous les jeux avec des fichiers sur un hôte peuvent être enregistrés; aucune arborescence fictive.'});
 if(route==='/api/profile/workshop'&&method==='GET')return reply(res,200,await profileModView(url.searchParams.get('id')));
 if(route==='/api/library/catalogue'&&method==='GET'){
  return reply(res,200,{suggestions:GAME_SUGGESTIONS,freeGameName:true,serverSoftwareMayBeUnavailable:true,
   note:'Choisis un jeu ou saisis le nom de n’importe quel jeu du catalogue. Profil sans échéance ; logiciel serveur officiel nécessaire pour jouer.'});
 }
 if(route==='/api/library/profiles'&&method==='GET'){
  const saved=await lifetime.rentalView(),available=await listed();
  return reply(res,200,{profiles:saved.map(p=>({...p,linkedFilesAvailable:available.some(x=>x.id===p.id),
   gameInstalledVerified:available.some(x=>x.id===p.id&&x.installed),runningVerified:false})),
   oneGameRunningAtATime:true,autoDelete:false,expiryDays:null,
   rentalPeriodsDays:[3,30,90,365],rentalExpiryAction:'suspend-without-deletion',dataRetention:'until-owner-explicit-deletion',billingConnected:false,
   serverCreatedDoesNotMeanInstalled:true});
 }
 if(route==='/api/library/profiles/export'&&method==='GET')return reply(res,200,await lifetime.snapshot());
 if(route==='/api/library/profiles'&&method==='POST'){
  const data=await jsonBody(req,4096),created=await lifetime.create(data);
  return reply(res,201,{created:true,profile:created,gameInstalled:false,
   note:'Profil conservé sans date de suppression. Location de 30 jours en attente de paiement vérifié ; aucun serveur activé automatiquement.'});
 }
 if(route==='/api/library/profiles'&&method==='PATCH'){
  const data=await jsonBody(req,4096);
  if(!validId(data.id))throw bad(400,'Identifiant de profil invalide.');
  const updated=await lifetime.modify(data.id,data);
  return reply(res,200,{updated:true,profile:updated});
 }
 if(route==='/api/library/profiles/rental'&&method==='POST'){
  const data=await jsonBody(req,2048);
  if(!validId(data.id))throw bad(400,'Profil de location invalide.');
  const periodDays=Number(data.periodDays);
  if(![3,30,90,365].includes(periodDays))throw bad(400,'Durée autorisée : 3, 30, 90 ou 365 jours.');
  const updated=await lifetime.configurePeriod(data.id,periodDays);
  return reply(res,200,{updated:true,profile:updated,paymentCaptured:false,
   autoDelete:false,expiredAction:'suspend',renewalRequiresVerifiedPayment:true,
   note:'Durée enregistrée. Aucun paiement encaissé ni serveur activé. À expiration, fichiers, cartes, mods et sauvegardes conservés.'});
 }
 if(route==='/api/library/profiles/link'&&method==='POST'){
  if(!locallyRequested(req))throw bad(403,'Association de dossiers réels autorisée depuis le PC hôte uniquement.');
  const data=await jsonBody(req,4096);
  if(!validId(data.id)||typeof data.directory!=='string'||data.directory.length>800)
   throw bad(400,'Dossier invalide.');
  const physical=path.resolve(data.directory);
  if(!within(installRoot,physical)||physical===installRoot)
   throw bad(403,'Choisis un dossier de serveur sous CMD-Servers.');
  await pathChecked(physical,'',{dir:true});
  const existing=(await lifetime.list()).filter(p=>p.directory&&p.id!==data.id);
  if(existing.some(p=>path.resolve(p.directory).toLowerCase()===physical.toLowerCase()))
   throw bad(409,'Ce dossier appartient déjà à un autre serveur : chaque monde doit avoir ses sauvegardes séparées.');
  const linked=await lifetime.link(data.id,physical);
  return reply(res,200,{linked:true,profile:linked,note:'Dossier réel associé, démarrage non déclenché.'});
 }
 if(route==='/api/library/profiles'&&method==='DELETE'){
  const data=await jsonBody(req,2048);
  if(!validId(data.id)||typeof data.confirmName!=='string')throw bad(400,'Confirmation de suppression invalide.');
  const result=await lifetime.remove(data.id,data.confirmName);
  return reply(res,200,{...result,note:'Suppression demandée par le propriétaire : les fichiers et les sauvegardes restent sur le disque.'});
 }
 if(route==='/api/profiles'&&method==='GET'){
  return reply(res,200,{profiles:await gameProfileStatus(),localBrowser:locallyRequested(req),
   oneGameAtATime:true,railway:false,activeProfile:activeSession()?.id||null,
   notice:'Un profil enregistré n’est pas un serveur installé ni joignable. Le démarrage exige les exécutables et mods officiels sur cette machine.'});
 }
 if(route==='/api/profiles/prepare'&&method==='POST'){
  if(!locallyRequested(req)||process.platform!=='win32')
   throw bad(403,'Préparation de serveurs autorisée depuis le PC Windows hôte uniquement.');
  const data=await jsonBody(req,2048);
  if(data?.confirmLocal!==true||!knownProfile(data?.id))throw bad(400,'Profil inconnu ou préparation locale non confirmée.');
  const output=await prepareProfile(data.id);
  return reply(res,200,{prepared:true,profile:data.id,output,
   gameInstalled:false,note:'Configurations créées ou conservées ; téléchargement du jeu et connexion restent séparés.'});
 }
 if(route==='/api/profiles/start'&&method==='POST'){
  if(!locallyRequested(req)||process.platform!=='win32')
   throw bad(403,'Démarrage réservé au PC hôte. Depuis un téléphone, seul l’état est consultable.');
  const data=await jsonBody(req,2048);
  const profile=knownProfile(data?.id);
  if(data?.confirmLocal!==true||!profile)throw bad(400,'Sélectionne et confirme un profil autorisé.');
  if(activeSession())throw bad(409,'Un serveur CMD est déjà lancé dans ce panneau ; un seul à la fois.');
  if(gameProcessesRunning())throw bad(409,'DayZ ou ARK fonctionne déjà sur Windows. Arrête-le normalement avant de changer de serveur.');
  const found=(await profileChecks()).find(x=>x.id===profile.id);
  if(!found?.ready)throw bad(409,'Fichiers ou mods non prêts : '+(found?.blockers?.slice(0,4).join(' ; ')||'installation manquante'));
  const executable=profileManagerPaths.get(profile.game);
  if(!(await stat(executable)).isFile())throw bad(503,'Gestionnaire officiel absent du paquet Windows.');
  profileSessions.set(profile.id,{state:'démarrage',pid:null,at:new Date().toISOString()});
  try{
   const args=[executable,'start',...(profile.game==='dayz'?[profile.id]:[])];
   const child=spawn(process.execPath,args,{cwd:path.dirname(executable),stdio:'inherit',windowsHide:false,env:process.env});
   child.once('error',err=>{profileSessions.set(profile.id,{state:'erreur',error:err.code||'spawn failed',pid:null})});
   child.once('exit',(code,signal)=>{profileSessions.set(profile.id,{state:code===0?'arrêté':'erreur',
     exitCode:code,signal,pid:null,endedAt:new Date().toISOString()})});
   profileSessions.set(profile.id,{state:'processus-actif',pid:child.pid||null,at:new Date().toISOString()});
   return reply(res,202,{requested:true,profile:profile.id,
    state:'lancement demandé',localWindows:true,gameRunningVerified:false,publiclyReachableVerified:false,
    note:'Le programme natif effectue encore ses propres contrôles. Vérifier son journal Windows et la connexion en jeu.'});
  }catch(error){
   profileSessions.set(profile.id,{state:'erreur',error:String(error.code||'launch failed')});
   throw bad(500,'Impossible de lancer le gestionnaire Windows. Consulter le terminal local.');
  }
 }

 if(route==='/api/install/dayz'&&method==='GET'){
  return reply(res,200,{...await dayzSetupStatus(),localBrowserRequired:true,localBrowser:locallyRequested(req),note:'Création DayZ PC : fichiers officiels installés sur CE Windows seulement.'});
 }
 if(route==='/api/install/dayz'&&method==='POST'){
  // Owner-initiated installation requires physical approval on this Windows workstation.
  // Never accept an install request across the local network or from a remote visitor.
  if(!locallyRequested(req))throw bad(403,'Installation autorisée uniquement depuis le navigateur du PC hôte (127.0.0.1).');
  if(process.platform!=='win32')throw bad(422,'Le programme de création DayZ est réservé à Windows.');
  const request=await jsonBody(req,2048);
  if(request?.confirmed!==true||request?.publisherTermsAccepted!==true)
   throw bad(400,'Confirme l’installation des fichiers officiels et les conditions des éditeurs.');
  const status=await dayzSetupStatus();
  if(!status.installerAvailable)throw bad(503,'Installateur DayZ absent du paquet Windows. Extrais le ZIP complet.');
  if(dayzSetup.state==='starting'||dayzSetup.state==='running')throw bad(409,'Une installation DayZ est déjà en cours sur ce PC.');
  if(status.filesPresent)throw bad(409,'DayZ existe déjà dans CMD-Servers. Clique Actualiser pour voir ton serveur.');
  dayzSetup={state:'starting',startedAt:new Date().toISOString(),finishedAt:null,exitCode:null};
  try{
   const child=spawn('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',DAYZ_SCRIPT,'-NoStartPrompt'],{
    cwd:path.dirname(DAYZ_SCRIPT),windowsHide:false,stdio:'inherit',detached:false
   });
   child.once('error',error=>{
    dayzSetup={...dayzSetup,state:'error',finishedAt:new Date().toISOString(),error:'Impossible d’ouvrir PowerShell : '+error.code};
   });
   child.once('exit',(code)=>{
    dayzSetup={...dayzSetup,state:code===0?'finished':'error',exitCode:code,finishedAt:new Date().toISOString()};
   });
   // No remote shell, arbitrary command, path, executable or game ID supplied by callers.
   dayzSetup.state='running';
   return reply(res,202,{ok:true,state:'running',message:'La fenêtre de confirmation DayZ doit apparaître sur ce PC. Les fichiers officiels ne seront installés qu’après validation.'});
  }catch(e){
   dayzSetup={...dayzSetup,state:'error',finishedAt:new Date().toISOString()};
   throw bad(500,'Impossible de lancer le programme DayZ local.');
  }
 }

 if(route==='/api/register'&&method==='POST'){
  const {game,name,root}=await jsonBody(req);
  if(typeof game!=='string'||game.length>120||typeof name!=='string'||name.length>150||typeof root!=='string'||root.length>800)
   throw bad(400,'Serveur invalide');
  const physical=path.resolve(root);
  if(!within(installRoot,physical)||physical===installRoot)throw bad(403,'Sélectionne un dossier de jeu sous CMD-Servers');
  await pathChecked(physical,'',{dir:true});
  const manifest=await config();
  if(manifest.servers.some(x=>path.resolve(x.root).toLowerCase()===physical.toLowerCase()))throw bad(409,'Serveur déjà associé');
  const id='server-'+randomBytes(6).toString('hex');
  manifest.servers.push({id,game:game.trim().toLowerCase(),name:name.trim(),root:physical});
  await saveManifest(manifest);
  return reply(res,201,{ok:true,id});
 }
 const id=url.searchParams.get('id');if(!validId(id))throw bad(400,'Identifiant de serveur invalide');
 const instance=await selected(id);
 const rel=normRel(url.searchParams.get('path'),{root:true});
 if(route==='/api/palworld/workshop'&&method==='GET'){
  if(instance.game!=='palworld')throw bad(422,'Choisis un vrai serveur Palworld.');
  const workshop='Mods/Workshop',settings='Mods/PalModSettings.ini';
  let entries=[],active=[],enabledGlobal=false;
  try{
   const cfg=await readFile(await pathChecked(instance.root,settings),'utf8');
   enabledGlobal=/^\s*bGlobalEnableMod\s*=\s*true\s*$/mi.test(cfg);
   active=[...cfg.matchAll(/^\s*ActiveModList\s*=\s*([^\r\n#;]+)/gmi)].map(m=>m[1].trim());
  }catch(e){if(e.code!=='ENOENT')throw e}
  try{
   const folder=await pathChecked(instance.root,workshop,{dir:true});
   const packages=await readdir(folder,{withFileTypes:true});
   for(const item of packages.slice(0,250)){
    if(!item.isDirectory()||item.isSymbolicLink()||SECURE.test(item.name))continue;
    try{
     const info=await pathChecked(instance.root,workshop+'/'+item.name+'/Info.json');
     const details=await lstat(info);
     if(!details.isFile()||details.size>32768)continue;
     const data=JSON.parse(await readFile(info,'utf8'));
     const name=typeof data.PackageName==='string'?data.PackageName:'';
     if(!/^[A-Za-z0-9_.-]{1,100}$/.test(name))continue;
     const compatible=Array.isArray(data.InstallRules)&&data.InstallRules.some(rule=>rule?.IsServer===true);
     entries.push({folder:item.name,packageName:name,serverCompatible:compatible,
      enabled:enabledGlobal&&active.includes(name),exists:true});
    }catch{/* No fake mods from absent/broken manifests */}
   }
  }catch(e){if(e.code!=='ENOENT')throw e}
  return reply(res,200,{game:'palworld',installedMods:entries,activePackageNames:active,
   enabledGlobal,workshop:'https://steamcommunity.com/app/1623730/workshop/',
   publisherGuide:'https://docs.palworldgame.com/settings-and-operation/mod/',
   note:'Seuls les vrais dossiers Mods/Workshop/Info.json sont affichés. Windows dédié requis pour les mods serveur.'});
 }
 if(route==='/api/files'&&method==='GET'){
  const folder=await pathChecked(instance.root,rel,{dir:true});
  const entries=await readdir(folder,{withFileTypes:true}),files=[];
  for(const ent of entries.slice(0,1500)){
   if(ent.isSymbolicLink()||SECURE.test(ent.name))continue;
   const full=path.join(folder,ent.name);let st;try{st=await lstat(full)}catch{continue}
   files.push({name:ent.name,path:[rel,ent.name].filter(Boolean).join('/'),type:st.isDirectory()?'folder':st.isFile()?'file':'other',bytes:st.isFile()?st.size:null,editable:st.isFile()&&TEXT.test(ent.name)&&st.size<=MAX_TEXT,modified:st.mtime.toISOString()});
  }
  files.sort((a,b)=>(a.type===b.type?a.name.localeCompare(b.name,'fr'):a.type==='folder'?-1:1));
  return reply(res,200,{id,path:rel,files,truncated:entries.length>1500,realFiles:true});
 }
 if(route==='/api/file'&&method==='GET'){
  if(!rel)throw bad(400,'Fichier manquant');
  const target=await pathChecked(instance.root,rel);
  const st=await lstat(target);
  if(!st.isFile())throw bad(400,'Pas un fichier');
  const download=url.searchParams.get('download')==='1';
  if(download){
   res.writeHead(200,{'content-type':'application/octet-stream','content-disposition':'attachment; filename="'+path.basename(target).replace(/[^\w.-]/g,'_')+'"','content-length':st.size,'cache-control':'no-store','x-content-type-options':'nosniff'});
   createReadStream(target).pipe(res);return;
  }
  if(!TEXT.test(rel)||st.size>MAX_TEXT)throw bad(415,'Ce fichier est binaire ou trop volumineux : téléchargement seulement');
  return reply(res,200,{path:rel,content:await readFile(target,'utf8'),bytes:st.size});
 }
 if(route==='/api/file'&&method==='PUT'){
  if(!rel)throw bad(400,'Nom de fichier manquant');
  const data=await jsonBody(req);
  if(typeof data.content!=='string'||Buffer.byteLength(data.content)>MAX_TEXT||data.confirmStopped!==true)
   throw bad(400,'Arrête d’abord le serveur et confirme avant de modifier la configuration');
  await atomicSave(instance,rel,data.content,{create:data.create===true});
  return reply(res,200,{ok:true,path:rel,backup:true});
 }
 if(route==='/api/upload'&&method==='POST'){
  if(!rel)throw bad(400,'Nom de fichier manquant');
  const target=await pathChecked(instance.root,rel,{exists:false});
  // Don't overwrite or execute server binaries over the browser.
  if(!TEXT.test(rel)||!(req.headers['content-type']||'').startsWith('application/octet-stream'))throw bad(415,'Import limité aux nouveaux fichiers texte de configuration');
  const payload=await body(req,MAX_UPLOAD);
  if(payload.length>MAX_TEXT)throw bad(413,'Configuration trop volumineuse');
  await atomicSave(instance,rel,payload,{create:true});
  return reply(res,201,{ok:true,path:rel});
 }
 if(route==='/api/maps'&&method==='GET'){
  if(instance.game!=='dayz')return reply(res,200,{mode:'config-only',maps:[],note:'Ouvre les fichiers de configuration pour ce jeu; aucune carte fictive.'});
  let folders=[];try{folders=await readdir(await pathChecked(instance.root,'mpmissions',{dir:true}),{withFileTypes:true})}catch{}
  const choices=[];
  for(const entry of folders.filter(x=>x.isDirectory()&&!x.isSymbolicLink())){
   const n=entry.name;if(!/^dayzOffline\.[A-Za-z0-9_-]+$/i.test(n))continue;
   const relMission='mpmissions/'+n;
   try{await pathChecked(instance.root,relMission+'/init.c');await pathChecked(instance.root,relMission+'/db/types.xml');
    choices.push({id:n,label:n,installed:true});
   }catch{}
  }
  let active=null;
  try{const cfg=await readFile(await pathChecked(instance.root,'serverDZ.cfg'),'utf8');active=/template\s*=\s*"([^"]+)"/i.exec(cfg)?.[1]||null}catch{}
  return reply(res,200,{mode:'dayz-mission',maps:choices,active,note:'Seules les missions réellement installées apparaissent.'});
 }
 if(route==='/api/maps'&&method==='POST'){
  if(instance.game!=='dayz')throw bad(422,'Changement de mission disponible uniquement pour DayZ');
  const data=await jsonBody(req);
  if(data.confirmStopped!==true)throw bad(400,'Confirme que le serveur DayZ est arrêté');
  if(typeof data.map!=='string'||!/^dayzOffline\.[A-Za-z0-9_-]+$/i.test(data.map))throw bad(400,'Carte invalide');
  const mapDir='mpmissions/'+data.map;
  await pathChecked(instance.root,mapDir+'/init.c');
  await pathChecked(instance.root,mapDir+'/db/types.xml');
  const configPath=await pathChecked(instance.root,'serverDZ.cfg');
  const original=await readFile(configPath,'utf8');
  const rx=/template\s*=\s*"([^"]+)"\s*;/gi;
  const found=[...original.matchAll(rx)];
  if(found.length!==1)throw bad(409,'Configuration DayZ ambiguë : modifie serverDZ.cfg manuellement');
  const updated=original.replace(rx,'template = "'+data.map+'";');
  await atomicSave(instance,'serverDZ.cfg',updated);
  return reply(res,200,{ok:true,selected:data.map,backup:true,restartRequired:true,gameStarted:false});
 }
 throw bad(404,'Fonction introuvable');
}
async function start(){
 if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Port invalide');
 await mkdir(stateDir,{recursive:true,mode:0o700});
 let token;
 try{token=(await readFile(keyFile,'utf8')).trim()}catch(e){if(e.code!=='ENOENT')throw e;token=randomBytes(32).toString('hex');await writeFile(keyFile,token+'\n',{flag:'wx',mode:0o600})}
 if(token.length<32)throw Error('Jeton administrateur invalide');
 const server=http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url||'/', 'http://localhost');
   res.setHeader('x-content-type-options','nosniff');
   res.setHeader('referrer-policy','no-referrer');
   res.setHeader('content-security-policy',"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
   if(url.pathname==='/'&&req.method==='GET'){
    const html=await readFile(path.join(HERE,'index.html'));
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});return res.end(html);
   }
   if(url.pathname==='/style.css'&&req.method==='GET'){
    const css=await readFile(path.join(HERE,'style.css'));
    res.writeHead(200,{'content-type':'text/css; charset=utf-8','cache-control':'no-store'});return res.end(css);
   }
   if(url.pathname==='/app.js'&&req.method==='GET'){
    const js=await readFile(path.join(HERE,'app.js'));
    res.writeHead(200,{'content-type':'text/javascript; charset=utf-8','cache-control':'no-store'});return res.end(js);
   }
   if(!url.pathname.startsWith('/api/'))throw bad(404,'Ressource introuvable');
   const provided=(req.headers.authorization||'').replace(/^Bearer /i,'');
   const a=Buffer.from(provided),b=Buffer.from(token);
   if(a.length!==b.length||!timingSafeEqual(a,b))throw bad(401,'Connecte-toi avec la clé affichée sur la machine hôte');
   if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)throw bad(403,'Origine non autorisée');
   await action(req,res,url);
  }catch(e){if(res.headersSent)return;reply(res,e.status||500,{error:e.status?e.message:'Erreur locale : '+(e.code||'inspecter le terminal du panneau')})}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,listenHost,resolve)});
 console.log('\nCMD HOSTING — FICHIERS RÉELS / sans Railway');
 console.log('Interface : http://'+listenHost+':'+port);
 console.log('Dossier des installations : '+installRoot);
 console.log('Clé administrateur locale : '+token);
 console.log('Ne partage jamais la clé ni le port sur Internet. Démarrage de jeux non automatique.\n');
 return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))start().catch(e=>{console.error(e);process.exitCode=1});
export {start,normRel,within,pathChecked,profiles};