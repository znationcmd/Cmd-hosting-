#!/usr/bin/env node
// Safe, repeatable preflight for a future CMD Hosting rental node.
// Never installs unlicensed binaries, guesses unknown game configs, or changes a game server.
import {readFile,readdir,lstat,realpath,stat,mkdir,writeFile,rename} from "node:fs/promises";
import {createHash} from "node:crypto";
import {resolve,relative,join,sep,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {safeGameId,contained,relativeSafePath,matchGlob,excluded,formatAllowed,safeStem} from "./lib.mjs";

const argv=process.argv.slice(2);
function get(flag){const i=argv.indexOf(flag);if(i<0||!argv[i+1]||argv[i+1].startsWith("--"))throw Error("Missing "+flag+" option");return argv[i+1]}
const id=safeGameId(get("--game-id"));
const requestedRoot=resolve(get("--root"));
const stateFolder=resolve(get("--state-dir"));
const profiles=resolve(argv.includes("--plans")?get("--plans"):fileURLToPath(new URL("./generated",import.meta.url)));
const platform=argv.includes("--platform")?get("--platform"):"pc";
if(!/^[a-z0-9 _-]{1,48}$/i.test(platform))throw Error("Invalid platform");
const root=await realpath(requestedRoot);
const rootInfo=await stat(root);
if(!rootInfo.isDirectory())throw Error("Game installation root must exist as a directory");
if(root===stateFolder||contained(root,stateFolder)||contained(stateFolder,root))throw Error("Keep CMD agent state outside game installation and parent tree");
const manifest=JSON.parse(await readFile(join(profiles,"games",id+".json"),"utf8"));
if(manifest.gameId!==id||!manifest.configDiscovery||!Array.isArray(manifest.knownConfigFiles))throw Error("Invalid synchronized plan");
const patterns=manifest.knownConfigFiles.map(x=>x.relativePath);
for(const p of patterns)if(!relativeSafePath(p))throw Error("Unsafe upstream config pattern: "+p);
const formats=manifest.configDiscovery.extensions;
if(!Array.isArray(formats)||!formats.every(x=>/^\.[a-z0-9]{1,20}$/i.test(x)))throw Error("Invalid allowed extensions");
const maxEntries=Math.max(1,Math.min(Number(manifest.configDiscovery.maxEntries)||2000,2000));
const maxBytes=Math.max(1024,Math.min(Number(manifest.configDiscovery.maxBytesPerTextConfig)||2097152,2097152));
const queue=[""],seen=[],warnings=[];
let scanned=0;
while(queue.length&&scanned<maxEntries){
 const rel=queue.shift(),dir=join(root,rel);
 let list;
 try{list=await readdir(dir,{withFileTypes:true})}catch(e){warnings.push("Cannot read directory "+rel+": "+e.code);continue}
 for(const f of list){
  if(++scanned>maxEntries)break;
  const sub=rel?rel+"/"+f.name:f.name;
  if(excluded(sub)||!relativeSafePath(sub))continue;
  const target=join(root,sub);
  if(!contained(root,target))continue;
  try{
   // Never follow symlinks, even if they point inside the game directory.
   const st=await lstat(target);
   if(st.isSymbolicLink())continue;
   if(st.isDirectory()){queue.push(sub);continue}
   if(!st.isFile()||!formatAllowed(sub,formats)||st.size>maxBytes)continue;
   const known=patterns.some(p=>matchGlob(p,sub));
   // Do not read unknown files. SHA-256 known config files for future drift detection.
   const hash=known?createHash("sha256").update(await readFile(target)).digest("hex"):null;
   seen.push({path:sub.replaceAll("\\","/"),bytes:st.size,known,sha256:hash});
  }catch(e){warnings.push("Cannot inspect "+sub+": "+e.code)}
 }
}
const knownFound=seen.filter(x=>x.known);
const missing=patterns.filter(p=>!seen.some(x=>matchGlob(p,x.path)));
const report={
 schema:"cmd-hosting/node-preflight-v1",
 scannedAt:new Date().toISOString(),gameId:id,game:manifest.game,platform,
 root,filesFound:seen.length,knownConfigsDetected:knownFound.length,
 missingDeclaredPaths:missing,files:seen,warnings,
 status:"inventory-complete-not-game-installation",
 serverFilesInstalledByThisTool:false,
 modsInstalledByThisTool:false,liveGameTested:false,
 nextStep:"Connect a supported game adapter; allow writes only after backup, license and file-schema checks."
};
await mkdir(stateFolder,{recursive:true});
const dest=join(stateFolder,"game-"+safeStem(id)+".inventory.json"),temp=dest+".tmp-"+process.pid;
await writeFile(temp,JSON.stringify(report,null,2)+"\n",{mode:0o600});
await rename(temp,dest);
console.log("CMD Hosting: "+manifest.game+" — "+knownFound.length+" configuration(s) spécifiques détectée(s); "+seen.length+" fichier(s) inspecté(s).");
console.log("Rapport: "+dest);
if(missing.length)console.log("Fichiers attendus non présents : "+missing.join("; "));
console.log("Aucune modification des serveurs, cartes, mods ou sauvegardes.");