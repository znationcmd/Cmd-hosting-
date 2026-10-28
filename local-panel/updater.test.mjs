import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {allowed,validate,checkAndApply} from './updater.mjs';
test('only approved app code paths may be updated, never server saves or arbitrary paths',()=>{
 for(const name of ['local-panel/server.mjs','local-panel/updater.mjs','local-panel/index.html','dayz-worlds/manager.mjs','asa-astraeos/manifest.json','DEMARRER-CMD-HOSTING-FICHIERS.cmd'])
  assert.equal(allowed(name),true,name);
 for(const name of ['../secrets.json','local-panel/../passwords.txt','C:/Windows/file.js','/etc/shadow','local-panel/server.test.mjs','local-panel/.cmdhosting-state/saves.json','SavedArks/game.ini','scripts/auth.key'])
  assert.equal(allowed(name),false,name);
});
test('release manifest requires a trusted commit, SHA256 for every file and no duplicates',()=>{
 const item=(path)=>({path,size:200,sha256:'a'.repeat(64)});
 const files=[
 'local-panel/server.mjs','local-panel/updater.mjs','local-panel/index.html','local-panel/app.js',
 'local-panel/style.css','local-panel/game-profiles.mjs','local-panel/persistent-profiles.mjs',
 'local-panel/rental-policy.mjs','local-panel/profile-unified.js','dayz-worlds/manager.mjs',
 'dayz-worlds/manifest.json','asa-astraeos/manager.mjs','asa-astraeos/manifest.json',
 'DEMARRER-CMD-HOSTING-FICHIERS.cmd','CMD-5-SERVEURS-UN-SEUL.cmd'
 ].map(item);
 const valid={schema:'cmdhosting-local-update-v1',commit:'b'.repeat(40),files};
 assert.equal(validate(valid),valid);
 assert.throws(()=>validate({...valid,commit:'main'}),/Manifeste/);
 assert.throws(()=>validate({...valid,files:[...files,item('local-panel/updater.mjs')]}),/dupliqué|fiable/);
 assert.throws(()=>validate({...valid,files:[...files.slice(0,-1),item('../secrets.json')]}),/fiable/);
 assert.throws(()=>validate({...valid,files:[...files.slice(0,-1),{path:'CMD-5-SERVEURS-UN-SEUL.cmd',size:200,sha256:'x'}]}),/fiable/);
});
test('Windows launchers check updates before starting the local panel without deleting saves',async()=>{
 const [launcher,menu,code]=await Promise.all([
  readFile(new URL('../DEMARRER-CMD-HOSTING-FICHIERS.cmd',import.meta.url),'utf8'),
  readFile(new URL('../CMD-5-SERVEURS-UN-SEUL.cmd',import.meta.url),'utf8'),
  readFile(new URL('./updater.mjs',import.meta.url),'utf8')
 ]);
 assert.match(launcher,/node\.exe "%~dp0local-panel\\updater\.mjs" auto/);
 assert.ok(launcher.indexOf('updater.mjs')<launcher.indexOf('node.exe "%~dp0local-panel\\server.mjs"'));
 assert.match(menu,/node\.exe "%~dp0local-panel\\updater\.mjs" auto/);
 assert.match(code,/backup|previous/);
 assert.match(code,/sha256/);
 assert.doesNotMatch(code,/CMD-Servers\\.*(?:rm|unlink)/);
});

test('same version marker still checks file integrity and repairs damaged files',async()=>{
 const commit='b'.repeat(40);
 let checked=0;
 const repaired=await checkAndApply({
  readPublished:async()=>({commit}),
  readInstalled:async()=>commit,
  applyManifest:async manifest=>{assert.equal(manifest.commit,commit);checked++;return {updated:true,files:1}}
 });
 assert.equal(checked,1);
 assert.deepEqual(repaired,{updated:true,files:1});
 const unchanged=await checkAndApply({
  readPublished:async()=>({commit}),
  readInstalled:async()=>commit,
  applyManifest:async()=>({updated:false,files:0})
 });
 assert.deepEqual(unchanged,{updated:false,files:0,reason:'a-jour'});
});
