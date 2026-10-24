import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');

test('ANOMALIA appears in the main games catalogue, draft selector, account-library options and shop',()=>{
 const html=read('../web/public/index.html');
 const shop=read('../web/public/catalog-ui.js');
 assert.match(html,/data-key="anomalia"/);
 assert.match(html,/<option value="anomalia">ANOMALIA PRIMEVAL OUTBOUNDUN/);
 assert.match(html,/"anomalia":\{"name":"ANOMALIA PRIMEVAL OUTBOUNDUN"/);
 assert.match(html,/gameKey:libKey.value/);
 assert.match(html,/for\(const \[key,g\] of Object.entries\(configsByGame\)\)/);
 assert.match(shop,/anomalia-cmd/);
 assert.match(html,/base":null/); // no invented rental price
 assert.match(html,/Non disponible · pré-alpha/);
 assert.doesNotMatch(html,/ANOMALIA[^<]{0,100}Disponible maintenant.*Payer/i);
});

test('Nasdara is in DayZ official maps, not incorrectly entered as a Steam Workshop item',()=>{
 const ui=read('../web/public/index.html');
 const existing=read('../web/public/catalog-compat.js');
 const api=read('../services/mods-api/index.ts');
 const provisioning=read('../services/provisioning/game-installers.ts');
 for(const s of [ui,existing,api,provisioning])
   assert.match(s,/dayzOffline\.nasdara/);
 assert.match(ui,/id="dayzMapChoice"/);
 assert.match(ui,/Nasdara · Badlands/);
 assert.match(ui,/missionTemplate:\$id\('dayzMapChoice'\)\.value/);
 assert.match(api,/kind:"official",dlc:"Badlands",minVersion:"1\.30"/);
 assert.match(api,/dayzOffline\.sakhal/);
 assert.match(existing,/!names\.has\(x\.launchName\)/);
 assert.match(provisioning,/requiresStoppedServer:true/);
 assert.match(provisioning,/requiresBackup:true/);
 assert.match(provisioning,/applied:false/);
 assert.doesNotMatch(api,/nasdara.*publishedfileid/i);
});

test('CMD Hosting public page inline JavaScript is syntactically valid',()=>{
 const html=read('../web/public/index.html');
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(Boolean);
 assert.ok(scripts.length>=1);
 for(const script of scripts)assert.doesNotThrow(()=>new Function(script));
});
test('ANOMALIA is a local WorkForge planning entry, not an automatically installed dedicated server',()=>{
 const api=read('../services/mods-api/index.ts');
 assert.match(api,/workforge-local/);
 assert.match(api,/item\[2\]!=="workforge-local"/);
 assert.match(api,/autoInstall:false/);
});
