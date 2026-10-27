import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const file=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
const autodetect=file('web/public/mod-auto-detect.js');
const mods=file('web/public/mod-v2-ui.js');
const html=file('web/public/index.html');
test('FS25 is a recognized game with official GIANTS ModHub instead of unsupported warning',()=>{
 assert.doesNotThrow(()=>new Script(autodetect));
 assert.match(autodetect,/fs25:'ModHub officiel GIANTS/);
 assert.match(autodetect,/const isFs25=/);
 assert.match(autodetect,/if\(isFs25\|\|provider===gameSources\.fs25\)/);
 assert.match(autodetect,/id==='__fs25_modhub__'/);
 assert.match(autodetect,/cmdFS25ModHubDirect/);
 assert.match(autodetect,/www\.farming-simulator\.com\/mods\.php\?lang=fr&title=fs2025&platform=pc/);
 assert.match(autodetect,/Mods compatibles FS25/);
});
test('PC connection is displayed from signed-in /api/pc/status, with a link to real pairing',()=>{
 assert.doesNotThrow(()=>new Script(mods));
 assert.match(mods,/fetch\('\/api\/pc\/status'/);
 assert.match(mods,/credentials:'include'/);
 assert.match(mods,/machine\?\.online===true/);
 assert.match(mods,/cvPCPairHelp/);
 assert.match(mods,/Associer mon PC/);
 assert.match(mods,/window\.show\('machines'\)/);
 assert.doesNotMatch(mods,/machine\?\.online\s*\|\|\s*true/);
});
test('cache-busted FS25 JS assets ship from a single web page',()=>{
 assert.match(html,/mod-v2-ui\.js\?v=20261027-fs25-12/);
 assert.match(html,/mod-auto-detect\.js\?v=20261027-fs25-12/);
 assert.match(html,/cmd-server-first-v11\.js/);
});
