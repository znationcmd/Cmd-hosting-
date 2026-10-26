import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script} from 'node:vm';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
test('FS25 is directly accessible from Mes serveurs on mobile without a connected machine',async()=>{
 const [ui,html]=await Promise.all([read('web/public/ui/cmd-fs25-pc-status-v11.js'),read('web/public/index.html')]);
 assert.doesNotThrow(()=>new Script(ui));
 assert.match(html,/cmd-fs25-pc-status-v11\.js/);
 assert.match(ui,/FS25 · ModHub officiel/);
 assert.match(ui,/CMDHostingOpenFS25ModHub/);
 assert.match(ui,/fs25Selected\(\)\|\|!hasAnyServer\(\)/);
 assert.match(ui,/searchMod/);
 assert.match(ui,/www\.farming-simulator\.com\/mods\.php\?lang=fr&title=fs2025&platform=pc/);
});
test('PC pairing status uses authenticated existing session not generic agent poll',async()=>{
 const script=await read('web/public/ui/cmd-fs25-pc-status-v11.js');
 assert.match(script,/fetch\('\/api\/pc\/status'/);
 assert.match(script,/credentials:'include'/);
 assert.match(script,/response\.status===401\|\|response\.status===403/);
 assert.match(script,/machine\?\.online/);
 assert.doesNotMatch(script,/CMD_CLOUD_AGENT_TOKEN|machine-token\.dpapi/);
});
test('FS25 local panel distinguishes ZIPs actually on disk from activated mods',async()=>{
 const [server,profile]=await Promise.all([read('local-panel/server.mjs'),read('local-panel/profile-unified.js')]);
 assert.match(server,/fs25:\{name:'Farming Simulator 25',landmark:'dedicatedServer\.exe'/);
 assert.match(server,/FS25_\[A-Za-z0-9\._-\]/);
 assert.match(server,/activeVerified:false/);
 assert.match(server,/ModHub officiel GIANTS Farming Simulator 25/);
 assert.match(profile,/fs25:\['ModHub officiel GIANTS Farming Simulator 25'/);
 assert.match(profile,/Activation dans le panneau GIANTS nécessaire/);
});
test('Windows diagnostic does not expose pairing credentials or modify existing agent',async()=>{
 const [ps,cmd]=await Promise.all([read('scripts/DIAGNOSTIC-CONNEXION-PC-FS25.ps1'),read('scripts/VERIFIER-RACCORDEMENT-PC-FS25.cmd')]);
 assert.match(ps,/Get-ScheduledTask/);
 assert.match(ps,/FarmingSimulator2025/);
 assert.match(ps,/https:\/\/cmd-hosting-web-production\.up\.railway\.app\/#machines/);
 assert.doesNotMatch(ps,/Set-Content|New-ScheduledTask|Register-ScheduledTask|Remove-Item|Set-ItemProperty/);
 assert.match(cmd,/DIAGNOSTIC-CONNEXION-PC-FS25\.ps1/);
});
