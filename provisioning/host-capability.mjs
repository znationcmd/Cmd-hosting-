#!/usr/bin/env node
/**
 * CMD Hosting — portable hardware and game-hosting capability probe.
 * Works with Node >=20 on Windows, Linux and macOS, x64/arm64.
 * Read-only. It never installs software, changes the existing agents, or sends secrets.
 */
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const SUPPORTED_GAMES=Object.freeze([
  {key:"dayz-pc",name:"DayZ PC",systems:["win32"],arch:["x64"],ramGB:16,diskGB:35,cpus:4,adapter:"steamcmd-windows"},
  {key:"ark-asa",name:"ARK Survival Ascended",systems:["win32"],arch:["x64"],ramGB:32,diskGB:140,cpus:4,adapter:"steamcmd-windows"},
  {key:"arma-reforger",name:"Arma Reforger",systems:["win32","linux"],arch:["x64"],ramGB:16,diskGB:45,cpus:4,adapter:"steamcmd-os"},
  {key:"7dtd",name:"7 Days to Die",systems:["win32","linux"],arch:["x64"],ramGB:16,diskGB:35,cpus:4,adapter:"steamcmd-os"},
  {key:"palworld",name:"Palworld",systems:["win32","linux"],arch:["x64"],ramGB:16,diskGB:35,cpus:4,adapter:"steamcmd-os"},
  {key:"minecraft-java",name:"Minecraft Java",systems:["win32","linux"],arch:["x64","arm64"],ramGB:8,diskGB:12,cpus:2,adapter:"java-server"},
  {key:"minecraft-bedrock",name:"Minecraft Bedrock",systems:["win32","linux"],arch:["x64"],ramGB:8,diskGB:12,cpus:2,adapter:"publisher-installer"}
]);
const gb=n=>Math.round(n/1073741824*10)/10;
const round=n=>Math.round(n*10)/10;

export function classifyGame(cap, spec){
  const reasons=[];
  if(!spec.systems.includes(cap.platform)) reasons.push("host_os_not_supported");
  if(!spec.arch.includes(cap.arch)) reasons.push("cpu_arch_not_supported");
  if(reasons.length) return {game:spec.key,name:spec.name,adapter:spec.adapter,status:"unsupported_host",reasons};
  if(cap.ramGB<spec.ramGB)reasons.push("insufficient_recommended_ram");
  if(cap.cpuCount<spec.cpus)reasons.push("insufficient_logical_cpus");
  if(cap.freeGB===null)reasons.push("disk_capacity_not_measured");
  else if(cap.freeGB<spec.diskGB)reasons.push("insufficient_free_disk");
  return {game:spec.key,name:spec.name,adapter:spec.adapter,status:reasons.length?"needs_review":"hardware_candidate_only",reasons,
    gameBinariesInstalled:false,serverExecutionTested:false,licensedInstallerApproved:false};
}
export function profileFromFacts(facts){
  const cap={platform:String(facts.platform||""),arch:String(facts.arch||""),
    cpuCount:Number.isFinite(facts.cpuCount)?Math.max(0,Math.floor(facts.cpuCount)):0,
    ramGB:Number.isFinite(facts.ramGB)?round(Math.max(0,facts.ramGB)):0,
    freeGB:Number.isFinite(facts.freeGB)?round(Math.max(0,facts.freeGB)):null,
    storageRoot:String(facts.storageRoot||""),hostOperatingSystem:String(facts.hostOperatingSystem||"")};
  return {schema:"cmd-hosting/portable-machine-profile-v1",detectedAt:new Date().toISOString(),...cap,
    role:cap.platform==="win32"?"windows_host_candidate":cap.platform==="linux"?"linux_host_candidate":"monitoring_only",
    compatibleWithExistingV5:false, // Existing legacy V5 has NOT been ported by this probe.
    requiresAgentEnrollment:true,hostInstallerInstalled:false,
    games:SUPPORTED_GAMES.map(x=>classifyGame(cap,x)),
    note:"Hardware eligibility only; CPU and RAM thresholds are rough safeguards, not benchmarks or guarantees. Console servers require compatible providers."};
}
export function detect({root=process.cwd()}={}){
  const sys=os.platform(),arch=os.arch(),ramGB=gb(os.totalmem()),cpuCount=os.cpus()?.length||0;
  const location=path.resolve(root);
  let freeGB=null,warn=null;
  try{
    const stats=fs.statfsSync(location);
    freeGB=gb(Number(stats.bavail)*Number(stats.bsize));
  }catch(err){warn="disk_measurement_unavailable";}
  const profile=profileFromFacts({platform:sys,arch,ramGB,cpuCount,freeGB,storageRoot:location,hostOperatingSystem:os.release()});
  if(warn)profile.warning=warn;
  return profile;
}
function arg(name,fall){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:fall;}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const root=arg("--root",process.cwd());
  const report=detect({root});
  if(process.argv.includes("--json"))console.log(JSON.stringify(report,null,2));
  else {
    console.log("CMD Hosting — diagnostic portable (lecture seule)");
    console.log(report.platform+"/"+report.arch+" | "+report.cpuCount+" CPU logiques | "+report.ramGB+" Go RAM | "+(report.freeGB??"inconnu")+" Go libres");
    for(const game of report.games)console.log(" - "+game.name+": "+game.status+(game.reasons.length?" ("+game.reasons.join(", ")+")":""));
    console.log("Aucun programme, serveur, agent, fichier ou paramètre modifié.");
  }
}
