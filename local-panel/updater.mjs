#!/usr/bin/env node
// CMD Hosting local panel updater. Node 22+, official GitHub release only.
// Called BEFORE starting server.mjs, never changes game installs/saves/secrets.
import {readFile,writeFile,readdir,mkdir,rename,copyFile,rm,lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const RELEASE='https://api.github.com/repos/znationcmd/Cmd-hosting-/releases/tags/cmd-hosting-local-latest';
const RAW='https://raw.githubusercontent.com/znationcmd/Cmd-hosting-';
const VERSION=path.join(ROOT,'.cmdhosting-local-version.json');
const HEADS=['local-panel/','dayz-worlds/','asa-astraeos/','scripts/'];
const LAUNCHERS=['DEMARRER-CMD-HOSTING-FICHIERS.cmd','CMD-5-SERVEURS-UN-SEUL.cmd'];
const EXCLUDE=/(\.test\.mjs$|^local-panel\/make-update-manifest\.mjs$|\/(?:backups|Saved|SavedArks|saves|profiles|secrets)\/)/i;
const SHA=/^[a-f0-9]{40}$/i,HASH=/^[a-f0-9]{64}$/i;
const sha=b=>createHash('sha256').update(b).digest('hex');
export function allowed(filename){
 if(typeof filename!=='string'||filename.length>230||EXCLUDE.test(filename))return false;
 const bits=filename.split('/');
 if(bits.some(p=>!p||p==='..'||p==='.'||p.startsWith('.')||!/^[a-zA-Z0-9_.-]+$/.test(p)))return false;
 return LAUNCHERS.includes(filename)||(HEADS.some(p=>filename.startsWith(p))&&/\.(?:cmd|ps1|mjs|js|html|css|json|ini|md)$/.test(filename));
}
export function validate(manifest){
 if(manifest?.schema!=='cmdhosting-local-update-v1'||!SHA.test(manifest.commit)||
  !Array.isArray(manifest.files)||manifest.files.length<15||manifest.files.length>100)throw Error('Manifeste invalide.');
 const unique=new Set();
 for(const item of manifest.files){
  if(!allowed(item.path)||!HASH.test(item.sha256)||!Number.isSafeInteger(item.size)||
    item.size<1||item.size>2_500_000||unique.has(item.path))throw Error('Fichier non fiable : '+item.path);
  unique.add(item.path);
 }
 if(!unique.has('local-panel/updater.mjs')||!unique.has('local-panel/server.mjs')||
    !unique.has('DEMARRER-CMD-HOSTING-FICHIERS.cmd'))throw Error('Manifeste incomplet.');
 return manifest;
}
async function fetchBytes(url,{limit=2_500_000,accept='*/*'}={}){
 const res=await fetch(url,{signal:AbortSignal.timeout(16_000),
  headers:{'user-agent':'CMDHostingLocal/1.1','accept':accept}});
 if(!res.ok)throw Error('GitHub HTTP '+res.status);
 const declared=Number(res.headers.get('content-length')||0);
 if(declared>limit)throw Error('Téléchargement trop volumineux.');
 const data=Buffer.from(await res.arrayBuffer());
 if(data.length>limit)throw Error('Téléchargement trop volumineux.');
 return data;
}
export async function published(){
 const rel=JSON.parse((await fetchBytes(RELEASE,{limit:500_000,accept:'application/vnd.github+json'})).toString('utf8'));
 const asset=rel.assets?.find(a=>a.name==='update-manifest.json');
 if(!asset?.browser_download_url||new URL(asset.browser_download_url).hostname!=='github.com')
  throw Error('Canal officiel non publié.');
 return validate(JSON.parse((await fetchBytes(asset.browser_download_url,{limit:400_000})).toString('utf8')));
}
async function oldCommit(){
 try{return JSON.parse(await readFile(VERSION,'utf8')).commit||null}
 catch(e){if(e.code==='ENOENT')return null;throw e}
}
async function fileHash(file){
 try{return sha(await readFile(file))}
 catch(e){if(e.code==='ENOENT')return null;throw e}
}
async function noSymlinks(full){
 const rel=path.relative(ROOT,full);
 if(rel.startsWith('..')||path.isAbsolute(rel)||!rel)throw Error('Écriture hors application interdite.');
 let segment=ROOT;
 for(const piece of rel.split(path.sep)){
  segment=path.join(segment,piece);
  try{if((await lstat(segment)).isSymbolicLink())throw Error('Lien symbolique interdit.')}
  catch(e){if(e.code!=='ENOENT')throw e}
 }
}
export async function apply(manifest){
 validate(manifest);
 const pending=[];
 for(const ent of manifest.files){
  const target=path.join(ROOT,ent.path);
  await noSymlinks(target);
  if(await fileHash(target)!==ent.sha256)pending.push(ent);
 }
 if(!pending.length){
  await writeFile(VERSION,JSON.stringify({commit:manifest.commit,at:new Date().toISOString()})+'\n');
  return {files:0,updated:false};
 }
 // Download and hash-check EVERY file before modifying a working installation.
 const work=path.join(ROOT,'.cmdhosting-update',manifest.commit);
 await rm(work,{recursive:true,force:true});
 const stage=path.join(work,'staged'),backup=path.join(work,'previous');
 await mkdir(stage,{recursive:true});
 await mkdir(backup,{recursive:true});
 const done=[];
 try{
  for(const ent of pending){
   const url=RAW+'/'+manifest.commit+'/'+ent.path.split('/').map(encodeURIComponent).join('/');
   const bytes=await fetchBytes(url);
   if(bytes.length!==ent.size||sha(bytes)!==ent.sha256)throw Error('Empreinte invalide : '+ent.path);
   const target=path.join(stage,ent.path);
   await mkdir(path.dirname(target),{recursive:true});
   await writeFile(target,bytes,{flag:'wx'});
  }
  try{
   for(const ent of pending){
    const destination=path.join(ROOT,ent.path);
    await noSymlinks(destination);
    const original=await fileHash(destination);
    const copy=path.join(backup,ent.path);
    if(original){
     await mkdir(path.dirname(copy),{recursive:true});
     await copyFile(destination,copy);
    }
    await mkdir(path.dirname(destination),{recursive:true});
    const replacement=destination+'.cmdhosting-next';
    await copyFile(path.join(stage,ent.path),replacement);
    await rename(replacement,destination);
    done.push({destination,previous:original?copy:null});
   }
   await writeFile(VERSION,JSON.stringify({commit:manifest.commit,at:new Date().toISOString()})+'\n');
  }catch(e){
   for(const file of done.reverse()){
    if(file.previous)await copyFile(file.previous,file.destination);
    else await rm(file.destination,{force:true});
   }
   throw e;
  }
  return {files:pending.length,updated:true};
 }finally{await rm(work,{recursive:true,force:true}).catch(()=>{})}
}
export async function checkAndApply(){
 const rel=await published();
 if((await oldCommit())===rel.commit)return {updated:false,files:0,reason:'a-jour'};
 return apply(rel);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const result=await checkAndApply();
  console.log('[CMD Hosting] Mise à jour : '+(result.updated?result.files+' fichiers vérifiés et actualisés':'déjà à jour'));
 }catch(e){
  // The LOCAL panel must start and stay usable offline, even when GitHub is down.
  console.warn('[CMD Hosting] Mise à jour indisponible : '+e.message);
 }
}
