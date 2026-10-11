import test from "node:test";
import assert from "node:assert/strict";
import { buildProvisioningRegistry, createGameProvisionProfile, approvedSteamCmdArgs } from "../services/provisioning/game-installers.ts";

const catalog=[
 {id:1,name:"DayZ",key:"dayz"},
 {id:2,name:"ARK: Survival Ascended",key:"ark-asa"},
 {id:3,name:"ARK: Survival Evolved",key:"ark-ase"},
 {id:4,name:"Arma Reforger",key:"arma-reforger"},
 {id:5,name:"Arma 3",key:"arma3"},
 {id:6,name:"7 Days to Die",key:"7dtd"},
 {id:7,name:"Palworld",key:"palworld"},
 {id:8,name:"Satisfactory",key:"satisfactory"},
 {id:9,name:"Minecraft: Java Edition",key:"minecraft-java"},
 {id:10,name:"Minecraft: Bedrock Edition",key:"minecraft-bedrock"},
 {id:11,name:"An Unknown New Game",key:"unverified"}
];
test("every current or future catalog entry receives a preparation profile",()=>{
 const list=buildProvisioningRegistry(catalog);
 assert.equal(list.catalogueCount,catalog.length);
 assert.equal(list.generatedProfiles.length,catalog.length);
 assert.ok(list.generatedProfiles.every(p=>p.installationPerformed===false&&p.startupVerified===false));
});
test("game installer IDs are selected by game title, not by catalog entry ID",()=>{
 for(const [name,id] of [["DayZ","223350"],["ARK: Survival Ascended","2430930"],
 ["ARK: Survival Evolved","376030"],["Arma Reforger","1874900"],
 ["Arma 3","233780"],["7 Days to Die","294420"],["Palworld","2394010"],["Satisfactory","1690800"]]){
  const p=createGameProvisionProfile({id:123,name}, "pc", "windows");
  assert.equal(p.installer?.steamServerAppId,id,name);
  assert.equal(p.state,"prepared-for-compatible-node",name);
 }
});
test("console rentals must not receive PC server commands",()=>{
 const profile=createGameProvisionProfile({id:1,name:"DayZ"}, "xbox", "windows");
 assert.equal(profile.state,"provider-required");
 assert.equal(profile.dedicatedServerInstallableOnFutureNode,false);
 assert.equal(approvedSteamCmdArgs(profile,"D:\\Hosting\\rental-001"),null);
});
test("unverified game cannot download arbitrary software",()=>{
 const profile=createGameProvisionProfile({id:900,name:"Unverified New Game"}, "pc", "windows");
 assert.equal(profile.state,"verify-dedicated-server");
 assert.equal(profile.installer,null);
 assert.equal(approvedSteamCmdArgs(profile,"D:\\Hosting\\rental-001"),null);
});
test("SteamCMD commands use fixed allowlisted app IDs and isolated paths",()=>{
 const p=createGameProvisionProfile({id:1,name:"Palworld"},"pc","windows");
 assert.deepEqual(approvedSteamCmdArgs(p,"D:\\CMDHosting\\rental-001"),
 ["+force_install_dir","D:\\CMDHosting\\rental-001","+login","anonymous","+app_update","2394010","+quit"]);
 assert.equal(approvedSteamCmdArgs(p,"C:\\Windows\\System32"),null);
});
test("ARK ASA Windows-only restriction is preserved",()=>{
 const profile=createGameProvisionProfile({id:2,name:"ARK: Survival Ascended"},"pc","linux");
 assert.equal(profile.state,"unsupported-host-os");
 assert.equal(profile.dedicatedServerInstallableOnFutureNode,false);
});
