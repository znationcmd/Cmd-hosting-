import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
const js=readFileSync(new URL('../web/public/catalog-ui.js',import.meta.url),'utf8');
test('ANOMALIA appears in CMD Hosting catalogue with CMD promo artwork',()=>{
 assert.match(js,/ANOMALIA PRIMEVAL OUTBOUNDUN/);
 assert.match(js,/\/anomalia-promo-preview\.jpg/);
 assert.match(js,/status:'review'/);
 assert.ok(statSync(new URL('../web/public/anomalia-promo-preview.jpg',import.meta.url)).size>1000);
});
test('ANOMALIA remains a pre-alpha listing and does not falsely enable rentals',()=>{
 assert.match(js,/La location de serveurs CMD Hosting pour ce jeu n’est pas encore disponible/);
});
