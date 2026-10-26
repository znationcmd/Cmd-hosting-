#!/usr/bin/env node
/**
 * CMD Hosting - public, unauthenticated, read-only frontend deployment check.
 * Never reads credentials, rental records, cookies, tokens or private user accounts.
 */
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base='https://cmd-hosting-web-production.up.railway.app';
const files=[
 ['/ui/cmd-simplified-navigation-v7.js','web/public/ui/cmd-simplified-navigation-v7.js'],
 ['/ui/cmd-simplified-mobile-v7.css','web/public/ui/cmd-simplified-mobile-v7.css'],
 ['/catalog-compat.js','web/public/catalog-compat.js'],
 ['/ui/cmd-server-first-v8.js','web/public/ui/cmd-server-first-v8.js'],
 ['/ui/cmd-server-first-v8.css','web/public/ui/cmd-server-first-v8.css']
];
async function get(route){
 const control=new AbortController();
 const timer=setTimeout(()=>control.abort(),18000);
 try{const response=await fetch(base+route,{signal:control.signal,redirect:'follow',headers:{'Accept':'text/html, text/javascript, text/css, application/json'}});
  return {status:response.status,body:await response.text(),contentType:response.headers.get('content-type')||''};}
 finally{clearTimeout(timer)}
}
const sha=x=>createHash('sha256').update(x).digest('hex').slice(0,16);
let differences=0;
try{
 const index=await get('/');
 console.log('PRODUCTION HTML: '+index.status+', bytes='+Buffer.byteLength(index.body));
 if(index.status!==200){differences++;console.error('FAIL: Homepage HTTP '+index.status);}
 for(const [route,file] of files){
  const local=await readFile(new URL('../'+file,import.meta.url),'utf8');
  const result=await get(route);
  const listed=index.body.includes(route.split('/').pop());
  const equal=result.status===200 && sha(result.body)===sha(local);
  console.log(route+' HTTP '+result.status+' | in_HTML='+listed+' | deployed='+sha(result.body)+' | GitHub='+sha(local)+' | match='+equal);
  if(!equal||!listed){
   differences++;
   console.error('NOT DEPLOYED: GitHub frontend differs from Railway at '+route+'. Backend has NOT been overwritten.');
  }
 }
 try{
  const cat=await get('/api/catalog');
  const x=JSON.parse(cat.body);
  const count=Array.isArray(x.games)?x.games.length:0;
  console.log('CATALOGUE HTTP '+cat.status+' entries='+count);
  if(cat.status!==200||count<10)differences++;
 }catch(error){console.error('CATALOGUE read-only check: '+error.message);differences++}
 if(differences)process.exitCode=2;
 else console.log('SUCCESS: public interface and catalogue are synced with GitHub.');
}catch(error){console.error('Railway unreachable for deployment check: '+error.message);process.exitCode=3;}
