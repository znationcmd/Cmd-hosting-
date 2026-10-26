import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const here=new URL('.',import.meta.url);
const {manifest,parisSlot,packet,checks}=await import('./manager.mjs');
test('CMD Valhalla is Astraeos 100 slots local without Railway or a started-server claim',async()=>{
 const p=await manifest();
 assert.equal(p.id,'cmd-valhalla-astraeos');
 assert.equal(p.map.code,'Astraeos_WP');
 assert.equal(p.map.type,'official-paid-DLC');
 assert.equal(p.map.publisherDownloadOrPurchaseAuto,false);
 assert.equal(p.slots,100);
 assert.equal(p.railway,false);
 assert.equal(p.status,'configuration-prepared-not-installed');
 assert.deepEqual(p.restarts.times,['08:00','12:00','22:00']);
 assert.equal(p.restarts.timezone,'Europe/Paris');
});
test('all 24 user mods included, exactly 23 confirmed CurseForge IDs, role play not substituted',async()=>{
 const p=await manifest();
 assert.equal(p.mods.length,24);
 const ids=p.mods.filter(m=>m.curseforgeId).map(m=>m.curseforgeId);
 assert.equal(ids.length,23);
 assert.equal(new Set(ids).size,23);
 assert.ok(ids.every(id=>/^\d{5,10}$/.test(id)));
 const special=p.mods.find(m=>m.name==='Role Play Jobs');
 assert.equal(special.curseforgeId,null);
 assert.equal(special.potentialMatch.curseforgeId,'1362939');
 assert.equal(special.verification,'name_to_confirm');
 assert.ok(p.mods.some(x=>x.name==='Super Cryo Storage'&&x.curseforgeId==='933099'));
 assert.ok(p.mods.some(x=>x.name==='Shiny! Dinos Ascended'&&x.curseforgeId==='928548'));
 assert.ok(p.mods.some(x=>x.name==='Resonant\'s Shop Mod'&&x.curseforgeId==='936660'));
});
test('real ini contains requested multipliers and not a fabricated infinite literal',async()=>{
 const [u,g]=await Promise.all([
  readFile(new URL('GameUserSettings.ini',here),'utf8'),readFile(new URL('Game.ini',here),'utf8')]);
 const settings=['XPMultiplier=10.0','HarvestAmountMultiplier=3.0','TamingSpeedMultiplier=1000.0',
 'ItemStackSizeMultiplier=30000.0','ResourcesRespawnPeriodMultiplier=0.5','DayTimeSpeedScale=10.0',
 'OverrideOfficialDifficulty=10.0','DifficultyOffset=1.0','DisableStructureDecayPvE=True',
 'PreventDownloadItems=False','RCONPort=27020'];
 for(const x of settings)assert.ok(u.includes(x),x);
 assert.match(g,/BabyMatureSpeedMultiplier=900\.0/);
 assert.match(g,/MaxFallSpeedMultiplier=100000\.0/);
 assert.match(g,/PerLevelStatsMultiplier_Player\[7\]=1000000\.0/);
 assert.doesNotMatch(u+g,/\b(?:Infinity|NaN)\b/i);
});
test('Paris schedule accounts for DST on same UTC hour',()=>{
 assert.deepEqual(parisSlot(new Date('2026-01-26T07:00:00Z')), {date:'2026-01-26',time:'08:00'});
 assert.deepEqual(parisSlot(new Date('2026-07-26T06:00:00Z')), {date:'2026-07-26',time:'08:00'});
 assert.deepEqual(parisSlot(new Date('2026-10-26T11:00:00Z')), {date:'2026-10-26',time:'12:00'});
 const bytes=packet(401,3,'test');
 assert.equal(bytes.readInt32LE(0),14);
 assert.equal(bytes.readInt32LE(8),3);
});
test('launcher does not deploy online, lacks prerequisites by default and has safe RCON shutdown',async()=>{
 const js=await readFile(new URL('manager.mjs',here),'utf8');
 const win=await readFile(new URL('../LANCER-CMD-VALHALLA-ASTRAEOS.cmd',here),'utf8');
 assert.match(js,/SaveWorld/);
 assert.match(js,/DoExit/);
 assert.match(js,/Europe\/Paris/);
 assert.doesNotMatch(js,/taskkill|process\.kill\(child\.pid|kill -9/);
 assert.match(win,/INSTALLER-ARK-Valhalla/i);
 assert.match(win,/manager\.mjs/);
 const result=await checks();
 assert.equal(result.ready,false);
 assert.ok(result.missing.some(x=>/ARK|Windows|DLC|CurseForge/.test(x)));
});
