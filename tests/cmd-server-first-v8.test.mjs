import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../web/public/',import.meta.url);
const source=name=>readFileSync(new URL(name,root),'utf8');
const html=source('index.html'),css=source('ui/cmd-server-first-v8.css'),js=source('ui/cmd-server-first-v8.js');
test('last and authoritative V8 layer is actually loaded after previous V7',()=>{
 const i=html.indexOf('cmd-simplified-navigation-v7.js');
 const j=html.indexOf('cmd-server-first-v8.js');
 assert.ok(i>=0&&j>i,'V8 must load after V7');
 assert.match(html,/cmd-server-first-v8\.css\?v=20261026-2110/);
 assert.ok(html.indexOf('cmd-server-first-v8.css')>html.indexOf('cmd-simplified-mobile-v7.css'));
});
test('redundant global menu removed, not real per-server Mods/FTP/Console',()=>{
 assert.match(js,/mods & workshop/);
 assert.match(js,/jeux et decors hd/);
 assert.match(js,/cmdSidebar/);
 assert.match(js,/cmdOriginalNav/);
 assert.match(js,/closest\(keepWithin\)/);
 assert.match(js,/#cmdRenterProfile,#cmdMods,#hostingPanel/);
 assert.doesNotMatch(js,/server\.running\s*=|servers\.push\(|api\/pc\/command|POST.*server/i);
});
test('Palworld workshop is available in server profile and Mods without machine and uses correct official source',()=>{
 assert.match(js,/cmdV8PalworldProfile/);
 assert.match(js,/cmdV8Palworld/);
 assert.match(js,/steamcommunity\.com\/app\/1623730\/workshop/);
 assert.match(js,/CMDHostingOpenPalworldWorkshop/);
 assert.doesNotMatch(js,/workshop_download_item|SteamCMD|createServer/i);
});
test('phone images cannot occupy full-height cards and text stays visible',()=>{
 assert.match(css,/@media\(max-width:960px\)/);
 assert.match(css,/#jeux #game-list>\.game/);
 assert.match(css,/#cmdCatalogSection \.cmd-shop-card/);
 assert.match(css,/max-height:79px!important/);
 assert.match(css,/grid-template-columns:92px minmax\(0,1fr\)/);
 assert.match(css,/overflow-wrap:anywhere/);
 assert.match(css,/\[data-cmd-nav-suppressed="1"\]/);
});
