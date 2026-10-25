import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,readdir,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
const base=await mkdtemp(join(tmpdir(),'cmd-hosting-real-files-'));
const root=join(base,'CMD-Servers'),state=join(base,'private-state');
const dayz=join(root,'dayzPersonal','dayz'),ark=join(root,'arkOwner','ark-asa'),arma=join(root,'armaServer');
await mkdir(join(dayz,'mpmissions','dayzOffline.chernarusplus','db'),{recursive:true});
await mkdir(join(dayz,'mpmissions','dayzOffline.enoch','db'),{recursive:true});
await mkdir(join(ark,'ShooterGame','Binaries','Win64'),{recursive:true});
await mkdir(join(ark,'ShooterGame','Saved','Config','WindowsServer'),{recursive:true});
await mkdir(arma,{recursive:true});
await writeFile(join(dayz,'DayZServer_x64.exe'),'STUB ONLY (not a playable game)');
await writeFile(join(dayz,'serverDZ.cfg'),'hostname = "Test";\nclass Missions {class DayZ {template = "dayzOffline.chernarusplus";};};\n');
for(const mission of ['dayzOffline.chernarusplus','dayzOffline.enoch']){
 const dir=join(dayz,'mpmissions',mission);
 await writeFile(join(dir,'init.c'),'void main() {}');
 await writeFile(join(dir,'db','types.xml'),'<types/>');
}
await writeFile(join(ark,'ShooterGame','Binaries','Win64','ArkAscendedServer.exe'),'STUB ONLY');
await writeFile(join(ark,'ShooterGame','Saved','Config','WindowsServer','Game.ini'),'[ServerSettings]\nDifficultyOffset=1\n');
await writeFile(join(arma,'ArmaReforgerServer.exe'),'STUB ONLY');
await writeFile(join(arma,'config.json'),'{"game":{"scenarioId":"original"}}\n');
await mkdir(join(root,'custom','custom-rpg'),{recursive:true});
await writeFile(join(root,'custom','custom-rpg','settings.ini'),'[Game]\nMode=RP\n');
await writeFile(join(dayz,'auth.json'),'private credential');
process.env.CMD_SERVERS_ROOT=root;
process.env.CMD_FILES_STATE_DIR=state;
process.env.CMD_FILES_LISTEN_HOST='127.0.0.1';
process.env.CMD_FILES_PORT=String(41000+process.pid%14000);
const {start,normRel,within}=await import('./server.mjs');
const server=await start();
const url='http://127.0.0.1:'+server.address().port;
const token=(await readFile(join(state,'access-token.txt'),'utf8')).trim();
test.after(async()=>{await new Promise(resolve=>server.close(resolve));await rm(base,{recursive:true,force:true})});
async function call(route,{method='GET',body=null,auth=token,headers={}}={}){
 const result=await fetch(url+route,{method,body,headers:{authorization:auth?'Bearer '+auth:'',...headers}});
 const txt=await result.text();
 let json;try{json=JSON.parse(txt)}catch{}
 return {status:result.status,data:json,headers:result.headers,body:txt};
}
const id=encodeURIComponent;
test('host-only server, railway false, mandatory auth and protected headers',async()=>{
 let r=await call('/api/servers',{auth:''});assert.equal(r.status,401);
 r=await call('/api/status');assert.equal(r.status,200);
 assert.equal(r.data.railway,false);assert.equal(r.data.mode,'local-host');
 r=await call('/');assert.equal(r.status,200);assert.match(r.body,/Un jeu. Son serveur. Ses fichiers/);
 assert.match(r.headers.get('content-security-policy')||'',/frame-ancestors/);
});
test('auto-detect genuine root folders for DayZ, ARK and Arma from disk, never generated demo folders',async()=>{
 const r=await call('/api/servers');assert.equal(r.status,200);
 assert.ok(r.data.servers.some(v=>v.game==='dayz'&&v.installed));
 assert.ok(r.data.servers.some(v=>v.game==='ark-asa'&&v.installed));
 assert.ok(r.data.servers.some(v=>v.game==='arma-reforger'&&v.installed));
 assert.equal(r.data.servers.length,3);
});
test('real file listing opens installed DayZ mpmissions and ARK configs independently',async()=>{
 const servers=(await call('/api/servers')).data.servers;
 const dz=servers.find(v=>v.game==='dayz'),a=servers.find(v=>v.game==='ark-asa');
 const d=(await call('/api/files?id='+id(dz.id)+'&path=mpmissions')).data;
 assert.equal(d.realFiles,true);assert.ok(d.files.some(v=>v.name==='dayzOffline.chernarusplus'&&v.type==='folder'));
 assert.ok(!(await call('/api/files?id='+id(dz.id))).data.files.some(v=>v.name==='auth.json'));
 const arkFiles=(await call('/api/files?id='+id(a.id)+'&path=ShooterGame/Saved/Config/WindowsServer')).data.files;
 assert.ok(arkFiles.some(v=>v.name==='Game.ini'));
 const disallowed=await call('/api/files?id='+id(dz.id)+'&path=ShooterGame');
 assert.notEqual(disallowed.status,200);
});
test('read, edit with explicit stopped confirmation, atomic save and out-of-game backup',async()=>{
 const dz=(await call('/api/servers')).data.servers.find(v=>v.game==='dayz');
 const path='serverDZ.cfg';
 let r=await call('/api/file?id='+id(dz.id)+'&path='+id(path));
 assert.match(r.data.content,/dayzOffline.chernarusplus/);
 r=await call('/api/file?id='+id(dz.id)+'&path='+id(path),{method:'PUT',body:JSON.stringify({content:'template = "dayzOffline.enoch";'}) ,headers:{'content-type':'application/json'}});
 assert.equal(r.status,400);
 r=await call('/api/file?id='+id(dz.id)+'&path='+id(path),{method:'PUT',body:JSON.stringify({content:'template = "dayzOffline.enoch";',confirmStopped:true}),headers:{'content-type':'application/json'}});
 assert.equal(r.status,200);
 assert.equal(await readFile(join(dayz,path),'utf8'),'template = "dayzOffline.enoch";');
 const backups=await readdir(join(state,'backups',dz.id));
 assert.ok(backups.some(v=>v.startsWith('serverDZ.cfg.')&&v.endsWith('.bak')));
});
test('DayZ map lists only installed missions and modifies existing serverDZ.cfg, never creates fake terrain',async()=>{
 const dz=(await call('/api/servers')).data.servers.find(v=>v.game==='dayz');
 const r=await call('/api/maps?id='+id(dz.id));
 assert.equal(r.status,200);
 assert.deepEqual(new Set(r.data.maps.map(x=>x.id)),new Set(['dayzOffline.chernarusplus','dayzOffline.enoch']));
 let res=await call('/api/maps?id='+id(dz.id),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({map:'dayzOffline.chernarusplus'})});
 assert.equal(res.status,400);
 res=await call('/api/maps?id='+id(dz.id),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({map:'dayzOffline.chernarusplus',confirmStopped:true})});
 assert.equal(res.status,200);assert.equal(res.data.restartRequired,true);
 assert.match(await readFile(join(dayz,'serverDZ.cfg'),'utf8'),/dayzOffline.chernarusplus/);
});
test('register arbitrary catalogue game only with existing directory inside authorized install root',async()=>{
 const custom=join(root,'custom','custom-rpg');
 let r=await call('/api/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Mon jeu non catalogue',game:'my-future-game',root:custom})});
 assert.equal(r.status,201);
 assert.ok((await call('/api/servers')).data.servers.some(v=>v.id===r.data.id&&v.installed===false));
 const installed=(await call('/api/files?id='+id(r.data.id))).data;
 assert.ok(installed.files.some(v=>v.name==='settings.ini'));
 r=await call('/api/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Interdit',game:'dayz',root:state})});
 assert.equal(r.status,403);
});
test('reject traversal, absolute paths, hidden authentication, unauthorised binary writes',async()=>{
 const dz=(await call('/api/servers')).data.servers.find(v=>v.game==='dayz');
 for(const path of ['../serverDZ.cfg','/etc/passwd','C:\\Windows\\System32','a/../../b','auth.json']){
  const r=await call('/api/file?id='+id(dz.id)+'&path='+id(path));
  assert.ok([400,403].includes(r.status),'unexpected status for '+path+': '+r.status);
 }
 const binary=await call('/api/file?id='+id(dz.id)+'&path=DayZServer_x64.exe',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({confirmStopped:true,content:'REPLACE'})});
 assert.equal(binary.status,400);
 assert.match(await readFile(join(dayz,'DayZServer_x64.exe'),'utf8'),/STUB ONLY/);
 assert.throws(()=>normRel('..\\private'));
 assert.equal(within(dayz,state),false);
 if(process.platform!=='win32'){
  await symlink(state,join(dayz,'shortcut'));
  assert.equal((await call('/api/files?id='+id(dz.id)+'&path=shortcut')).status,403);
 }
});
test('upload new configuration only and preserve existing config',async()=>{
 const dz=(await call('/api/servers')).data.servers.find(v=>v.game==='dayz');
 const route='/api/upload?id='+id(dz.id)+'&path=custom.cfg';
 let r=await call(route,{method:'POST',headers:{'content-type':'application/octet-stream'},body:Buffer.from('created = true;')});
 assert.equal(r.status,201);
 r=await call(route,{method:'POST',headers:{'content-type':'application/octet-stream'},body:Buffer.from('overwrite')});
 assert.equal(r.status,409);
 assert.equal(await readFile(join(dayz,'custom.cfg'),'utf8'),'created = true;');
});


test('DayZ creator shows actual Windows eligibility and never invents a running server',async()=>{
 const r=await call('/api/install/dayz');
 assert.equal(r.status,200);
 assert.equal(r.data.allowed,process.platform==='win32');
 assert.equal(r.data.localBrowserRequired,true);
 assert.equal(r.data.localBrowser,true);
 assert.equal(r.data.installerAvailable,true);
 assert.equal(r.data.realGameFilesOnly,true);
 assert.equal(r.data.filesPresent,false);
 const noAuth=await call('/api/install/dayz',{method:'POST',auth:'',headers:{'content-type':'application/json'},body:'{}'});
 assert.equal(noAuth.status,401);
 const refusal=await call('/api/install/dayz',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({confirmed:false,publisherTermsAccepted:false})});
 assert.equal(refusal.status,process.platform==='win32'?400:422);
 const after=await call('/api/servers');
 assert.equal(after.data.servers.length,3);
});
test('actual create action appears in the user interface with conditional consent',async()=>{
 const [ui,js]=await Promise.all([
  readFile(new URL('./index.html',import.meta.url),'utf8'),
  readFile(new URL('./app.js',import.meta.url),'utf8')
 ]);
 assert.match(ui,/id="createDayz"/);
 assert.match(ui,/id="dayzTerms"/);
 assert.match(js,/api\/install\/dayz/);
 assert.match(js,/publisherTermsAccepted:true/);
 assert.match(js,/status\.localBrowser/);
});
