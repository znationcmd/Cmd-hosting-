#!/usr/bin/env node
// Build SHA256 manifest for the exact GitHub commit. CI only; never shipped as game data.
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
const {allowed,validate}=await import('./updater.mjs');
const root=path.resolve(import.meta.dirname,'..');
const commit=process.env.GITHUB_SHA||spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8',cwd:root}).stdout.trim();
if(!/^[a-f0-9]{40}$/i.test(commit))throw Error('Commit Git absent');
const entries=[];
async function walk(dir){
 for(const ent of await readdir(path.join(root,dir),{withFileTypes:true})){
  const name=(dir?dir+'/':'')+ent.name;
  if(ent.isDirectory()){await walk(name);continue}
  if(!ent.isFile()||!allowed(name))continue;
  const data=await readFile(path.join(root,name));
  entries.push({path:name,size:data.length,sha256:createHash('sha256').update(data).digest('hex')});
 }
}
for(const dir of ['local-panel','dayz-worlds','asa-astraeos','scripts'])await walk(dir);
for(const name of ['DEMARRER-CMD-HOSTING-FICHIERS.cmd','CMD-5-SERVEURS-UN-SEUL.cmd']){
 const data=await readFile(path.join(root,name));
 entries.push({path:name,size:data.length,sha256:createHash('sha256').update(data).digest('hex')});
}
entries.sort((a,b)=>a.path.localeCompare(b.path,'en'));
const manifest=validate({schema:'cmdhosting-local-update-v1',commit,files:entries});
await writeFile(path.join(root,'update-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('CMD Hosting update manifest',commit,entries.length,'verified source files');
