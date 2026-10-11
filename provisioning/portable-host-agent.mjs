#!/usr/bin/env node
/**
 * CMD Hosting portable host monitor 1.1 — Windows, Linux and macOS.
 * Detects Supermicro / AMD when the hardware exposes reliable data.
 * After explicit enrollment it synchronizes a cloud manifest every heartbeat.
 * NEVER installs games/mods, executes remote commands or replaces V5/Mods.
 */
import {mkdir,readFile,writeFile,rename} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {randomUUID} from "node:crypto";
import {detect} from "./host-capability.mjs";
import {machineHardware} from "./machine-detection.mjs";

const API="https://cmd-hosting-cloud-agents-production.up.railway.app";
const args=new Set(process.argv.slice(2));
const dir=process.env.CMD_HOST_STATE_DIR?path.resolve(process.env.CMD_HOST_STATE_DIR):path.join(os.homedir(),".cmdhosting");
const file=path.join(dir,"host-id.json");
const manifestFile=path.join(dir,"last-cloud-sync.json");

async function stableId(){
 await mkdir(dir,{recursive:true,mode:0o700});
 try{
  const data=JSON.parse(await readFile(file,"utf8"));
  if(typeof data.id==="string"&&/^host-[0-9a-f-]{36}$/.test(data.id))return data.id;
  throw Error("Invalid host identity; refusing to overwrite existing file.");
 }catch(err){if(err.code!=="ENOENT")throw err}
 const id="host-"+randomUUID(),tmp=file+"."+process.pid+".tmp";
 await writeFile(tmp,JSON.stringify({schema:"cmd-hosting/host-id-v1",id})+"\n",{mode:0o600,flag:"wx"});
 await rename(tmp,file);
 return id;
}
export function nonSecretReport(){
 const profile=detect({root:process.env.CMD_GAME_INSTALL_ROOT||process.cwd()});
 const hw=machineHardware();
 return {os:profile.platform,architecture:profile.arch,
   logicalCpus:profile.cpuCount,ramGB:profile.ramGB,freeGB:profile.freeGB,
   machineClass:hw.machineClass,cpuFamily:hw.cpuFamily,chassisId:hw.chassisId,
   candidateGames:profile.games.filter(g=>g.status==="hardware_candidate_only").map(g=>g.game)};
}
async function syncManifest(token) {
 const res=await fetch(API+"/v1/agents/manifest",{
  method:"GET",headers:{authorization:"Bearer "+token,accept:"application/json"},
  signal:AbortSignal.timeout(15000)
 });
 if(!res.ok)throw Error("Cloud manifest HTTP "+res.status);
 const data=await res.json();
 if(!data||typeof data.version!=="string"||data.version.length>40
   ||!Number.isInteger(data.heartbeatIntervalSeconds)||data.heartbeatIntervalSeconds<300||data.heartbeatIntervalSeconds>3600)
    throw Error("Invalid cloud synchronization manifest");
 const families=Array.isArray(data.fleetMachineClasses)?data.fleetMachineClasses:[];
 if(families.length>32 || !families.every(v=>typeof v==="string"&&/^[a-z0-9-]{2,48}$/.test(v)))
   throw Error("Unsafe cloud machine catalogue");
 const doc={schema:"cmd-hosting/sync-manifest-v1",cloudVersion:data.version,
   heartbeatIntervalSeconds:data.heartbeatIntervalSeconds,
   machineClasses:families,autoGameInstallEnabled:false,remoteShell:false};
 await mkdir(dir,{recursive:true,mode:0o700});
 const body=JSON.stringify(doc,null,2)+"\n";
 let previous=null;try{previous=await readFile(manifestFile,"utf8")}catch(e){if(e.code!=="ENOENT")throw e}
 if(previous!==body){
  const tmp=manifestFile+"."+process.pid+".tmp";
  await writeFile(tmp,body,{mode:0o600,flag:"wx"});
  await rename(tmp,manifestFile);
 }
 return doc.heartbeatIntervalSeconds;
}
async function beat(){
 const token=process.env.CMD_CLOUD_AGENT_TOKEN;
 if(!token||token.length<12)throw Error("New host must be enrolled with CMD_CLOUD_AGENT_TOKEN.");
 const id=await stableId();
 const capabilities=nonSecretReport();
 let interval=600;
 try{interval=await syncManifest(token)}catch(e){
  console.error("Cloud sync pending (heartbeat still attempted):",e.message);
 }
 const res=await fetch(API+"/v1/agents/heartbeat",{
  method:"POST",headers:{authorization:"Bearer "+token,"content-type":"application/json"},
  body:JSON.stringify({agentId:id,role:"host",version:"portable-1.1",serverCount:0,capabilities}),
  signal:AbortSignal.timeout(15000)
 });
 if(!res.ok)throw Error("CMD Hosting heartbeat refused HTTP "+res.status);
 const result=await res.json();
 if(!result.ok||!result.heartbeatAccepted)throw Error("Cloud did not confirm host heartbeat.");
 console.log("CMD Hosting portable host synchronized:",id,capabilities.machineClass,capabilities.cpuFamily);
 return Math.max(300,Math.min(3600,interval))*1000;
}
async function run(){
 if(args.has("--diagnose")){
  console.log(JSON.stringify({schema:"cmd-hosting/portable-diagnostic-v1",...nonSecretReport(),
    status:"read-only; no agent, mod, map, rental or game change"},null,2));
  return;
 }
 if(!(args.has("--once")||args.has("--loop")))throw Error("Choose --diagnose, --once or --loop.");
 if(args.has("--once")){await beat();return}
 let stopped=false;
 process.once("SIGINT",()=>{stopped=true});
 process.once("SIGTERM",()=>{stopped=true});
 while(!stopped){
  let interval=600000;
  try{interval=await beat()}catch(err){console.error("CMD Hosting portable heartbeat warning:",err.message)}
  if(stopped)break;
  await new Promise(resolve=>setTimeout(resolve,interval));
 }
}
run().catch(err=>{console.error("CMD Hosting portable agent:",err.message);process.exitCode=1});
