import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script,runInNewContext} from 'node:vm';
const load=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=load('web/public/ui/cmd-live-mobile-palworld-v10.js');
const backup=load('diagnostics/production-catalog-compat-20261026.js');
test('backed-up live production script and additive patch parse unchanged',()=>{
 assert.doesNotThrow(()=>new Script(backup));
 assert.doesNotThrow(()=>new Script(source));
 assert.ok(backup.length>20000);
 assert.doesNotMatch(source,/\/api\/pc\/command|\/api\/rentals|createServer\(|deleteServer\(|localStorage\.setItem|eval\(/);
});
test('iPhone legacy catalogue and full catalogue images bounded and game labels visible',()=>{
 for(const v of ['#jeux #game-list>.game>img','#cmdCatalogSection .cmd-shop-cover img','width:90px!important',
 'height:74px!important','object-fit:cover!important','.cmd-shop-name','overflow-wrap:anywhere'])
 assert.ok(source.includes(v),v);
});
test('menu hides only global duplicates, keeps profile actions, and routes Jeux to full catalogue',()=>{
 for(const v of ['mods & workshop','jeux et decors hd','boutique des jeux',
 'cmdRenterProfile','cmdOriginalNav','protectedAreas','full.id','cmdCatalogSection','stopImmediatePropagation'])
 assert.ok(source.includes(v),v);
});
test('Palworld Workshop is visible from profile even when selected server is FS25',()=>{
 const created=[],attrs={};
 const sidebar={append(e){created.push(e)},querySelector(s){return s==='#cmdrpCreate'?createButton:null}};
 const createButton={before(e){created.push(e)}};
 const profile={querySelector(s){return s==='.cmdrp-sidebar'?sidebar:null}};
 const firstDup={textContent:'Mods & Workshop',dataset:{},hidden:false,
  getAttribute(){return ''},closest(){return null},setAttribute(n,v){attrs[n]=v}};
 const nav={querySelectorAll(){return [firstDup]}};
 const map={cmdRenterProfile:profile,cmdSidebar:nav,cmdrpSelect:{selectedOptions:[{textContent:'CMD Valhalla FS25'}]},cmdCatalogSection:{id:'cmdCatalogSection'}};
 const nodes={};
 const events={};
 const doc={
  readyState:'complete',body:{},
  head:{append(e){nodes[e.id]=e}},
  getElementById:id=>map[id]||nodes[id]||null,
  createElement:tag=>({tagName:tag,style:{},dataset:{},addEventListener(type,fn){this[type]=fn},
   setAttribute(){},before(){},append(){}}),
  querySelectorAll:selector=>selector.includes('#cmdSidebar')?[nav]:[],
  addEventListener:(name,fn)=>{events[name]=fn}
 };
 let open=0;
 const win={__cmdHostingMobileV10:false,addEventListener(){},open(){open++}};
 const context={window:win,document:doc,requestAnimationFrame:fn=>fn(),
  MutationObserver:undefined,location:{hash:''},history:{replaceState(){}},console,URL};
 runInNewContext(source,context);
 assert.equal(firstDup.hidden,true);
 assert.equal(created.length,1);
 assert.equal(created[0].id,'cmdrpAlwaysPalworld');
 assert.equal(created[0].hidden,false);
 assert.equal(created[0].disabled,false);
 created[0].click();
 assert.equal(open,1);
});
test('real future static source includes v10 after v9, no changes to backend routes',()=>{
 const html=load('web/public/index.html');
 assert.ok(html.includes('/ui/cmd-live-mobile-palworld-v10.js'));
 assert.ok(html.indexOf('cmd-live-mobile-palworld-v10.js')>html.indexOf('cmd-server-first-v9.js'));
});

test('production embedded patch stays below Railway 32KB variable limit and does not replace backend',()=>{
 const embed=load('web/public/ui/cmd-live-v10-railway-embed.js');
 assert.ok(backup.length+embed.length+2<32768);
 assert.doesNotThrow(()=>new Script(backup+'\n'+embed));
 assert.match(embed,/cmdrpRailwayPalworld/);
 assert.match(embed,/cmd-shop-cover img/);
 assert.match(embed,/#cmdCatalogSection/);
 assert.doesNotMatch(embed,/\/api\/pc\/command|\/api\/rentals|localStorage\.setItem|ServerAdminPassword/);
});
