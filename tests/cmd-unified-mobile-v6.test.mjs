import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('web/public/index.html');
const css=read('web/public/ui/cmd-unified-mobile-v6.css');
const ui=read('web/public/ui/cmd-unified-experience-v6.js');
const profile=read('web/public/catalog-compat.js');
const mods=read('web/public/mod-v2-ui.js');

test('new UI v6 is loaded after earlier mobile layers and old navigation cleanup',()=>{
 assert.match(html,/cmd-unified-mobile-v6\.css\?v=20261026-v6/);
 assert.match(html,/cmd-unified-experience-v6\.js\?v=20261026-v6/);
 assert.ok(html.indexOf('cmd-unified-mobile-v6.css')>html.indexOf('mobile-catalog-compact.css'));
 assert.ok(html.indexOf('cmd-unified-experience-v6.js')>html.indexOf('cmd-navigation-cleanup.js'));
});
test('iPhone game cards show several real games with bounded images and readable titles',()=>{
 assert.match(css,/#jeux #game-list>\.game>\.real-game-image/);
 assert.match(css,/#cmdCatalogSection \.cmd-shop-cover img/);
 assert.match(css,/height:88px!important/);
 assert.match(css,/max-height:89px!important/);
 assert.match(css,/grid-template-columns:98px minmax\(0,1fr\)/);
 assert.match(css,/#cmdCatalogSection \.cmd-shop-name/);
 assert.match(css,/overflow-wrap:anywhere/);
 assert.match(ui,/function clampCovers\(/);
});
test('menus are simplified without deleting any UI or server data',()=>{
 for(const value of ['mods & workshop','jeux et decors hd','boutique des jeux'])assert.ok(ui.includes(value));
 assert.match(ui,/cmdNavSuppressed/);
 assert.match(ui,/function mainNavigation/);
 assert.match(ui,/#cmdRenterProfile,#cmdMods,#hostingPanel/);
 assert.doesNotMatch(ui,/\.remove\(\)/);
 assert.doesNotMatch(ui,/\.innerHTML\s*=/);
});
test('Palworld Steam Workshop remains visible inside profile even without a linked server',()=>{
 assert.match(ui,/cmdrpPalworldWorkshop/);
 assert.match(ui,/cmdrpPalworldOpenV6/);
 assert.match(ui,/CMDHostingOpenPalworldWorkshop/);
 assert.match(ui,/steamcommunity\.com\/app\/1623730\/workshop/);
 assert.match(mods,/PalModSettings\.ini/);
 assert.match(mods,/ActiveModList/);
 assert.match(mods,/Info\.json/);
});
test('five owner profiles are labeled PREPARED not ONLINE and never merged into true active server state',()=>{
 for(const name of ['CMD Lux','CMD Namalsk','CMD Deer Isle','CMD Takistan Plus','CMD Valhalla Astraeos'])assert.ok(profile.includes(name));
 assert.match(profile,/type:'prepared'/);
 assert.match(profile,/founder=m\.user\.role==='founder'/);
 assert.match(profile,/return'Préparé · non installé'/);
 assert.match(profile,/Le démarrage est désactivé jusqu’à confirmation/);
 assert.match(profile,/serverId:x\.s\.id,action/);
 assert.match(profile,/pc\?\.machine\?\.servers/);
});
