// Run locally or in GitHub Actions: node --test provisioning/test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {safeGameId,relativeSafePath,contained,matchGlob,excluded,formatAllowed,safeStem} from "./lib.mjs";

test("catalogue identifiers must be positive and integer",()=>{
 assert.equal(safeGameId("5"),5);
 assert.throws(()=>safeGameId("-1"));
 assert.throws(()=>safeGameId("../5"));
 assert.throws(()=>safeGameId("1.2"));
});
test("staged file path must be relative and cannot escape installation root",()=>{
 assert.equal(relativeSafePath("serverDZ.cfg"),true);
 assert.equal(relativeSafePath("mpmissions/dayzOffline.sakhal/db/types.xml"),true);
 for(const path of ["../password.json","/etc/passwd","C:\\Users\\root\\.env","mpmissions/../../root.cfg","foo//bar.cfg",""]){
  assert.equal(relativeSafePath(path),false,path);
 }
 assert.equal(contained("/srv/games/server-1","/srv/games/server-1/config.json"),true);
 assert.equal(contained("/srv/games/server-1","/srv/games/other/config.json"),false);
});
test("game-specific config globs never match sibling games",()=>{
 assert.equal(matchGlob("mpmissions/*/db/types.xml","mpmissions/dayzOffline.sakhal/db/types.xml"),true);
 assert.equal(matchGlob("serverDZ.cfg","serverDZ.cfg"),true);
 assert.equal(matchGlob("serverDZ.cfg","serverDZxcfg"),false);
 assert.equal(matchGlob("Zomboid/Server/*_SandboxVars.lua","Zomboid/Server/CMD_SandboxVars.lua"),true);
 assert.equal(matchGlob("Zomboid/Server/*_SandboxVars.lua","../CMD_SandboxVars.lua"),false);
});
test("sensitive files must never be inventoried or exposed",()=>{
 for(const path of ["steamapps/foo/config.json","logs/server.json",".git/config","config/.env","keys/admin.key","config/auth.json","server-token.txt"]){
  assert.equal(excluded(path),true,path);
 }
 assert.equal(formatAllowed("GameUserSettings.ini",[".ini"]),true);
 assert.equal(formatAllowed("saved/config/passwords.ini",[".ini"]),false);
 assert.equal(formatAllowed("some.binary",[".ini",".json"]),false);
});
test("output filenames cannot escape state directory",()=>{
 assert.equal(safeStem("123"),"123");
 assert.throws(()=>safeStem(""));
});
