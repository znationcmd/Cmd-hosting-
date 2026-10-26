import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {lifetimeRegistry,GAME_SUGGESTIONS,validateProfile} from './persistent-profiles.mjs';

test('All game catalogue entries and custom games can be saved without expiry',async t=>{
 const dir=await mkdtemp(path.join(tmpdir(),'cmd-lifetime-'));
 t.after(()=>rm(dir,{recursive:true,force:true}));
 const state=path.join(dir,'persistent-game-profiles.json');
 const profiles=lifetimeRegistry({file:state});
 assert.ok(GAME_SUGGESTIONS.some(g=>g.name==='Palworld'));
 assert.ok(GAME_SUGGESTIONS.some(g=>g.name==='ARK Survival Ascended'));
 const first=await profiles.create({name:'CMD Valhalla',gameName:'ARK Survival Ascended',gameKey:'ark-asa',slots:100,map:'Astraeos'});
 const second=await profiles.create({name:'CMD Mon autre jeu',gameName:'Un jeu du catalogue différent',gameKey:'custom',slots:55});
 assert.notEqual(first.id,second.id);
 assert.equal(first.expiresAt,null);
 assert.equal(first.automaticDeletion,false);
 assert.equal(first.autoRenewalNotRequired,true);
 const fresh=lifetimeRegistry({file:state});
 assert.equal((await fresh.list()).length,2);
 assert.equal((await fresh.list())[0].name,'CMD Valhalla');
 assert.equal((await fresh.snapshot()).schema,'cmd-hosting/lifetime-game-profiles-v1');
 const content=await readFile(state,'utf8');
 assert.match(content,/CMD Valhalla/);
 assert.doesNotMatch(content,/expirationDate|deleteAfterDays|expiresInDays/);
});
test('Changes and linking survive reopen; only exact manual deletion removes a profile, not game content',async t=>{
 const dir=await mkdtemp(path.join(tmpdir(),'cmd-lifetime-'));
 t.after(()=>rm(dir,{recursive:true,force:true}));
 const state=path.join(dir,'db.json');
 const instance=lifetimeRegistry({file:state});
 const p=await instance.create({name:'CMD Lux',gameName:'DayZ PC',gameKey:'dayz',slots:100});
 await instance.modify(p.id,{name:'CMD Lux RP',slots:120,map:'Lux'});
 await instance.link(p.id,'C:\\CMD-Servers\\Lux\\DayZ');
 const restored=lifetimeRegistry({file:state});
 assert.equal((await restored.list())[0].slots,120);
 assert.equal((await restored.list())[0].map,'Lux');
 assert.equal((await restored.list())[0].directory,'C:\\CMD-Servers\\Lux\\DayZ');
 await assert.rejects(()=>restored.remove(p.id,'CMD Lux'),/recopie exactement/i);
 assert.equal((await restored.list()).length,1);
 const removed=await restored.remove(p.id,'CMD Lux RP');
 assert.equal(removed.gameWorldsPreserved,true);
 assert.equal(removed.filesDeleted,false);
 assert.deepEqual(await restored.list(),[]);
});
test('Concurrent creations persist without clobber; invalid values never enter DB',async t=>{
 const dir=await mkdtemp(path.join(tmpdir(),'cmd-lifetime-'));
 t.after(()=>rm(dir,{recursive:true,force:true}));
 const profiles=lifetimeRegistry({file:path.join(dir,'db.json')});
 await Promise.all(Array.from({length:24},(_,i)=>profiles.create({
  name:'CMD Server '+i,gameName:'Palworld',gameKey:'palworld',slots:100
 })));
 assert.equal((await profiles.list()).length,24);
 await assert.rejects(()=>profiles.create({name:'a',gameName:'Palworld',slots:100}),/Nom de serveur/);
 await assert.rejects(()=>profiles.create({name:'bad',gameName:'Palworld',slots:10000}),/Slots demandés/);
 assert.throws(()=>validateProfile({name:'Valid',gameName:'Game',gameKey:'../../etc',slots:10}),/identifiant/i);
 assert.equal((await profiles.list()).length,24);
});
