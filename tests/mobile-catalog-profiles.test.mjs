import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const js=readFileSync(new URL('../services/mods-api/index.ts',import.meta.url),'utf8');
const start=js.indexOf('const cmdUiMarkup='),end=js.indexOf('async function handle(request)',start);
const page=js.slice(start,end);
test('embedded CMD Hosting catalog closes its first style before the embed stylesheet',()=>{
 assert.ok(start>0,'The preproduction catalog exists');
 assert.ok(page.includes('\\n</style><style>html.cmd-embedded'),'Style elements correctly separated');
 assert.ok(!page.includes('\\n<style>html.cmd-embedded'),'Broken nested stylesheet absent');
});
test('mobile image thumbnails are bounded even when covers have large native resolution',()=>{
 assert.match(page,/\.game \.art,.game \.art img\{height:96px!important;max-height:96px!important/);
 assert.match(page,/\.detailcover,.detailcover img\{height:150px!important/);
 assert.match(page,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});
test('the five real prepared profiles are visible without claiming a running server',()=>{
 for(const name of ['CMD Lux','CMD Namalsk','CMD Deer Isle','CMD Takistan Plus','CMD Valhalla Astraeos'])
   assert.ok(page.includes(name),name);
 assert.match(page,/Mes 5 profils CMD préparés/);
 assert.match(page,/Aucun serveur n’est encore déclaré installé, actif ou accessible/);
 assert.match(page,/À installer sur Windows/);
 assert.match(page,/un seul démarrage à la fois/);
});
