#!/usr/bin/env node
// CMD Hosting — sync the full Railway staging catalogue to durable machine-readable plans.
// Node.js >=20. No credentials, no production server modifications, no imaginary config files.
import {mkdir,writeFile,rename,rm,readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {resolve,join} from "node:path";
import {fileURLToPath} from "node:url";

const DEFAULT_API="https://cmd-hosting-mods-api-production.up.railway.app";
const args=process.argv.slice(2);
function value(name,fallback){
 const i=args.indexOf(name);
 return i<0?fallback:args[i+1];
}
const api=value("--api",process.env.CMD_STAGING_API||DEFAULT_API).replace(/\/+$/,"");
const output=resolve(value("--output",fileURLToPath(new URL("./generated",import.meta.url))));
const concurrency=Math.max(1,Math.min(8,Number(value("--concurrency","4"))||4));
const allowLocal=/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(api);
if(!/^https:\/\//.test(api)&&!allowLocal)throw Error("Staging API must be HTTPS except loopback");
async function get(path){
 for(let attempt=0;attempt<3;attempt++){
  try{
   const r=await fetch(api+path,{headers:{accept:"application/json"},signal:AbortSignal.timeout(20000)});
   if(!r.ok)throw Error("Staging API HTTP "+r.status+" for "+path);
   return await r.json();
  }catch(e){if(attempt===2)throw e;await new Promise(r=>setTimeout(r,300*(attempt+1)));}
 }
}
const registry=await get("/api/preproduction/provisioning/registry");
if(!Number.isInteger(registry.total)||registry.total<1||!Array.isArray(registry.games)||registry.games.length!==registry.total)
 throw Error("Staging registry incomplete: refusing to publish a partial catalogue");
const seen=new Set();
for(const g of registry.games){
 if(!Number.isSafeInteger(g.id)||g.id<1||typeof g.name!=="string"||seen.has(g.id))throw Error("Invalid or duplicated catalogue game ID");
 seen.add(g.id);
}
const work=[...registry.games],plans=[],failures=[];
async function worker(){
 while(work.length){
  const game=work.shift();
  try{
   const data=await get("/api/preproduction/provisioning/plan?gameId="+game.id+"&platform=pc");
   const p=data.plan;
   if(!p||p.gameId!==game.id||!Array.isArray(p.pipeline)||!p.configDiscovery||!Array.isArray(p.knownConfigFiles))
     throw Error("Invalid provisioning plan");
   plans.push(p);
  }catch(e){failures.push({id:game.id,error:String(e.message||e)});}
 }
}
await Promise.all(Array.from({length:concurrency},worker));
if(failures.length)throw Error("Incomplete provisioning plans (nothing published): "+JSON.stringify(failures.slice(0,10)));
plans.sort((a,b)=>a.gameId-b.gameId);
const catalogHash=createHash("sha256").update(JSON.stringify(plans)).digest("hex");
let previous=null;
try{previous=JSON.parse(await readFile(join(output,"index.json"),"utf8"))}catch(e){if(e.code!=="ENOENT")console.warn("Previous registry ignored:",e.message)}
const stamp=previous?.catalogHash===catalogHash&&previous.updatedAt?previous.updatedAt:new Date().toISOString();
const temp=output+".tmp-"+process.pid;
await rm(temp,{recursive:true,force:true});
await mkdir(join(temp,"games"),{recursive:true});
for(const plan of plans){
 await writeFile(join(temp,"games",String(plan.gameId)+".json"),JSON.stringify(plan,null,2)+"\n");
}
const idx={
 schema:"cmd-hosting/synchronized-provisioning-index-v1",
 updatedAt:stamp,catalogHash,source:api+"/api/preproduction/provisioning/registry",
 total:registry.total,
 knownConfigProfiles:registry.knownConfigProfiles,
 targetRequirement:"an authorized hosting node that is online",
 actualInstallationsClaimed:false,
 profiles:plans.map(p=>({
  id:p.gameId,key:p.gameKey,name:p.game,configFiles:p.knownConfigFiles.length,
  adapter:p.gameSpecificMapSelection?.mode||"none",state:p.provisioningState,
  plan:"games/"+p.gameId+".json"
 }))
};
await writeFile(join(temp,"index.json"),JSON.stringify(idx,null,2)+"\n");
await mkdir(resolve(output,".."),{recursive:true});
const old=output+".previous";
await rm(old,{recursive:true,force:true});
try{await rename(output,old)}catch(e){if(e.code!=="ENOENT")throw e}
await rename(temp,output);
await rm(old,{recursive:true,force:true});
console.log("CMD Hosting: "+plans.length+" plans synchronisés sans toucher aux serveurs.");
console.log("Dossier: "+output);
if(plans.length!==175)console.log("À contrôler: "+plans.length+" entrées réelles (objectif demandé: 175). Ajouter seulement les vrais jeux manquants au catalogue d'origine.");