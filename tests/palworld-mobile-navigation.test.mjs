import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const mods=read('web/public/mod-v2-ui.js');
const autodetect=read('web/public/mod-auto-detect.js');
const profile=read('web/public/catalog-compat.js');
const nav=read('web/public/ui/cmd-navigation-cleanup.js');
const mobile=read('web/public/ui/cmd-mobile-catalog-fix.css');
const html=read('web/public/index.html');

test('Palworld Steam Workshop official path and safe dedicated-server instructions',()=>{
 assert.match(mods,/https:\/\/steamcommunity\.com\/app\/1623730\/workshop\//);
 assert.match(mods,/docs\.palworldgame\.com\/settings-and-operation\/mod\//);
 assert.match(mods,/Mods\/Workshop/);
 assert.match(mods,/Info\.json/);
 assert.match(mods,/PalModSettings\.ini/);
 assert.match(mods,/ActiveModList/);
 assert.match(mods,/PackageName/);
 assert.match(mods,/palworldProfile\?'steam'/);
 assert.match(mods,/palworldProfile\?1623730/);
 assert.match(mods,/palworldBrowser\(\)/);
});
test('Palworld workshop visible even when mods API has no provider or existing game install',()=>{
 assert.match(mods,/window\.CMDHostingOpenPalworldWorkshop/);
 assert.match(mods,/else if\(palworldProfile\)\{palworldBrowser\(\)/);
 assert.match(mods,/Aucun mod n’est téléchargé ou installé/);
 assert.match(autodetect,/g==='palworld'/);
 assert.match(autodetect,/gameSources\.palworld/);
 assert.match(profile,/rpIdentify\(x\)==='Palworld'/);
 assert.match(profile,/CMDHostingOpenPalworldWorkshop/);
 assert.match(profile,/modsPage\(chosen\(\)\)/);
});
test('Profile retains Mods access; duplicate standalone menus only are suppressed',()=>{
 assert.match(profile,/const cats=\['Vue générale'.*?'Mods'/);
 assert.match(nav,/cmdPrimary button/);
 assert.match(nav,/const globalRedundancies=/);
 assert.match(nav,/mods/i);
 assert.match(nav,/jeux/i);
 assert.doesNotMatch(nav,/\.remove\(\)/);
 assert.doesNotMatch(nav,/\.page button/);
});
test('Palworld catalogue opens official Steam Workshop without a fake server',()=>{
 const shop=read('web/public/catalog-ui.js');
 assert.match(shop,/data-palworld-workshop/);
 assert.match(shop,/window\.CMDHostingOpenPalworldWorkshop/);
 assert.match(shop,/steamcommunity\.com\/app\/1623730\/workshop/);
 const profile=read('web/public/catalog-compat.js');
 assert.match(profile,/Mes 5 profils CMD préparés/);
 assert.match(profile,/À installer sur Windows/);
 assert.match(profile,/Administration avancée/);
});
test('iPhone game catalogue loads bounded covers, legible titles, and same UI for old/new pages',()=>{
 assert.match(mobile,/#jeux #game-list/);
 assert.match(mobile,/#cmdCatalogSection #cmdShopGrid/);
 assert.match(mobile,/max-height:145px!important/);
 assert.match(mobile,/object-fit:cover!important/);
 assert.match(mobile,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(mobile,/\.cmd-shop-name/);
 assert.match(html,/cmd-mobile-catalog-fix\.css\?v=20261026/);
 assert.match(html,/cmd-navigation-cleanup\.js\?v=20261026/);
 assert.match(html,/mod-v2-ui\.js\?v=20261026-palworld-3/);
});

test('Workshop Palworld is a first-class server-mod source and the mobile cards stay compact',()=>{
 const css=read('web/public/ui/mobile-catalog-compact.css');
 assert.match(mods,/id="cvQuickPalworld"/);
 assert.match(mods,/__palworld_workshop__/);
 assert.match(mods,/cmdv-source-quick/);
 assert.match(mods,/palworldWorkshopBrowse/);
 assert.match(mods,/\&searchtext=/);
 assert.match(mods,/Mods enregistrés/);
 assert.match(css,/#jeux \.game > img\.real-game-image/);
 assert.match(css,/max-height:104px!important/);
 assert.match(css,/\.cmd-shop-cover img/);
 assert.match(html,/mobile-catalog-compact\.css/);
});


test('new mobile catalog override remains loaded after old style and bounds both catalogue views',()=>{
  const override=read('web/public/ui/cmd-hosting-mobile-catalog-v3.css');
  assert.match(override,/#jeux #game-list/);
  assert.match(override,/#cmdCatalogSection \.cmd-shop-cover img/);
  assert.match(override,/max-height:84px!important/);
  assert.match(override,/grid-template-columns:minmax\(0,1fr\)!important/);
  assert.match(override,/object-fit:cover!important/);
  assert.match(html,/cmd-hosting-mobile-catalog-v3\.css\?v=20261026-mobile3/);
});
