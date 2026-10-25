#!/usr/bin/env node
/**
 * CMD Hosting • Fichiers des vrais serveurs (autonome, sans Railway).
 * Node 22+; zero NPM dependency. Standalone host-side file service.
 * A registered game server exposes its own on-disk installation, never a demo tree.
 * Localhost only by default. Do NOT port-forward HTTP to the public Internet.
 */
import http from 'node:http';
import {spawn} from 'node:child_process';
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
const listenHost=process.env.CMD_FILES_LISTEN_HOST||'127.0.0.1';
const port=Number(process.env.CMD_FILES_PORT||8788);
const DAYZ_SCRIPT=path.resolve(HERE,'..','scripts','Installer-DayZ-PC-1-clic.ps1');
let dayzSetup={state:'idle',startedAt:null,finishedAt:null,exitCode:null};
const locallyRequested=req=>{
 const ip=req.socket.remoteAddress||'';
 return ip==='127.0.0.1'||ip==='::1'||ip==='::ffff:127.0.0.1';
};
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
 palworld:{name:'Palworld',landmark:'PalServer.exe',configs:['Pal/Saved/Config/WindowsServer/PalWorldSettings.ini']},
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
 const known=new Set(manual.map(x=>path.resolve(x.root).toLowerCase()));
 return [...manual.map(x=>({...x,detected:false})),...detected.filter(x=>!known.has(path.resolve(x.root).toLowerCase()))];
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
async function action(req,res,url){
 const route=url.pathname,method=req.method;
 if(route==='/api/status'&&method==='GET')return reply(res,200,{name:'CMD Hosting Fichiers',mode:'local-host',railway:false,defaultRoot:installRoot,bind:listenHost});
 if(route==='/api/servers'&&method==='GET')return reply(res,200,{servers:await listed(),catalogueNote:'Tous les jeux avec des fichiers sur un hôte peuvent être enregistrés; aucune arborescence fictive.'});
 if(route==='/api/install/dayz'&&method==='GET'){
  return reply(res,200,{...await dayzSetupStatus(),note:'Création DayZ PC : fichiers officiels installés sur CE Windows seulement.'});
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
    cwd:path.dirname(DAYZ_SCRIPT),windowsHide:false,stdio:'ignore',detached:false
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