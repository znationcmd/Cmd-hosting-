// Local Steam Workshop import for Palworld Windows dedicated servers.
// No arbitrary URL downloads, no ZIP extraction, no shell commands.
import path from 'node:path';
import {lstat,realpath,readdir,readFile,cp,mkdir,rename,rm} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';

const ID=/^[1-9][0-9]{0,19}$/;
const PACKAGE=/^[A-Za-z0-9_.-]{1,100}$/;
const MAX_FILES=4096,MAX_BYTES=512*1024*1024;
const eligible=name=>/^[A-Za-z0-9_.-]{1,180}$/.test(name)&&name!=='.'&&name!=='..';
function validRoot(root){
 const value=String(root||'');
 if(!path.isAbsolute(value)||!/[\\/]steamapps[\\/]workshop[\\/]content[\\/]1623730[\\/]?$/i.test(value))return null;
 return path.resolve(value);
}
export function steamPalworldLibraryPath(){
 const configured=process.env.CMD_PALWORLD_STEAM_WORKSHOP_DIR;
 if(configured)return validRoot(configured);
 if(process.platform!=='win32')return null;
 return validRoot(path.join(process.env['ProgramFiles(x86)']||'C:\\Program Files (x86)','Steam','steamapps','workshop','content','1623730'));
}
async function existingDirectory(root){
 const st=await lstat(root);if(!st.isDirectory()||st.isSymbolicLink())throw Error('Dossier Steam invalide ou lié');
 return realpath(root);
}
async function inspect(base,id){
 if(!ID.test(id))throw Error('Identifiant Steam Workshop invalide');
 const folder=path.join(base,id);
 const st=await lstat(folder);if(!st.isDirectory()||st.isSymbolicLink())throw Error('Dossier de mod lié ou invalide');
 const real=await realpath(folder);
 if(path.dirname(real)!==base)throw Error('Mod hors du dossier Steam');
 const file=path.join(folder,'Info.json');
 const info=await lstat(file);if(!info.isFile()||info.isSymbolicLink()||info.size>32768)throw Error('Info.json absent ou invalide');
 const data=JSON.parse(await readFile(file,'utf8'));
 const packageName=String(data.PackageName||'');
 if(!PACKAGE.test(packageName))throw Error('PackageName invalide');
 return {workshopId:id,packageName,version:String(data.Version||'').slice(0,70),
  serverCompatible:Array.isArray(data.InstallRules)&&data.InstallRules.some(x=>x?.IsServer===true)};
}
export async function listSteamPalworldMods(){
 const root=steamPalworldLibraryPath();
 if(!root)return {configured:false,available:false,mods:[],note:'Définir CMD_PALWORLD_STEAM_WORKSHOP_DIR vers steamapps/workshop/content/1623730'};
 let base;try{base=await existingDirectory(root)}catch{return {configured:true,available:false,mods:[],note:'Dossier Steam Workshop Palworld introuvable. Abonne-toi aux mods dans Steam et télécharge-les sur le PC.'}}
 const entries=await readdir(base,{withFileTypes:true}),mods=[];
 for(const e of entries.slice(0,500)){
  if(!e.isDirectory()||e.isSymbolicLink()||!ID.test(e.name))continue;
  try{mods.push(await inspect(base,e.name))}catch{/* Broken Steam workshop items are not offered. */}
 }
 mods.sort((a,b)=>a.packageName.localeCompare(b.packageName,'fr'));
 return {configured:true,available:true,mods,scanned:Math.min(entries.length,500),truncated:entries.length>500,
  note:'Fichiers réellement téléchargés dans la bibliothèque Steam de ce PC. Aucune installation sur le serveur tant que tu ne cliques pas Importer.'};
}
export async function importSteamPalworldMod({workshopId,serverRoot}){
 const root=steamPalworldLibraryPath();
 if(!root)throw Error('Bibliothèque Steam Workshop Palworld non configurée');
 const base=await existingDirectory(root);
 const mod=await inspect(base,workshopId);
 if(!mod.serverCompatible)throw Error('Ce mod ne déclare pas IsServer=true : import serveur refusé');
 const destRoot=path.join(serverRoot,'Mods','Workshop');
 const rootSt=await lstat(destRoot);
 if(!rootSt.isDirectory()||rootSt.isSymbolicLink())throw Error('Dossier Mods/Workshop invalide ou absent');
 const from=path.join(base,workshopId),to=path.join(destRoot,workshopId);
 try{await lstat(to);throw Error('Ce mod existe déjà sur le serveur : aucune écriture ni remplacement')}
 catch(e){if(e.code!=='ENOENT')throw e}
 // Only stage from a pre-existing, Steam-downloaded folder; abort for symlinks or oversized packages.
 let files=0,bytes=0;
 async function validate(folder){
  for(const e of await readdir(folder,{withFileTypes:true})){
   if(!eligible(e.name)||e.isSymbolicLink())throw Error('Entrée de mod interdite');
   const file=path.join(folder,e.name),st=await lstat(file);
   if(st.isSymbolicLink())throw Error('Lien symbolique interdit dans le mod');
   if(st.isDirectory())await validate(file);
   else if(st.isFile()){
    files++;bytes+=st.size;
    if(files>MAX_FILES||bytes>MAX_BYTES)throw Error('Mod trop volumineux : limite de 512 Mo ou 4096 fichiers');
   }else throw Error('Entrée Steam non supportée');
  }
 }
 await validate(from);
 if(!files)throw Error('Le mod Steam est vide');
 const staged=path.join(destRoot,'.cmdhosting-staging-'+workshopId+'-'+randomBytes(5).toString('hex'));
 try{
  await cp(from,staged,{recursive:true,force:false,errorOnExist:true,dereference:false,filter:async p=>{
   const st=await lstat(p);
   if(st.isSymbolicLink()||(!st.isFile()&&!st.isDirectory()))throw Error('Entrée de mod liée ou invalide');
   return true;
  }});
  try{await lstat(to);throw Error('Le mod a été ajouté entre-temps : import annulé')}
  catch(e){if(e.code!=='ENOENT')throw e}
  await rename(staged,to);
 }catch(e){await rm(staged,{force:true,recursive:true}).catch(()=>{});throw e}
 return {...mod,files,bytes,imported:true,enabled:false,restartRequired:true,loadedVerified:false,
  note:'Dossier Steam copié dans Mods/Workshop. Active ensuite le PackageName dans le panneau et redémarre PalServer pour appliquer.'};
}
