import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const root=await mkdtemp(join(tmpdir(),'cmd-exclusive-test-'));
process.env.CMD_SERVERS_ROOT=root;
const {acquireGameLock,releaseGameLock,LOCK_PATH}=await import('../local-panel/exclusive-game-lock.mjs');
const {manifest,launchArgs,parisClock,nextRestartDue}=await import('./manager.mjs');
test.after(async()=>{await releaseGameLock();await rm(root,{recursive:true,force:true})});
test('Astraeos 100 slots, RP, no Railway and same machine exclusivity',async()=>{
 const m=await manifest();
 assert.equal(m.id,'cmd-valhalla-extinction-astraeos');
 assert.equal(m.name,'CMD Valhalla Extinction Astraeos');
 assert.equal(m.map,'Astraeos_WP');assert.equal(m.maxPlayers,100);
 assert.equal(m.mode,'RP');assert.equal(m.railway,false);
 assert.equal(m.exclusiveWithDayZ,true);
 assert.equal(m.timeZone,'Europe/Paris');
 assert.deepEqual(m.restartLocalParis,['08:00','12:00','22:00']);
});
test('all 24 requested mod IDs are sourced and passed to ASA not DayZ Workshop',async()=>{
 const m=await manifest();
 assert.equal(m.mods.length,24);
 const ids=m.mods.map(x=>x.curseForgeId);
 assert.equal(new Set(ids).size,24);
 assert.ok(m.mods.every(x=>/^https:\/\/www\.curseforge\.com\/ark-survival-ascended\/mods\//.test(x.projectUrl)));
 assert.ok(ids.includes(1122696));assert.ok(ids.includes(933099));assert.ok(ids.includes(928708));
 assert.ok(m.mods.some(x=>x.name.includes('Livyatan')&&x.notes==='premium'));
 const args=launchArgs(m);
 assert.ok(args[0].startsWith('Astraeos_WP?SessionName=CMD Valhalla Extinction Astraeos'));
 assert.ok(args.includes('-WinLiveMaxPlayers=100'));
 assert.ok(args.includes('-ServerPlatform=ALL'));
 assert.equal(args.find(x=>x.startsWith('-mods=')),'-mods='+ids.join(','));
 assert.ok(!args.some(x=>x.includes('MapModID')));
});
test('Game.ini and GameUserSettings.ini reflect requested Valhalla rates but no fake infinity',async()=>{
 const game=await readFile(new URL('./Game.ini',import.meta.url),'utf8');
 const s=await readFile(new URL('./GameUserSettings.ini',import.meta.url),'utf8');
 const checks=[
 [s,/XPMultiplier=10\.0/],[s,/HarvestAmountMultiplier=3\.0/],
 [s,/TamingSpeedMultiplier=1000\.0/],[s,/ResourcesRespawnPeriodMultiplier=0\.5/],
 [s,/DifficultyOffset=1\.0/],[s,/OverrideOfficialDifficulty=10\.0/],
 [s,/ItemStackSizeMultiplier=30000\.0/],[s,/DisableStructureDecayPvE=True/],
 [s,/bAllowSpeedLeveling=True/],[s,/MaxDrakeLevel=38\.0/],[s,/MaxLevel=30\.0/],
 [game,/BabyMatureSpeedMultiplier=900\.0/],[game,/MaxFallSpeedMultiplier=100\.0/],
 [game,/PerLevelStatsMultiplier_Player\[7\]=50000/],
 [game,/PerLevelStatsMultiplier_DinoTamed\[7\]=50000/]
 ];
 for(const [body,pattern] of checks)assert.match(body,pattern);
 assert.doesNotMatch(s,/ServerAdminPassword=[^;\r\n]+/);
 assert.doesNotMatch(s,/Infinity|=NaN/i);
});
test('Paris restarts honor DST and allow one event per local minute',async()=>{
 const m=await manifest();
 assert.deepEqual(parisClock(new Date('2026-10-25T07:00:00Z')),{date:'2026-10-25',time:'08:00'});
 assert.equal(nextRestartDue(m,new Date('2026-10-25T07:00:00Z'),''),'2026-10-25 08:00');
 assert.equal(nextRestartDue(m,new Date('2026-10-25T07:00:30Z'),'2026-10-25 08:00'),null);
 assert.equal(nextRestartDue(m,new Date('2026-06-01T06:00:00Z'),''),'2026-06-01 08:00');
 assert.equal(nextRestartDue(m,new Date('2026-06-01T10:00:00Z'),''),'2026-06-01 12:00');
 assert.equal(nextRestartDue(m,new Date('2026-06-01T20:00:00Z'),''),'2026-06-01 22:00');
});
test('cross-game lock blocks DayZ and ARK starting simultaneously; releases after owner ends',async()=>{
 await acquireGameLock('dayz-cmd-lux');
 await assert.rejects(()=>acquireGameLock('asa-astraeos'),/deja actif|verrou|Serveur/i);
 await releaseGameLock();
 await acquireGameLock('asa-astraeos');
 await releaseGameLock();
});
test('shared lock is actually imported and used by BOTH Windows game launchers',async()=>{
 const d=await readFile(new URL('../dayz-worlds/manager.mjs',import.meta.url),'utf8');
 const a=await readFile(new URL('./manager.mjs',import.meta.url),'utf8');
 assert.match(d,/acquireGameLock\('dayz-'\+profile\.id\)/);
 assert.match(a,/acquireGameLock\('asa-astraeos'\)/);
 assert.match(a,/SaveWorld/);assert.match(a,/DoExit/);
 assert.match(a,/CMD_ASA_PREMIUM_ACK/);
 assert.match(a,/RCON/);
 assert.match(a,/2430930/);
 assert.match(a,/NoBattlEye/);
 assert.match(a,/SteamCMD|steamcmd/i);
 assert.match(String(LOCK_PATH),/cmd-hosting-active-game\.lock/);
});
test('Windows start scripts never ask for Railway keys or contain user secrets',async()=>{
 const [ps,bat,menu]=await Promise.all([
 readFile(new URL('./Start-CMD-Valhalla.ps1',import.meta.url),'utf8'),
 readFile(new URL('./CMD-VALHALLA-ASTRAEOS.cmd',import.meta.url),'utf8'),
 readFile(new URL('../CMD-5-SERVEURS-UN-SEUL.cmd',import.meta.url),'utf8')
 ]);
 assert.match(ps,/Read-Host .* -AsSecureString/);
 assert.match(ps,/CMD_ASA_ADMIN_PASSWORD/);
 assert.match(bat,/Start-CMD-Valhalla\.ps1/);
 assert.match(menu,/cmd-lux/);assert.match(menu,/cmd-namalsk/);
 assert.match(menu,/cmd-deer-isle/);assert.match(menu,/cmd-takistan-plus/);
 assert.match(menu,/CMD-VALHALLA-ASTRAEOS\.cmd/);
 assert.doesNotMatch(ps,/CMD_CLOUD_AGENT_TOKEN|DATABASE_URL/);
});
