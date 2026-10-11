#!/usr/bin/env node
/**
 * CMD Hosting portable host monitor 1.0 — Windows, Linux, macOS.
 * Safe adjunct to existing V5 and mods agents: no shell, rentals, installs or file edits.
 * A new host needs CMD_CLOUD_AGENT_TOKEN supplied securely by the owner before heartbeat.
 * --diagnose = read-only; --once = single registered heartbeat; --loop = every 10 minutes.
 */
import {mkdir,readFile,writeFile,rename} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {randomUUID} from "node:crypto";
import {detect} from "./host-capability.mjs";

const API="https://cmd-hosting-cloud-agents-production.up.railway.app";
const args=new Set(process.argv.slice(2));
const dir=process.env.CMD_HOST_STATE_DIR?path.resolve(process.env.CMD_HOST_STATE_DIR):path.join(os.homedir(),".cmdhosting");
const file=path.join(dir,"host-id.json");

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
function nonSecretReport(){
 const profile=detect({root:process.env.CMD_GAME_INSTALL_ROOT||process.cwd()});
 // Chassis model cannot be reliably discovered from Node.js. The operator
 // declares the machine family during future host enrollment; never guess.
 const available=new Set(["existing-pc","generic-vps","oracle-vm","dedicated-ryzen",
   "dedicated-epyc","supermicro-microcloud","supermicro-clouddc","other-x64"]);
 const requested=(process.env.CMD_MACHINE_CLASS||"other-x64").trim().toLowerCase();
 if(!available.has(requested))throw Error("Unsupported CMD_MACHINE_CLASS");
 const chassis=(process.env.CMD_CHASSIS_ID||"").trim();
 if(chassis && !/^[A-Za-z0-9][A-Za-z0-9._-]{2,79}$/.test(chassis))
   throw Error("Invalid CMD_CHASSIS_ID; use a non-secret group label.");
 if(requested==="supermicro-microcloud" && !chassis)
   throw Error("Every MicroCloud node needs CMD_CHASSIS_ID to group independent nodes.");
 const cpuModel=String(os.cpus()?.[0]?.model||"");
 const cpuFamily=/AMD.*EPYC/i.test(cpuModel)?"amd-epyc":
   /AMD.*Ryzen/i.test(cpuModel)?"amd-ryzen":
   /Intel/i.test(cpuModel)?"intel":"other";
 return {os:profile.platform,architecture:profile.arch,
         logicalCpus:profile.cpuCount,ramGB:profile.ramGB,freeGB:profile.freeGB,
         machineClass:requested,chassisId:chassis||null,cpuFamily,
         candidateGames:profile.games.filter(g=>g.status==="hardware_candidate_only").map(g=>g.game)};
}
async function beat(){
 const token=process.env.CMD_CLOUD_AGENT_TOKEN;
 if(!token||token.length<12)throw Error("New host is not enrolled: set CMD_CLOUD_AGENT_TOKEN securely.");
 const id=await stableId();
 const res=await fetch(API+"/v1/agents/heartbeat",{
  method:"POST",headers:{authorization:"Bearer "+token,"content-type":"application/json"},
  body:JSON.stringify({agentId:id,role:"host",version:"portable-1.0",serverCount:0,capabilities:nonSecretReport()}),
  signal:AbortSignal.timeout(15000)
 });
 if(!res.ok)throw Error("CMD Hosting connection refused: HTTP "+res.status);
 const result=await res.json();
 if(!result.ok||!result.heartbeatAccepted)throw Error("Cloud did not confirm host heartbeat.");
 console.log("CMD Hosting portable host heartbeat accepted; agent:",id);
}
async function run(){
 if(args.has("--diagnose")){
  console.log(JSON.stringify({schema:"cmd-hosting/portable-diagnostic-v1",...nonSecretReport(),
    status:"read-only; no software installed or agents changed"},null,2));
  return;
 }
 if(!(args.has("--once")||args.has("--loop")))throw Error("Choose --diagnose, --once or --loop.");
 if(args.has("--once")){await beat();return}
 let stopped=false;
 process.once("SIGINT",()=>{stopped=true});
 process.once("SIGTERM",()=>{stopped=true});
 while(!stopped){
  try{await beat()}catch(err){console.error("CMD Hosting portable monitoring warning:",err.message)}
  await new Promise(resolve=>setTimeout(resolve,600000));
 }
}
run().catch(err=>{console.error("CMD Hosting portable agent:",err.message);process.exitCode=1});
