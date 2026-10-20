import test from "node:test";
import assert from "node:assert/strict";
import {ORACLE_ALWAYS_FREE,oracleFreeAssessment} from "./oracle-free-anomalia.mjs";
import {providerPlan} from "./provider-adapters.mjs";

test("Oracle current Always Free quota is 2 ARM OCPU and 12 GB RAM, not old 4/24",()=>{
 assert.equal(ORACLE_ALWAYS_FREE.maxTotalOcpus,2);
 assert.equal(ORACLE_ALWAYS_FREE.maxTotalMemoryGB,12);
 assert.equal(ORACLE_ALWAYS_FREE.architecture,"arm64");
 assert.equal(ORACLE_ALWAYS_FREE.capacityGuaranteed,false);
});

test("unregistered Oracle VM cannot be represented as a running ANOMALIA server",()=>{
 const p=providerPlan({provider:"oracle",platform:"pc",gameKey:"anomalia"});
 assert.equal(p.status,"blocked_pending_validation");
 assert.equal(p.oracleCompatibility.canLaunch,false);
 assert.equal(p.oracleCompatibility.canRent,false);
 assert.ok(p.oracleCompatibility.reasonCodes.includes("vm_not_enrolled"));
 assert.ok(p.oracleCompatibility.reasonCodes.includes("native_linux_arm64_server_build_missing"));
 assert.equal(p.serverReady,false);
 assert.equal(p.commandsAllowed,false);
});

test("old 4 OCPU/24 GB recommendations are out of the free quota",()=>{
 const result=oracleFreeAssessment({gameKey:"anomalia",vmOcpus:4,vmMemoryGB:24,vmFreeDiskGB:100,
    vmEnrolled:true,officialAlwaysFreeEligible:true,os:"linux",arch:"arm64"});
 assert.ok(result.reasonCodes.includes("free_ocpu_quota_exceeded"));
 assert.ok(result.reasonCodes.includes("free_ram_quota_exceeded"));
 assert.equal(result.canLaunch,false);
});

test("already consumed free-tier resources must count toward quota",()=>{
 const result=oracleFreeAssessment({gameKey:"anomalia",vmOcpus:1,vmMemoryGB:8,vmFreeDiskGB:45,
   deployedOcpus:1,deployedMemoryGB:7,vmEnrolled:true,officialAlwaysFreeEligible:true});
 assert.ok(result.reasonCodes.includes("free_ram_quota_exceeded"));
 assert.equal(result.canRent,false);
});

test("even verified native binaries do not automatically authorize rental/provisioning",()=>{
 const result=oracleFreeAssessment({gameKey:"anomalia",vmOcpus:2,vmMemoryGB:12,vmFreeDiskGB:150,
    vmEnrolled:true,officialAlwaysFreeEligible:true,executableVerified:true,gameServerTested:true});
 assert.equal(result.status,"technical_review_required");
 assert.equal(result.canLaunch,false);
 assert.equal(result.canRent,false);
 assert.deepEqual(result.reasonCodes,[]);
});

test("cannot silently run an x64 game binary on ARM Oracle",()=>{
 const result=oracleFreeAssessment({gameKey:"anomalia",vmOcpus:2,vmMemoryGB:12,
    vmFreeDiskGB:100,vmEnrolled:true,officialAlwaysFreeEligible:true,os:"linux",arch:"x64"});
 assert.ok(result.reasonCodes.includes("not_a1_arm64_instance"));
});

test("existing providers and unrelated games are unchanged",()=>{
 const nitrado=providerPlan({provider:"nitrado",platform:"ps5",gameKey:"dayz"});
 assert.equal(nitrado.status,"requires_nitrado_service_authorization");
 const oracleMinecraft=providerPlan({provider:"oracle",platform:"pc",gameKey:"minecraft-java"});
 assert.equal(oracleMinecraft.status,"requires_machine_enrollment");
 const nonGame=oracleFreeAssessment({gameKey:"not-verified"});
 assert.equal(nonGame.status,"game_not_evaluated");
});
