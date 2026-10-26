import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const read=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
const html=read('web/public/index.html');
const js=read('web/public/ui/cmd-simplified-navigation-v7.js');
const css=read('web/public/ui/cmd-simplified-mobile-v7.css');
const mods=read('web/public/mod-v2-ui.js');
const profile=read('web/public/catalog-compat.js');
test('single last-loaded V7 mobile override and menu on the recovered main page',()=>{
 assert.match(html,/cmd-simplified-mobile-v7\.css\?v=20261026-v7/);
 assert.match(html,/cmd-simplified-navigation-v7\.js\?v=20261026-v7/);
 assert.ok(html.indexOf('cmd-simplified-mobile-v7.css')>html.indexOf('cmd-unified-mobile-v6.css'));
 assert.ok(html.indexOf('cmd-simplified-navigation-v7.js')>html.indexOf('cmd-unified-experience-v6.js'));
 assert.doesNotThrow(()=>new Script(js));
});
test('only global duplicated menus are hidden; server settings and modal functions preserved',()=>{
 for(const item of ['mods & workshop','jeux et decors hd','boutique des jeux'])assert.ok(js.includes(item));
 assert.match(js,/cmdOriginalNav/);
 assert.match(js,/cmdRenterProfile/);
 assert.match(js,/cmdPrimary/);
 assert.match(js,/cmdAdvancedServerTools/);
 assert.match(js,/openProfile/);
 assert.match(js,/openCatalog/);
 assert.doesNotMatch(js,/\.remove\(/);
 assert.doesNotMatch(js,/innerHTML\s*=/);
 assert.doesNotMatch(js,/fetch\(/);
});
test('Palworld official workshop reachable from a server profile, even without a game installation',()=>{
 assert.match(js,/CMDHostingOpenPalworldWorkshop/);
 assert.match(js,/steamcommunity\.com\/app\/1623730\/workshop\//);
 assert.match(js,/cmdrpPalworldWorkshop/);
 assert.match(mods,/PalModSettings\.ini/);
 assert.match(mods,/Mods\/Workshop/);
 assert.match(mods,/ActiveModList/);
 assert.match(mods,/PackageName/);
 assert.match(profile,/modsPage\(chosen\(\)\)/);
});
test('both dynamic and original catalogue cards on iPhone have small images and readable names',()=>{
 assert.match(css,/@media\(max-width:780px\)/);
 assert.match(css,/#jeux #game-list>\.game/);
 assert.match(css,/#cmdCatalogSection \.cmd-shop-card/);
 assert.match(css,/grid-template-columns:96px minmax\(0,1fr\)/);
 assert.match(css,/grid-template-columns:105px minmax\(0,1fr\)/);
 assert.match(css,/max-height:90px!important/);
 assert.match(css,/max-height:88px!important/);
 assert.match(css,/\.cmd-shop-name/);
 assert.match(css,/overflow-wrap:anywhere/);
});
test('no false real server claims or unsafe editor payments/launch from V7',()=>{
 assert.match(js,/NEVER creates or claims game servers/);
 assert.doesNotMatch(js,/\/api\/pc\/command|\/api\/rentals|ServerAdminPassword/);
 assert.match(profile,/type:'prepared'/);
 assert.match(profile,/Préparé · non installé/);
});
