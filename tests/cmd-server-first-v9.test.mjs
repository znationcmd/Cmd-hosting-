import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext,Script} from 'node:vm';
const load=name=>readFileSync(new URL('../web/public/'+name,import.meta.url),'utf8');
const html=load('index.html'),js=load('ui/cmd-server-first-v9.js'),css=load('ui/cmd-server-first-v9.css');
test('V9 is loaded AFTER V8 and all older CSS/JS, on actual HTML',()=>{
 assert.ok(html.includes('cmd-server-first-v9.css?v=20261026-v9'));
 assert.ok(html.includes('cmd-server-first-v9.js?v=20261026-v9'));
 assert.ok(html.indexOf('cmd-server-first-v9.css')>html.indexOf('cmd-server-first-v8.css'));
 assert.ok(html.indexOf('cmd-server-first-v9.js')>html.indexOf('cmd-server-first-v8.js'));
 assert.doesNotThrow(()=>new Script(js));
});
test('mobile catalogue holds every game in a thumbnail row with visible name',()=>{
 for(const v of ['#jeux #game-list>.game','#cmdCatalogSection .cmd-shop-card',
  '#cmdIntegratedGames .cmdg-card','grid-template-columns:92px minmax(0,1fr)',
  'max-height:77px!important','object-fit:cover!important','.cmd-shop-name','overflow-wrap:anywhere'])
   assert.ok(css.includes(v),v);
});
test('global duplicate sections are suppressed, not embedded server tools',()=>{
 for(const v of ['mods & workshop','jeux et decors hd','changer de jeu','boutique des jeux','fichiers','console'])
  assert.ok(js.includes(v),v);
 assert.match(js,/cmdPrimary/);
 assert.match(js,/cmdRenterProfile/);
 assert.match(js,/closest\(exclude\)/);
 assert.match(js,/window\.show\(page\.id\)/);
 assert.doesNotMatch(js,/fetch\(|\/api\/pc\/command|\/api\/rentals|localStorage|createServer/i);
});
test('Palworld official Workshop remains a single shortcut in selected server profile',()=>{
 assert.match(js,/cmdrpPalworldWorkshop/);
 assert.match(js,/cmdrpSelect/);
 assert.match(js,/cmdV8PalworldProfile/);
 assert.match(js,/Palworld · Steam Workshop/);
 assert.match(css,/#cmdrpPalworldWorkshop\[hidden\]/);
 assert.doesNotMatch(js,/button\.textContent='Palworld.*';.*side\.append/);
 const mods=load('mod-v2-ui.js');
 assert.match(mods,/https:\/\/steamcommunity\.com\/app\/1623730\/workshop\//);
 assert.match(mods,/PalModSettings\.ini/);
});
test('runtime: menu hides ONLY duplicate global links and Palworld only for selected Palworld',()=>{
 const modified=[];
 const makeButton=label=>({
  textContent:label,hidden:false,dataset:{},tabIndex:0,
  getAttribute:()=>null,setAttribute(name,value){modified.push(name+':'+value)},
  closest:()=>null,addEventListener(){},style:{removeProperty(){}}
 });
 const duplicated=makeButton('Mods & Workshop'),decor=makeButton('Jeux et décors HD'),account=makeButton('Mon compte');
 const nav={querySelectorAll:()=>[duplicated,decor,account]};
 const shop={id:'cmdCatalogSection'};
 const option={dataset:{cmdGame:'farming simulator 25'},textContent:'CMD Valhalla FS25'};
 const shortcut=makeButton('Palworld · Steam Workshop');
 const side={querySelector:()=>shortcut};
 const profile={querySelector:selector=>selector==='.cmdrp-sidebar'?side:null};
 const map={cmdSidebar:nav,cmdRenterProfile:profile,cmdrpSelect:{selectedOptions:[option],options:[option]},
 cmdrpTitle:{textContent:'CMD Valhalla FS25'},cmdrpPalworldWorkshop:shortcut,cmdCatalogSection:shop};
 const events={};
 const context={window:{},document:{
  readyState:'complete',body:{},getElementById:id=>map[id]||null,
  querySelectorAll:()=>[],addEventListener:(type,fn)=>events[type]=fn
 },location:{hash:''},history:{replaceState(){}},MutationObserver:undefined,
 requestAnimationFrame:fn=>fn(),URL,console};
 runInNewContext(js,context);
 assert.equal(duplicated.hidden,true);
 assert.equal(decor.hidden,true);
 assert.equal(account.hidden,false);
 assert.equal(shortcut.hidden,true,'No Palworld Workshop when FS25 is selected');
 option.dataset.cmdGame='palworld';option.textContent='My server';
 events.change({target:{id:'cmdrpSelect'}});
 assert.equal(shortcut.hidden,false);
 assert.equal(shortcut.disabled,false);
 option.dataset.cmdGame='dayz';
 events.change({target:{id:'cmdrpSelect'}});
 assert.equal(shortcut.hidden,true);
});
