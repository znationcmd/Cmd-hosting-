#!/usr/bin/env node
/**
 * Read-only check of actual public Railway service. No credentials or writes.
 * Frontend is served by the original Railway app; V11 live compatibility script is
 * deployed as a public env-backed asset, not the currently unused GitHub HTML/CSS.
 */
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base='https://cmd-hosting-web-production.up.railway.app';
async function get(route){
 const ctrl=new AbortController(),t=setTimeout(()=>ctrl.abort(),18000);
 try{const r=await fetch(base+route,{signal:ctrl.signal,redirect:'follow',
  headers:{'Accept':'text/html,text/javascript,application/json'},cache:'no-store'});
  return {status:r.status,body:await r.text(),type:r.headers.get('content-type')||''}}
 finally{clearTimeout(t)}
}
const sha=x=>createHash('sha256').update(x).digest('hex').slice(0,16);
let errors=0;
try{
 const index=await get('/');
 console.log('PUBLIC WEBSITE '+index.status+' bytes='+Buffer.byteLength(index.body));
 if(index.status!==200)errors++;
 const [publicJS,expected]=await Promise.all([
  get('/catalog-compat.js?v=20261027-live11'),
  readFile(new URL('../diagnostics/production-catalog-compat-20261027-v11.js',import.meta.url),'utf8')
 ]);
 const match=publicJS.status===200&&sha(publicJS.body)===sha(expected);
 console.log('V11 RAILWAY ASSET '+publicJS.status+' deployed='+sha(publicJS.body)+' expected='+sha(expected)+' exact_match='+match);
 if(!match)errors++;
 for(const flag of ['__CMD_HOSTING_RAILWAY_V11__','cmdRailwayCssV11','cmdrpRailwayPalworld','cmdCatalogSection']){
  const ok=publicJS.body.includes(flag);console.log('UI FEATURE '+flag+'='+ok);if(!ok)errors++;
 }
 for(const flag of ['__cmdHostingRailwayV10','cmdRailwayCssV10']){
  const absent=!publicJS.body.includes(flag);console.log('REMOVED V10 '+flag+'='+absent);if(!absent)errors++;
 }
 const catalog=await get('/api/catalog');
 let count=0;try{const j=JSON.parse(catalog.body);count=Array.isArray(j.games)?j.games.length:0}catch{}
 console.log('CATALOGUE '+catalog.status+' games='+count);
 if(catalog.status!==200||count<100)errors++;
 if(errors){console.error('CHECK FAILED: '+errors+' issues — frontend not confirmed live.');process.exitCode=2}
 else console.log('SUCCESS: V11 frontend deployed in actual Railway public asset; 100+ game API listings still available.');
}catch(e){console.error('NETWORK CHECK FAILED: '+e.message);process.exitCode=3}
