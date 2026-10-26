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

test('Palworld button follows the SELECTED game and never appears inside an FS25 profile',()=>{
 const {runInNewContext}=requireVm();
 const selection={textContent:'CMD Valhalla FS25 — Farming Simulator 25'};
 const palworldButton={id:'cmdrpPalworldWorkshop',textContent:'Palworld · Steam Workshop',dataset:{},hidden:false,disabled:false,title:''};
 const hint={textContent:'',hidden:false};
 const sidebar={querySelector:()=>palworldButton};
 const profile={querySelector:selector=>selector==='.cmdrp-sidebar'?sidebar:null};
 const primary={append:()=>{}};
 const map={
  cmdPrimary:primary,cmdv7Catalog:{},cmdv7Account:{},cmdv7Help:{},
  cmdRenterProfile:profile,cmdrpPalworldWorkshop:palworldButton,
  cmdrpSelect:{selectedOptions:[selection]},cmdrpTitle:{textContent:'CMD Valhalla FS25'},
 };
 const handlers={};
 const context={
  window:{},
  document:{readyState:'complete',body:{},getElementById:id=>map[id]||null,
    querySelector:()=>null,querySelectorAll:()=>[],addEventListener:(name,handler)=>{handlers[name]=handler}},
  requestAnimationFrame:fn=>fn(),
  MutationObserver:undefined,
  URL,console
 };
 runInNewContext(js,context);
 assert.equal(palworldButton.hidden,true,'FS25 should not show the Palworld button');
 assert.equal(palworldButton.disabled,true);
 selection.textContent='Mon serveur Palworld · Steam';
 map.cmdrpTitle.textContent='Mon serveur Palworld';
 handlers.change({target:{id:'cmdrpSelect'}});
 assert.equal(palworldButton.hidden,false,'Palworld should show the official Workshop entry');
 assert.equal(palworldButton.disabled,false);
 selection.textContent='CMD Namalsk — DayZ';
 map.cmdrpTitle.textContent='CMD Namalsk';
 handlers.change({target:{id:'cmdrpSelect'}});
 assert.equal(palworldButton.hidden,true,'DayZ should not inherit Palworld-specific controls');
 assert.ok(css.includes('cmdrpPalworldWorkshop[hidden]'));
});
function requireVm(){return {runInNewContext:(source,context)=>new Script(source).runInNewContext(context)}}
