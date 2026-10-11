#!/usr/bin/env node
// CMD Hosting future machine agent: automatic catalog refresh + safe game file preflights.
// This never calls unverified installers and never touches an existing server configuration.
import {readFile} from "node:fs/promises";
import {spawn} from "node:child_process";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {safeGameId} from "./lib.mjs";

const configPath=resolve(process.argv[2]||process.env.CMD_NODE_CONFIG||"");
if(!process.argv[2]&&!process.env.CMD_NODE_CONFIG)throw Error("Usage: node provisioning/node-service.mjs <node-config.json> [--once]");
const config=JSON.parse(await readFile(configPath,"utf8"));
if(!Array.isArray(config.servers)||config.servers.length>150)throw Error("Expected servers array (up to 150 per node)");
if(typeof config.stateDir!=="string"||!config.stateDir.trim())throw Error("Set a durable stateDir outside game folders");
const stateDir=resolve(config.stateDir);
const plansDir=resolve(config.plansDir||fileURLToPath(new URL("./generated",import.meta.url)));
const syncHours=Math.max(1,Math.min(168,Number(config.syncEveryHours)||12));
const inspectMinutes=Math.max(5,Math.min(1440,Number(config.inspectEveryMinutes)||10));
const here=fileURLToPath(new URL(".",import.meta.url));
const once=process.argv.includes("--once");
let stopping=false,working=false,lastSync=0;
function proc(script,args){
 return new Promise((done)=>{
  const p=spawn(process.execPath,[here+script,...args],{stdio:"inherit",env:process.env});
  p.on("error",err=>{console.warn(script+": "+err.message);done(false)});
  p.on("close",status=>done(status===0));
 });
}
async function tick(){
 if(working)return;
 working=true;
 try{
  const needsSync=Date.now()-lastSync>=syncHours*3600000;
  if(needsSync){
   const ok=await proc("sync-profiles.mjs",["--output",plansDir]);
   if(!ok){console.warn("Catalog sync failed; keeping existing plans, retrying later");}
   else lastSync=Date.now();
  }
  for(const server of config.servers){
   try{
    if(!server||!server.root)continue;
    const id=safeGameId(server.gameId);
    const params=["--game-id",String(id),"--root",String(server.root),"--state-dir",stateDir,"--plans",plansDir,"--platform",String(server.platform||"pc")];
    const ok=await proc("node-preflight.mjs",params);
    if(!ok)console.warn("Node preflight pending for catalog game "+id+" (software may not yet be installed).");
   }catch(e){console.warn("Skipped unconfigured node assignment: "+e.message)}
  }
 }finally{working=false}
}
for(const sig of ["SIGTERM","SIGINT"])process.on(sig,()=>{stopping=true});
do{
 await tick();
 if(once||stopping)break;
 await new Promise(r=>setTimeout(r,inspectMinutes*60000));
}while(!stopping);
