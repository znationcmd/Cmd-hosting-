import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext,Script} from 'node:vm';
const root=new URL('../web/public/',import.meta.url);
const read=name=>readFileSync(new URL(name,root),'utf8');
const html=read('index.html'),js=read('ui/cmd-server-first-v11.js'),css=read('ui/cmd-server-first-v11.css');
test('only V11 is loaded after V7; conflicting V8/V9/V10 overrides no longer execute',()=>{
 assert.doesNotThrow(()=>new Script(js));
 for(const name of ['cmd-server-first-v8.js','cmd-server-first-v9.js','cmd-live-mobile-palworld-v10.js'])assert.ok(!html.includes('src="/ui/'+name),name);
 for(const name of ['cmd-server-first-v8.css','cmd-server-first-v9.css','mobile-catalog-compact.css','cmd-mobile-catalog-fix.css','cmd-hosting-mobile-catalog-v3.css'])assert.ok(!html.includes('href="/ui/'+name),name);
 assert.match(html,/cmd-server-first-v11\.js\?v=20261027-v11/);
 assert.match(html,/cmd-server-first-v11\.css\?v=20261027-v11/);
 assert.ok(html.indexOf('cmd-server-first-v11.js')>html.indexOf('cmd-simplified-navigation-v7.js'));
 assert.ok(html.indexOf('cmd-server-first-v11.css')>html.indexOf('premium-16k.css'));
});
test('catalogue iPhone shows game names beside bounded cover images, not huge vertical pictures',()=>{
 for(const term of [
 '#cmdCatalogSection #cmdShopGrid','.cmd-shop-name',
 'grid-template-columns:94px minmax(0,1fr)','height:76px!important',
 'max-height:76px!important','object-fit:cover!important','overflow-wrap:anywhere!important',
 '@media(max-width:800px)'
 ])assert.ok(css.includes(term),term);
 assert.match(js,/showFullCatalog/);
 assert.match(js,/cmdCatalogSection/);
});
test('single menu preserves actions inside profile and does not create fake servers, mods or bills',()=>{
 for(const term of [
 'mods & workshop','jeux et decors hd','boutique des jeux','changer de jeu',
 'SAFE_ACTIONS','cmdRenterProfile','cmdrpSettings','cmdrpSelect',
 'window.CMDHostingOpenMods','window.CMDHostingOpenPalworldWorkshop',
 'steamcommunity.com\/app\/1623730\/workshop/'
 ])assert.ok(js.includes(term),term);
 assert.doesNotMatch(js,/\/api\/pc\/command|\/api\/rentals|fetch\s*\(|ServerAdminPassword|localStorage\.setItem|eval\(/);
});
test('runtime: duplicates hidden ONLY in main menu; Palworld shortcut only on selected Palworld profile',()=>{
 const navLink=label=>({
  textContent:label,dataset:{},hidden:false,disabled:false,tabIndex:0,
  getAttribute(){return null},setAttribute(){},
  closest(sel){return /cmdPrimary|cmdSidebar|cmdOriginalNav|#nav/.test(sel)?nav:null}
 });
 const redundant=navLink('Jeux et décors HD'),globalMods=navLink('Mods & Workshop'),account=navLink('Mon compte');
 const nav={querySelectorAll:()=>[redundant,globalMods,account]};
 const palworld={textContent:'Palworld · Steam Workshop',dataset:{},hidden:false,disabled:false,setAttribute(){}};
 const nativeMods={textContent:'Mods',dataset:{},hidden:false,title:''};
 const side={querySelectorAll:()=>[palworld],querySelector:()=>null};
 const profile={querySelector:s=>s==='.cmdrp-sidebar'?side:null};
 const option={dataset:{cmdGame:'farming simulator 25'},textContent:'CMD Valhalla FS25',value:'r25'};
 const selected={selectedOptions:[option]};
 const map={
  cmdPrimary:nav,cmdRenterProfile:profile,cmdrpSettings:{querySelectorAll:()=>[nativeMods]},
  cmdrpSelect:selected,cmdrpTitle:{textContent:'CMD FS25'},
  cmdrpDescription:{textContent:'Serveur hors ligne'},cmdCatalogSection:{id:'cmdCatalogSection'},
  cmdrpStatus:{textContent:''}
 };
 const listeners={};
 const ctx={
  window:{},document:{readyState:'complete',body:{},getElementById:id=>map[id]||null,
   querySelectorAll:()=>[nav],addEventListener:(k,cb)=>{listeners[k]=cb}},
  location:{hash:''},history:{replaceState(){}},requestAnimationFrame:cb=>cb(),
  MutationObserver:undefined,URL,console
 };
 runInNewContext(js,ctx);
 assert.equal(redundant.hidden,true);
 assert.equal(globalMods.hidden,true);
 assert.equal(account.hidden,false);
 assert.equal(nativeMods.hidden,false);
 assert.equal(nativeMods.textContent,'Mods & Workshop');
 assert.equal(palworld.hidden,true,'Workshop Palworld must not be attached to FS25');
 option.dataset.cmdGame='palworld';option.textContent='CMD Palworld';
 listeners.change({target:{id:'cmdrpSelect'}});
 assert.equal(palworld.hidden,false);
 assert.equal(palworld.disabled,false);
 option.dataset.cmdGame='dayz';option.textContent='CMD Namalsk';
 listeners.change({target:{id:'cmdrpSelect'}});
 assert.equal(palworld.hidden,true);
 assert.equal(nativeMods.hidden,false);
});
