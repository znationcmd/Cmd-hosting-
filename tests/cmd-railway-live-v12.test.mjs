import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const base=new URL('../diagnostics/',import.meta.url);
const old=readFileSync(new URL('production-catalog-compat-20261027-v11.js',base),'utf8');
const live=readFileSync(new URL('production-catalog-compat-20261027-v12.js',base),'utf8');
test('production V12 is syntactically valid and keeps the exact running public frontend prefix',()=>{
 assert.doesNotThrow(()=>new Script(live));
 const marker='/* CMD Hosting live V11:';
 const end=old.indexOf(marker);
 assert.ok(end>25000);
 assert.equal(live.slice(0,end),old.slice(0,end));
 assert.ok(Buffer.byteLength(live,'utf8')<32768,'Railway env variable must remain under 32 KiB');
 assert.doesNotMatch(live,/__CMD_HOSTING_RAILWAY_V11__/);
 assert.match(live,/__cmdHostingRailwayV12/);
});
test('production V12 has compact legacy and full iPhone catalogue and fallback routing',()=>{
 assert.match(live,/#jeux #game-list/);
 assert.match(live,/#cmdCatalogSection #cmdShopGrid/);
 assert.match(live,/grid-template-columns:90px minmax\(0,1fr\)/);
 assert.match(live,/height:74px!important/);
 assert.match(live,/object-fit:cover!important/);
 assert.match(live,/\.cmd-shop-name/);
 assert.match(live,/querySelector\('#cmdShopGrid>\.cmd-shop-card'\)/);
});
test('production Palworld Workshop is visible inside Mes serveurs without requiring installed game',()=>{
 assert.match(live,/id='cmdrpRailwayPalworld'/);
 assert.match(live,/steamcommunity\.com\/app\/1623730\/workshop/);
 assert.match(live,/const area=\$\('cmdRenterProfile'\)/);
 assert.doesNotMatch(live,/b\.hidden=!isPalworld/);
 assert.doesNotMatch(live,/\.remove\(\)/);
});
