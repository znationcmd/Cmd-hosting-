import test from 'node:test';
import assert from 'node:assert/strict';
import {DEDICATED_SERVER_EXECUTABLES,parseRunningDedicatedServers,gameProcessesRunning} from './exclusive-game-lock.mjs';

test('Windows dedicated game executables are detected across DayZ, ARK, Palworld and Arma',()=>{
 for(const name of ['DayZServer_x64.exe','ArkAscendedServer.exe','PalServer.exe',
  'ArmaReforgerServer.exe','7DaysToDieServer.exe']){
  assert.ok(DEDICATED_SERVER_EXECUTABLES.includes(name));
  const sample='"'+name+'","7336","Console","1","187 920 Ko"';
  assert.deepEqual(parseRunningDedicatedServers(sample),[name]);
 }
});
test('client games do not falsely count as dedicated servers',()=>{
 const output=[
  '"Palworld-Win64-Shipping.exe","1249","Console","1","100 Ko"',
  '"DayZ_x64.exe","999","Console","1","100 Ko"',
  '"ARKSurvivalAscended.exe","101","Console","1","100 Ko"',
  '"steam.exe","102","Console","1","100 Ko"'
 ].join('\r\n');
 assert.deepEqual(parseRunningDedicatedServers(output),[]);
});
test('unknown processes are ignored and multiple dedicated hosts are exposed',()=>{
 const x=[
  '"steam.exe","220","Console","1","500 Ko"',
  '"ArmaReforgerServer.exe","240","Console","1","300 Ko"',
  '"PalServer.exe","250","Console","1","300 Ko"',
  '"unknown.exe","260","Console","1","300 Ko"'
 ].join('\r\n');
 assert.deepEqual(parseRunningDedicatedServers(x),['ArmaReforgerServer.exe','PalServer.exe']);
 if(process.platform!=='win32')assert.equal(gameProcessesRunning(),false);
});
