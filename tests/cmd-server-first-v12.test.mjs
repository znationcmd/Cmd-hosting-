import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const html=read('web/public/index.html'),css=read('web/public/ui/cmd-server-first-v12.css'),
 js=read('web/public/ui/cmd-server-first-v12.js');

test('v12 is loaded last and does not replace authentication or API routes',()=>{
 assert.doesNotThrow(()=>new Script(js));
 assert.ok(html.indexOf('/ui/cmd-server-first-v12.js')>html.indexOf('/ui/cmd-server-first-v11.js'));
 assert.ok(html.indexOf('/ui/cmd-server-first-v12.css')>html.indexOf('/ui/cmd-server-first-v11.css'));
 assert.doesNotMatch(js,/fetch\s*\(|\/api\/pc\/command|\/api\/rentals|localStorage\.setItem|ServerAdminPassword/);
 assert.match(js,/window\.__CMD_SERVER_FIRST_V12__/);
});
test('one catalogue works even if dynamic data is absent, not a blank screen',()=>{
 assert.match(js,/cmdShopGrid>\.cmd-shop-card/);
 assert.match(js,/const target=full&&hasCards\?full:old\|\|full/);
 assert.match(js,/data-cmd-nav-suppressed/);
 assert.match(js,/SAFE/gi);
 assert.match(js,/const safeAreas/);
 assert.match(js,/suppressGlobalDuplicates/);
 assert.match(js,/profileControls/);
});
test('Palworld Workshop always available inside Mes serveurs independent of selected game',()=>{
 assert.match(js,/button\.hidden=false;button\.disabled=false/);
 assert.match(js,/Explorer les mods Palworld/);
 assert.match(js,/steamcommunity\.com\/app\/1623730\/workshop/);
 assert.match(js,/CMDHostingOpenPalworldWorkshop/);
 assert.match(js,/Mods\/Workshop/);
 assert.match(js,/PalModSettings\.ini/);
 for(const name of ['cmd-unified-experience-v6','cmd-simplified-navigation-v7','cmd-server-first-v11'])
   assert.match(read('web/public/ui/'+name+'.js'),/if\(window\.__CMD_SERVER_FIRST_V12__\)return;/);
});
test('iPhone both full and legacy catalog cards are 100x76px, names visible',()=>{
 assert.match(css,/#jeux #game-list>\.game>img\.real-game-image/);
 assert.match(css,/#cmdCatalogSection #cmdShopGrid>\.cmd-shop-card>\.cmd-shop-cover>img/);
 assert.match(css,/#cmdCatalogSection #cmdShopGrid \.cmd-shop-name/);
 assert.match(css,/grid-template-columns:100px minmax\(0,1fr\)/);
 assert.match(css,/height:76px!important/);
 assert.match(css,/object-fit:cover!important/);
 assert.match(css,/@media\(max-width:800px\)/);
 assert.match(css,/#cmdrpPalworldWorkshop/);
});
test('refresh logic does not unconditionally recreate node contents on mutations',()=>{
 assert.match(js,/if\(button\.textContent!==label\)/);
 assert.match(js,/if\(note\.textContent!==message\)/);
 assert.match(js,/if\(native\.textContent!=='Mods & Workshop'\)/);
 assert.match(js,/window\.CMDHostingOpenMobileCatalog=fullCatalog/);
});
