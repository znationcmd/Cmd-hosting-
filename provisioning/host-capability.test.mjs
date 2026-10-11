import {test} from "node:test";
import assert from "node:assert/strict";
import {profileFromFacts,classifyGame,detect} from "./host-capability.mjs";

const base={platform:"win32",arch:"x64",cpuCount:8,ramGB:16,freeGB:254,storageRoot:"C:\\CMD-Servers",hostOperatingSystem:"Windows 11"};
test("existing IdeaPad profile is read-only and never presented as installed",()=>{
 const p=profileFromFacts(base);
 assert.equal(p.schema,"cmd-hosting/portable-machine-profile-v1");
 assert.equal(p.requiresAgentEnrollment,true);
 assert.equal(p.hostInstallerInstalled,false);
 assert.equal(p.compatibleWithExistingV5,false);
 assert.equal(p.games.find(g=>g.game==="dayz-pc").status,"hardware_candidate_only");
 assert.equal(p.games.find(g=>g.game==="ark-asa").status,"needs_review");
 assert.equal(p.games.find(g=>g.game==="ark-asa").gameBinariesInstalled,false);
});
test("large Windows rental machine can qualify for several PC adapters without claiming a successful installation",()=>{
 const p=profileFromFacts({...base,ramGB:64,cpuCount:32,freeGB:1000});
 assert.equal(p.games.find(g=>g.game==="ark-asa").status,"hardware_candidate_only");
 assert.equal(p.games.find(g=>g.game==="dayz-pc").gameBinariesInstalled,false);
});
test("Linux x64 supports only game-specific supported adapters, never DayZ Windows binaries",()=>{
 const p=profileFromFacts({...base,platform:"linux",ramGB:64});
 assert.equal(p.games.find(g=>g.game==="dayz-pc").status,"unsupported_host");
 assert.equal(p.games.find(g=>g.game==="arma-reforger").status,"hardware_candidate_only");
 assert.equal(p.games.find(g=>g.game==="minecraft-java").status,"hardware_candidate_only");
});
test("ARM64 Linux is not silently allowed to use SteamCMD x64 apps",()=>{
 const p=profileFromFacts({...base,platform:"linux",arch:"arm64",ramGB:64});
 assert.equal(p.games.find(g=>g.game==="dayz-pc").status,"unsupported_host");
 assert.equal(p.games.find(g=>g.game==="7dtd").status,"unsupported_host");
 assert.equal(p.games.find(g=>g.game==="minecraft-java").status,"hardware_candidate_only");
});
test("macOS is monitoring-only and cannot falsely host Windows or Linux-only game servers",()=>{
 const p=profileFromFacts({...base,platform:"darwin",ramGB:64});
 assert.equal(p.role,"monitoring_only");
 assert.ok(p.games.every(g=>g.status==="unsupported_host"));
});
test("disk below requirements blocks candidate status; unknown disks require review",()=>{
 const low=profileFromFacts({...base,freeGB:2});
 assert.equal(low.games.find(g=>g.game==="dayz-pc").status,"needs_review");
 const unknown=profileFromFacts({...base,freeGB:null});
 assert.equal(unknown.games.find(g=>g.game==="dayz-pc").status,"needs_review");
});
test("actual machine probe returns structured data without writing files",()=>{
 const profile=detect({root:process.cwd()});
 assert.ok(["win32","linux","darwin"].includes(profile.platform));
 assert.ok(profile.cpuCount>=1);
 assert.ok(profile.ramGB>=1);
 assert.ok(profile.games.length>=6);
});
