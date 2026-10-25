import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=await mkdtemp(path.join(tmpdir(),'cmd-four-worlds-'));
process.env.CMD_DAYZ_WORLDS_ROOT=path.join(root,'profiles');
process.env.CMD_DAYZ_ROOT=path.join(root,'game');
const api=await import('./manager.mjs');
test.after(async()=>rm(root,{recursive:true,force:true}));
test('exactly four 100-slot DayZ PC profiles with photos and independent maps',async()=>{
 const d=await api.manifest();
 assert.equal(d.profiles.length,4);
 assert.equal(d.oneAtATime,true);
 assert.equal(d.railway,false);
 assert.deepEqual(d.profiles.map(p=>p.name),['CMD Lux','CMD Namalsk','CMD Deer Isle','CMD Takistan Plus']);
 assert.deepEqual(d.profiles.map(p=>p.slots),[100,100,100,100]);
 assert.deepEqual(d.profiles.map(p=>p.port),[2302,2302,2302,2302]);
 assert.deepEqual(d.profiles.map(p=>p.mods.length),[38,32,45,30]);
 for(const p of d.profiles){
  assert.match(api.configString({...p,mission:p.map.mission}),/maxPlayers = 100;/);
  assert.equal(p.mods[0].name,'CF');
  assert.equal(p.mods[1].name,'Dabs Framework');
  assert.ok(p.mods.some(m=>m.name===p.map.name));
 }
});
test('photo-specific mods preserved without cross-map Namalsk activation on Lux',async()=>{
 const d=await api.manifest();
 const [lux,namalsk,deer,takistan]=d.profiles;
 assert.equal(lux.mods.find(m=>m.name==='Namalsk Survival').enabled,false);
 assert.equal(namalsk.mods.find(m=>m.name==='Namalsk Survival').enabled,true);
 for(const name of ['MoreDinos','dbo_raptors_123','Crocodile','Odyssey Mutants','LMs Planes','Moving AI Convoy']){
  assert.ok(deer.mods.some(m=>m.name===name),name);
 }
 assert.ok(takistan.mods.some(m=>m.name==='TakistanPlus'));
});
test('prepare builds non-destructive separated configs and incomplete servers are not startable',async()=>{
 assert.equal(await api.prepare(),4);
 const before=await readFile(path.join(root,'profiles','profiles','cmd-lux','serverDZ.cfg'),'utf8');
 await api.prepare();
 const after=await readFile(path.join(root,'profiles','profiles','cmd-lux','serverDZ.cfg'),'utf8');
 assert.equal(before,after);
 const statuses=await api.status();
 assert.equal(statuses.length,4);
 assert.ok(statuses.every(s=>!s.ready&&s.missing.length>0));
 assert.ok(statuses.every(s=>s.slots===100));
 assert.ok(statuses.every(s=>s.missing.some(m=>/Serveur DayZ officiel non installe/.test(m))));
 assert.ok(statuses.every(s=>s.missing.some(m=>/Workshop ID introuvable/.test(m))));
});
test('manager has no Railway network dependency or server emulation',async()=>{
 const s=await readFile(new URL('./manager.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(s,/\.railway\.app|fetch\(|http\.createServer/);
 assert.match(s,/one-server-at-a-time\.lock/);
 assert.match(s,/tasklist\.exe/);
 assert.match(s,/DayZServer_x64\.exe/);
 assert.match(s,/workshop_download_item/);
 assert.match(s,/mpmissions/);
 assert.match(s,/process\.platform!=='win32'/);
 assert.match(s,/SteamCMD/);
});
