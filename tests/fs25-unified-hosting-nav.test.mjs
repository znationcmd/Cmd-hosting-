import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('client scripts syntax check for unified CMD Hosting navigation',()=>{
 for(const p of ['../web/public/catalog-ui.js','../web/public/catalog-compat.js',
 '../web/public/game-switch-ui.js','../web/public/mod-v2-ui.js'])
  assert.doesNotThrow(()=>new Script(read(p)),p);
});
test('FS25 is assigned official GIANTS ModHub without inventing a public install API',()=>{
 const s=read('../web/public/mod-v2-ui.js');
 assert.match(s,/sourceLabel=\{[^}]*fs25:/);
 assert.match(s,/farming-simulator\.com\/mods\.php\?lang=fr&title=fs2025&platform=pc/);
 assert.match(s,/function fs25Browser\(/);
 assert.match(s,/isFs25\(/);
 assert.match(s,/fs25Profile\?\'fs25\'/);
 assert.match(s,/provider===\'fs25\'/);
 assert.match(s,/if\(fs25Profile\)fs25Browser\(/);
 assert.match(s,/Mods & Workshop is accessible from Mes serveurs/);
 assert.doesNotMatch(s,/navigation\.prepend\(b\)/);
});
test('changes of game and Mods stay linked to profile only, duplicates removed',()=>{
 const game=read('../web/public/game-switch-ui.js');
 const profile=read('../web/public/catalog-compat.js');
 const shop=read('../web/public/catalog-ui.js');
 assert.match(game,/window\.CMDHostingOpenGameSwitch=open/);
 assert.match(profile,/window\.CMDHostingOpenMods\(\)/);
 assert.match(profile,/window\.CMDHostingOpenGameSwitch\(\)/);
 assert.match(profile,/function shop\(\)\{page\('cmdCatalogSection'\)\}/);
 assert.doesNotMatch(shop,/Jeux et décors HD/);
 assert.doesNotMatch(shop,/cmdIntegratedGamesFrame/);
 assert.doesNotMatch(game,/sidebar\.prepend\(b\)/);
});
test('image heights capped on mobile screens and front-end cache revision incremented',()=>{
 const css=read('../web/public/ui/hosting-blue-violet-3d.css');
 const html=read('../web/public/index.html');
 assert.match(css,/cmd-shop-cover img/);
 assert.match(css,/height:112px!important/);
 assert.match(css,/max-width:740px/);
 assert.match(html,/mod-v2-ui\.js\?v=20261026-palworld-2/);
 assert.match(html,/catalog-ui\.js\?v=20261026-menu-1/);
});
test('no loss of official DayZ and ARK provider search behavior',()=>{
 const mods=read('../web/public/mod-v2-ui.js');
 assert.match(mods,/Number\(steamAppId\)===221100/);
 assert.match(mods,/isArk=provider===\'curseforge\'/);
 assert.match(mods,/\/api\/mods\/dayz\/search\?/);
 assert.match(mods,/\/api\/mods\/curseforge\/search\?/);
});
