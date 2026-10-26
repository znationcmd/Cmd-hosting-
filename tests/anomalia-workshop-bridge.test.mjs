import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('CMD Hosting ANOMALIA Workshop frontend parses, is wired after Mods manager',()=>{
 const html=read('../web/public/index.html');
 const ui=read('../web/public/anomalia-workshop-bridge.js');
 assert.doesNotThrow(()=>new Script(ui));
 const managerIndex=html.indexOf('/mod-v2-ui.js');
 const bridgeIndex=html.indexOf('/anomalia-workshop-bridge.js');
 assert.ok(managerIndex>=0&&bridgeIndex>managerIndex);
 for(const id of ['cmdAnomaliaWorkshop','awmImport','awmExport','awmStatus'])
  assert.match(ui,new RegExp(id));
});
test('handoff is a manifest-only plan and never claims to deploy a server',()=>{
 const s=read('../web/public/anomalia-workshop-bridge.js');
 assert.match(s,/anomalia-hosting-mod-handoff/);
 assert.match(s,/anomalia-primeval-outboundun/);
 assert.match(s,/cmd-hosting-anomalia-mod-plan/);
 assert.match(s,/deployment\?\.ready!==false/);
 assert.match(s,/state:'not-deployed'/);
 assert.match(s,/!\s*\/\^ANM/);
 assert.match(s,/SHA-256/);
 assert.doesNotMatch(s,/fetch\(['"]\/api\/mods(?:\/|\?|['"])/);
});
test('ANOMALIA shop card links to real CMD Hosting Workshop',()=>{
 const s=read('../web/public/catalog-ui.js');
 assert.match(s,/data-anomalia-workshop/);
 assert.match(s,/CMDHostingOpenMods/);
 assert.match(s,/La location de serveurs CMD Hosting pour ce jeu n’est pas encore disponible/);
});
