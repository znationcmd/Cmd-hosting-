/**
 * CMD Hosting — optional future machine registry and conservative placement previews.
 * No effect on existing Lenovo / V5, no SSH, no SteamCMD, no payments, no job dispatch.
 * Supermicro names describe chassis only: EVERY MicroCloud node must enroll separately.
 * AMD Ryzen/EPYC describes CPU family, NOT guaranteed game capacity.
 */
export const MACHINE_CLASSES=Object.freeze({
  "existing-pc":{label:"PC existant (Lenovo ou autre)",kind:"standalone",provider:"local"},
  "generic-vps":{label:"VPS / VM louée",kind:"virtual",provider:"vps"},
  "oracle-vm":{label:"VM Oracle Cloud",kind:"virtual",provider:"oracle"},
  "dedicated-ryzen":{label:"Serveur dédié AMD Ryzen",kind:"standalone",provider:"dedicated"},
  "dedicated-epyc":{label:"Serveur dédié AMD EPYC",kind:"standalone",provider:"dedicated"},
  "supermicro-microcloud":{label:"Supermicro MicroCloud (nœuds indépendants)",kind:"multi-node-chassis",provider:"dedicated"},
  "supermicro-clouddc":{label:"Supermicro CloudDC",kind:"rack-server",provider:"dedicated"},
  "other-x64":{label:"Autre hôte x64 compatible",kind:"standalone",provider:"dedicated"}
});
const ALIASES=new Map([
 ["lenovo","existing-pc"],["ideapad","existing-pc"],["existing-pc","existing-pc"],
 ["vps","generic-vps"],["generic-vps","generic-vps"],["oracle","oracle-vm"],["oracle-vm","oracle-vm"],
 ["ryzen","dedicated-ryzen"],["amd-ryzen","dedicated-ryzen"],["amd ryzen","dedicated-ryzen"],["dedicated-ryzen","dedicated-ryzen"],
 ["epyc","dedicated-epyc"],["amd-epyc","dedicated-epyc"],["amd epyc","dedicated-epyc"],["dedicated-epyc","dedicated-epyc"],
 ["microcloud","supermicro-microcloud"],["supermicro-microcloud","supermicro-microcloud"],["supermicro microcloud","supermicro-microcloud"],
 ["clouddc","supermicro-clouddc"],["supermicro-clouddc","supermicro-clouddc"],["supermicro clouddc","supermicro-clouddc"],
 ["other-x64","other-x64"]
]);
export function machineClass(name){
  const slug=typeof name==="string"?name.toLowerCase().trim():"";
  return ALIASES.get(slug)??"other-x64";
}
export function machineRegistry(){
  return Object.entries(MACHINE_CLASSES).map(([machineClass,v])=>({
    machineClass,...v,enrolledNodes:0,installed:false,provisioningEnabled:false
  }));
}
const GAME_REQUIREMENTS=Object.freeze({
 "dayz-pc":{os:"win32",arch:"x64",ramGB:16,freeGB:35,logicalCpus:4},
 "ark-asa":{os:"win32",arch:"x64",ramGB:32,freeGB:140,logicalCpus:4},
 "arma-reforger":{os:["win32","linux"],arch:"x64",ramGB:16,freeGB:45,logicalCpus:4},
 "7dtd":{os:["win32","linux"],arch:"x64",ramGB:16,freeGB:35,logicalCpus:4},
 "palworld":{os:["win32","linux"],arch:"x64",ramGB:16,freeGB:35,logicalCpus:4},
 "minecraft-java":{os:["win32","linux"],arch:["x64","arm64"],ramGB:8,freeGB:12,logicalCpus:2},
 "minecraft-bedrock":{os:["win32","linux"],arch:"x64",ramGB:8,freeGB:12,logicalCpus:2}
});
const matches=(v,allow)=>Array.isArray(allow)?allow.includes(v):v===allow;
const finite=v=>typeof v==="number" && Number.isFinite(v)&&v>=0?v:null;
const int=v=>Number.isSafeInteger(v)&&v>=0?v:null;
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);

export function sanitizeNode(v){
  if(!v||typeof v!=="object"||Array.isArray(v))throw Error("Invalid node");
  if(!/^[A-Za-z0-9][A-Za-z0-9._:-]{2,110}$/.test(v.nodeId||""))throw Error("Invalid nodeId");
  const machine=machineClass(v.machineClass);
  const platform=v.os==="win32"||v.os==="linux"||v.os==="darwin"?v.os:"unknown";
  const arch=v.arch==="x64"||v.arch==="arm64"?v.arch:"unknown";
  const max=(key)=>finite(v[key]);
  const cpus=int(v.logicalCpus);
  const chassisId=typeof v.chassisId==="string"&&/^[A-Za-z0-9][A-Za-z0-9._-]{2,79}$/.test(v.chassisId)?v.chassisId:null;
  const node={nodeId:v.nodeId,machineClass:machine,machineName:MACHINE_CLASSES[machine].label,
    chassisId:machine==="supermicro-microcloud"?chassisId:null,
    os:platform,arch,logicalCpus:cpus,ramGB:max("ramGB"),freeGB:max("freeGB"),
    reservedRamGB:max("reservedRamGB"),reservedDiskGB:max("reservedDiskGB"),
    online:v.online===true,enrolled:v.enrolled===true,workerVerified:v.workerVerified===true,
    availableForRentals:v.availableForRentals===true,
    cpuFamily:["amd-ryzen","amd-epyc","intel","other","unknown"].includes(v.cpuFamily)?v.cpuFamily:"unknown"
  };
  if(machine==="supermicro-microcloud" && !chassisId)node.warning="chassis_id_missing";
  return node;
}
export function fleetInventory(rawNodes=[]){
  if(!Array.isArray(rawNodes)||rawNodes.length>1000)throw Error("Invalid nodes array");
  const nodes=rawNodes.map(sanitizeNode),ids=new Set();
  for(const n of nodes){if(ids.has(n.nodeId))throw Error("Duplicate machine/node id");ids.add(n.nodeId)}
  const chassis=new Map();
  for(const n of nodes){
    const id=n.chassisId || n.nodeId;
    if(!chassis.has(id))chassis.set(id,{id,machineClass:n.machineClass,nodeIds:[]});
    chassis.get(id).nodeIds.push(n.nodeId);
  }
  return {schema:"cmd-hosting/fleet-inventory-v1",nodes,chassis:[...chassis.values()],
    note:"MicroCloud nodes never pool RAM, SSD space or CPU: capacity is per enrolled node."};
}
/**
 * Pure planning. Never queues/installs a server. Unverified workers remain not eligible.
 * Available RAM/SSD must be conservatively reserved for host OS and other rentals.
 */
export function planPlacement({gameKey,platform="pc",nodes=[],preferences={}}={}){
  const game=String(gameKey||"").toLowerCase().trim(),target=GAME_REQUIREMENTS[game];
  const plat=String(platform||"").toLowerCase().trim();
  const reasons=[];
  if(!target)return {status:"unsupported_game",candidates:[],excluded:[],automaticInstallStarted:false};
  if(!["pc","crossplay"].includes(plat))return {status:"provider_required_for_console",candidates:[],excluded:[],automaticInstallStarted:false};
  if(plat==="crossplay" && !["ark-asa","minecraft-bedrock","palworld"].includes(game))
    return {status:"crossplay_not_confirmed_for_game",candidates:[],excluded:[],automaticInstallStarted:false};
  const inventory=fleetInventory(nodes),candidates=[],excluded=[];
  for(const n of inventory.nodes){
    const problems=[];
    if(!n.enrolled)problems.push("agent_not_enrolled");
    if(!n.online)problems.push("machine_offline");
    if(!n.workerVerified)problems.push("installer_not_tested");
    if(!n.availableForRentals)problems.push("not_enabled_for_rentals");
    if(!matches(n.os,target.os))problems.push("unsupported_os");
    if(!matches(n.arch,target.arch))problems.push("unsupported_arch");
    if(n.logicalCpus===null||n.logicalCpus<target.logicalCpus)problems.push("insufficient_cpu");
    // Never assume a complete machine is available to a single rental.
    const useRam=n.ramGB===null?null:n.ramGB-(n.reservedRamGB??Math.max(2,Math.round(n.ramGB*0.2)));
    const useDisk=n.freeGB===null?null:n.freeGB-(n.reservedDiskGB??20);
    if(useRam===null||useRam<target.ramGB)problems.push("insufficient_free_ram");
    if(useDisk===null||useDisk<target.freeGB)problems.push("insufficient_free_disk");
    if(n.machineClass==="supermicro-microcloud"&&!n.chassisId)problems.push("unknown_microcloud_chassis");
    const p={nodeId:n.nodeId,machineClass:n.machineClass,chassisId:n.chassisId,
      cpuFamily:n.cpuFamily,estimatedAvailableRamGB:useRam,estimatedFreeDiskGB:useDisk,
      reasons:problems};
    if(!problems.length)candidates.push(p);else excluded.push(p);
  }
  const priority=preferences.preferDedicated===false?0:1;
  candidates.sort((a,b)=>{
    if(priority){
      const aLocal=a.machineClass==="existing-pc"?1:0,bLocal=b.machineClass==="existing-pc"?1:0;
      if(aLocal!==bLocal)return aLocal-bLocal;
    }
    return (b.estimatedFreeDiskGB??0)-(a.estimatedFreeDiskGB??0)||a.nodeId.localeCompare(b.nodeId);
  });
  return {status:candidates.length?"review_candidates":"no_eligible_nodes",gameKey:game,platform:plat,
    candidates,excluded,automaticInstallStarted:false,
    note:"Pre-selection only, not capacity enforcement, host claim or an installed game. Requires authenticated reservation, per-node capacity accounting and live game tests."};
}
