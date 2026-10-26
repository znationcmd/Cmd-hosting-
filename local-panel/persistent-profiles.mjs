// CMD Hosting — permanent server data with optional paid rental periods; expiry suspends, NEVER deletes.
// Records are only server intentions. A playable server requires an installed official dedicated executable.
import {readFile,writeFile,rename,mkdir,open,unlink} from 'node:fs/promises';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {configureRental,rentalStatus,validateRentalPeriod} from './rental-policy.mjs';
export const MAX_PROFILES=10000; // operational anti-abuse ceiling, not a rental time quota
export const GAME_SUGGESTIONS=Object.freeze([
 ['dayz','DayZ PC'],['ark-asa','ARK Survival Ascended'],['ark-ase','ARK Survival Evolved'],
 ['arma-reforger','Arma Reforger'],['arma-3','Arma 3'],['palworld','Palworld'],
 ['7dtd','7 Days to Die'],['satisfactory','Satisfactory'],['minecraft','Minecraft Java'],
 ['minecraft-bedrock','Minecraft Bedrock'],['valheim','Valheim'],['project-zomboid','Project Zomboid'],
 ['conan-exiles','Conan Exiles'],['fs25','Farming Simulator 25'],['enshrouded','Enshrouded'],
 ['terraria','Terraria'],['factorio','Factorio'],['rust','Rust'],['vrising','V Rising'],
 ['sons-of-the-forest','Sons of the Forest'],['unturned','Unturned'],['core-keeper','Core Keeper'],
 ['anomalia','ANOMALIA PRIMEVAL OUTBOUNDUN']
].map(([key,name])=>({key,name})));
function fail(message){throw new Error(message)}
function validString(s,min,max){return typeof s==='string'&&s.trim().length>=min&&s.trim().length<=max&&!/[\x00-\x1f<>]/.test(s)}
export function validateProfile(input){
 if(!input||!validString(input.name,2,100))fail('Nom de serveur invalide : 2 à 100 caractères.');
 if(!validString(input.gameName,2,120))fail('Nom de jeu invalide : 2 à 120 caractères.');
 const slots=Number(input.slots);
 if(!Number.isInteger(slots)||slots<1||slots>500)fail('Slots demandés entre 1 et 500 ; limites réelles propres à chaque jeu.');
 const gameKey=String(input.gameKey||'custom').trim().toLowerCase();
 if(!/^[a-z0-9][a-z0-9-]{0,63}$/.test(gameKey))fail('Identifiant de jeu invalide.');
 if(input.map!==undefined&&(!validString(input.map,1,120)))fail('Nom de carte invalide.');
 return {name:input.name.trim(),gameName:input.gameName.trim(),gameKey,slots,
  map:String(input.map||'').trim(),platform:String(input.platform||'pc').slice(0,32)};
}
export function lifetimeRegistry({file}){
 const filepath=path.resolve(file);
 let sequence=Promise.resolve();
 function serialize(work){
  const run=sequence.then(work);
  sequence=run.catch(()=>{});
  return run;
 }
 async function read(){
  try{
   const data=JSON.parse(await readFile(filepath,'utf8'));
   if(data.schema!=='cmd-hosting/lifetime-game-profiles-v1'||!Array.isArray(data.items))fail('Registre de serveurs invalide ; aucune modification automatique.');
   return data;
  }catch(e){
   if(e.code==='ENOENT')return {schema:'cmd-hosting/lifetime-game-profiles-v1',items:[],createdAt:new Date().toISOString()};
   throw e;
  }
 }
 async function write(data){
  await mkdir(path.dirname(filepath),{recursive:true,mode:0o700});
  const tmp=filepath+'.'+process.pid+'.'+randomBytes(4).toString('hex')+'.tmp';
  try{
   await writeFile(tmp,JSON.stringify(data,null,2)+'\n',{flag:'wx',mode:0o600});
   await rename(tmp,filepath);
  }finally{await unlink(tmp).catch(()=>{})}
 }
 async function list(){return (await read()).items}
 async function create(input){
  const valid=validateProfile(input);
  return serialize(async()=>{
   const data=await read();
   if(data.items.length>=MAX_PROFILES)fail('Nombre maximal de profils atteint : exporter et archiver avant d’en ajouter.');
   const stamp=new Date().toISOString();
   const record={id:'profile-'+randomBytes(10).toString('hex'),...valid,status:'non-installe',
    directory:null,createdAt:stamp,updatedAt:stamp,expiresAt:null,
    expired:false,automaticDeletion:false,autoRenewalNotRequired:true,
    rental:configureRental(null,Number(input.periodDays||30)),
    modIds:[],settings:{},notes:'Profil sauvegardé. Location en attente de paiement vérifié ; expiration = suspension sans suppression.'};
   data.items.push(record);await write(data);return record;
  });
 }
 async function modify(id,patch){
  return serialize(async()=>{
   const data=await read(),record=data.items.find(x=>x.id===id);
   if(!record)fail('Profil inconnu.');
   const next=validateProfile({...record,...patch});
   Object.assign(record,next,{updatedAt:new Date().toISOString()});
   await write(data);return record;
  });
 }
 async function link(id,directory){
  return serialize(async()=>{
   const data=await read(),record=data.items.find(x=>x.id===id);
   if(!record)fail('Profil inconnu.');
   record.directory=directory;record.updatedAt=new Date().toISOString();
   record.status='dossier-associe-non-verifie';
   await write(data);return record;
  });
 }
 async function remove(id,confirmedName){
  return serialize(async()=>{
   const data=await read(),index=data.items.findIndex(x=>x.id===id);
   if(index<0)fail('Profil inconnu.');
   const record=data.items[index];
   if(confirmedName!==record.name)fail('Recopie exactement le nom du serveur pour confirmer la suppression.');
   data.items.splice(index,1);await write(data);
   // Deliberately never touch the dedicated game binaries, savegames, maps or Workshop mods.
   return {deleted:true,filesDeleted:false,gameWorldsPreserved:true,name:record.name};
  });
 }
 async function configurePeriod(id,periodDays){
  validateRentalPeriod(periodDays);
  return serialize(async()=>{
   const data=await read(),record=data.items.find(x=>x.id===id);
   if(!record)fail('Profil inconnu.');
   record.rental=configureRental(record.rental,periodDays);
   record.updatedAt=new Date().toISOString();
   await write(data);return {...record,rentalStatus:rentalStatus(record.rental)};
  });
 }
 async function rentalView(){
  const profiles=await list();
  return profiles.map(record=>({...record,rentalStatus:rentalStatus(record.rental)}));
 }
 async function snapshot(){return read()}
 return {list,create,modify,link,remove,snapshot,configurePeriod,rentalView,file:filepath};
}
