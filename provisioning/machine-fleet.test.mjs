import test from "node:test";
import assert from "node:assert/strict";
import {machineRegistry,machineClass,fleetInventory,planPlacement,sanitizeNode} from "./machine-fleet.mjs";
import {resolveProvider,providerPlan} from "./provider-adapters.mjs";

const lenovo={
 nodeId:"lenovo-existing-001",machineClass:"existing-pc",os:"win32",arch:"x64",
 logicalCpus:8,ramGB:16,freeGB:254,cpuFamily:"intel",
 online:true,enrolled:true,workerVerified:false,availableForRentals:false
};
const ryzen={
 nodeId:"dedicated-ryzen-001",machineClass:"dedicated-ryzen",os:"win32",arch:"x64",
 logicalCpus:32,ramGB:128,freeGB:1000,cpuFamily:"amd-ryzen",
 online:true,enrolled:true,workerVerified:true,availableForRentals:true,
 reservedRamGB:24,reservedDiskGB:60
};
const epyc={
 nodeId:"clouddc-epyc-001",machineClass:"supermicro-clouddc",os:"linux",arch:"x64",
 logicalCpus:96,ramGB:256,freeGB:3000,cpuFamily:"amd-epyc",
 online:true,enrolled:true,workerVerified:true,availableForRentals:true,
 reservedRamGB:64,reservedDiskGB:250
};
const micro=(id,ramGB=64)=>({
 nodeId:id,chassisId:"microcloud-chassis-001",machineClass:"supermicro-microcloud",os:"win32",
 arch:"x64",logicalCpus:24,ramGB,freeGB:500,cpuFamily:"amd-ryzen",
 online:true,enrolled:true,workerVerified:true,availableForRentals:true,
 reservedRamGB:12,reservedDiskGB:70
});
test("prepares the extra server families without touching existing PC",()=>{
 const classes=machineRegistry();
 for(const family of ["existing-pc","supermicro-microcloud","supermicro-clouddc","dedicated-ryzen","dedicated-epyc","oracle-vm"]){
  assert.ok(classes.some(x=>x.machineClass===family));
 }
 assert.ok(classes.every(x=>x.operationsEnabled!==true && x.provisioningEnabled===false));
 assert.equal(machineClass("AMD Ryzen"),"dedicated-ryzen");
 assert.equal(machineClass("EPYC"),"dedicated-epyc");
 assert.equal(machineClass("Supermicro MicroCloud"),"supermicro-microcloud");
 assert.equal(machineClass("CloudDC"),"supermicro-clouddc");
});
test("never modifies registered Lenovo or guesses a worker exists",()=>{
 const before=structuredClone(lenovo);
 const x=sanitizeNode(lenovo);
 assert.deepEqual(lenovo,before);
 assert.equal(x.workerVerified,false);
 assert.equal(planPlacement({gameKey:"dayz-pc",nodes:[lenovo]}).status,"no_eligible_nodes");
});
test("MicroCloud is a chassis with independent nodes, not summed resources",()=>{
 const inv=fleetInventory([lenovo,micro("micro-node-01",20),micro("micro-node-02",64),epyc]);
 assert.equal(inv.nodes.length,4);
 const grouped=inv.chassis.find(c=>c.id==="microcloud-chassis-001");
 assert.deepEqual(grouped.nodeIds,["micro-node-01","micro-node-02"]);
 const selected=planPlacement({gameKey:"ark-asa",nodes:[micro("micro-node-01",20),micro("micro-node-02",64)]});
 assert.equal(selected.candidates.length,1);
 assert.equal(selected.candidates[0].nodeId,"micro-node-02");
 assert.ok(selected.excluded[0].reasons.includes("insufficient_free_ram"));
 assert.equal(selected.automaticInstallStarted,false);
});
test("CloudDC EPYC Linux is candidate for Linux-supported games, not Windows DayZ/ASA",()=>{
 const result=planPlacement({gameKey:"arma-reforger",nodes:[epyc]});
 assert.equal(result.status,"review_candidates");
 assert.equal(result.candidates.length,1);
 assert.equal(planPlacement({gameKey:"dayz-pc",nodes:[epyc]}).status,"no_eligible_nodes");
 assert.equal(planPlacement({gameKey:"ark-asa",nodes:[epyc]}).status,"no_eligible_nodes");
});
test("dedicated AMD Ryzen Windows is a candidate but never claimed installed",()=>{
 const result=planPlacement({gameKey:"ark-asa",nodes:[lenovo,ryzen,epyc]});
 assert.equal(result.status,"review_candidates");
 assert.deepEqual(result.candidates.map(x=>x.nodeId),["dedicated-ryzen-001"]);
 assert.equal(result.automaticInstallStarted,false);
});
test("console rentals do not become SteamCMD PC jobs",()=>{
 for(const platform of ["ps5","xbox","switch","nintendo"]){
  const x=planPlacement({gameKey:"ark-asa",platform,nodes:[ryzen]});
  assert.equal(x.status,"provider_required_for_console");
  assert.equal(x.candidates.length,0);
 }
});
test("crossplay is only considered for explicit game support",()=>{
 assert.equal(planPlacement({gameKey:"dayz-pc",platform:"crossplay",nodes:[ryzen]}).status,"crossplay_not_confirmed_for_game");
 assert.equal(planPlacement({gameKey:"ark-asa",platform:"crossplay",nodes:[ryzen]}).status,"review_candidates");
});
test("do not overbook a server whose RAM and disk are reserved",()=>{
 const tight={...ryzen,reservedRamGB:120,reservedDiskGB:990};
 const r=planPlacement({gameKey:"dayz-pc",nodes:[tight]});
 assert.equal(r.status,"no_eligible_nodes");
 assert.ok(r.excluded[0].reasons.includes("insufficient_free_ram"));
 assert.ok(r.excluded[0].reasons.includes("insufficient_free_disk"));
});
test("machines must be enrolled, online and explicitly enabled",()=>{
 const x=planPlacement({gameKey:"dayz-pc",nodes:[
  {...ryzen,nodeId:"unpaired-host-001",enrolled:false},
  {...ryzen,nodeId:"offline-host-001",online:false},
  {...ryzen,nodeId:"paused-host-001",availableForRentals:false},
  {...ryzen,nodeId:"unverified-host-001",workerVerified:false}
 ]});
 assert.equal(x.status,"no_eligible_nodes");
 assert.equal(x.excluded.length,4);
});
test("no MicroCloud placement until chassis label is supplied",()=>{
 const {chassisId,...unlabeled}=micro("micro-node-001");
 const x=planPlacement({gameKey:"dayz-pc",nodes:[unlabeled]});
 assert.ok(x.excluded[0].reasons.includes("unknown_microcloud_chassis"));
});
test("rejects duplicated machine IDs and arbitrary commands",()=>{
 assert.throws(()=>fleetInventory([ryzen,ryzen]),/Duplicate/);
 assert.throws(()=>sanitizeNode({nodeId:"../evil"}),/Invalid nodeId/);
 assert.equal(planPlacement({gameKey:"unknown-game",nodes:[ryzen]}).status,"unsupported_game");
});

test("Supermicro is an enrolled host, not a Nitrado-style managed account",()=>{
 const bare=resolveProvider("supermicro-microcloud");
 assert.equal(bare.type,"machine");
 assert.equal(bare.access,"host-agent");
 const planned=providerPlan({provider:"supermicro-clouddc",platform:"pc",gameKey:"dayz-pc",vmEnrolled:false});
 assert.equal(planned.status,"requires_machine_enrollment");
 assert.equal(planned.commandsAllowed,false);
 assert.equal(planned.gameInstalled,false);
 const nitrado=providerPlan({provider:"nitrado",platform:"ps5",gameKey:"dayz",accountConnected:false});
 assert.equal(nitrado.status,"requires_nitrado_service_authorization");
 assert.equal(nitrado.localWorkerAllowed,false);
});
