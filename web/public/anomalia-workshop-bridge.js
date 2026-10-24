(function(){
'use strict';
// This bridge prepares a handoff. CMD Hosting has no tested ANOMALIA dedicated server agent.
if(document.getElementById('cmdAnomaliaWorkshop'))return;
const host=document.getElementById('cmdMods');
if(!host)return;
const repo='https://github.com/znationcmd/ANOMALIA-PRIMEVAL-OUTBOUNDUN';
const panel=document.createElement('section');panel.id='cmdAnomaliaWorkshop';
panel.setAttribute('aria-label','ANOMALIA Workshop et CMD Hosting');
panel.innerHTML=
'<div class="awm-hero"><div><small>CMD HOSTING × ANOMALIA PRIMEVAL OUTBOUNDUN</small>'+
'<h2>ANOMALIA <em>WORKSHOP</em></h2>'+
'<p>Relie tes créations ANOMALIA Tools à un plan de mods pour CMD Hosting. Aucun serveur ANOMALIA n’est encore raccordé à un chargeur UE5 validé.</p>'+
'<div class="awm-actions"><a id="awmOpen" href="anomalia-tools://workshop">Ouvrir le Workshop Windows ↗</a>'+
'<a href="'+repo+'/releases/tag/anomalia-tools-latest" target="_blank" rel="noopener noreferrer">Installer ANOMALIA Tools ↗</a>'+
'<a href="'+repo+'" target="_blank" rel="noopener noreferrer">Projet ANOMALIA ↗</a></div></div>'+
'<aside><b>État de la liaison</b><p>Workshop local : <strong>Ouverture Windows</strong></p>'+
'<p>CMD Hosting : <strong>Import de manifeste</strong></p>'+
'<p>Chargement UE5 sur serveur : <strong class="awm-amber">Non connecté</strong></p>'+
'<p>Synchronisation serveur : <strong class="awm-amber">Non disponible</strong></p></aside></div>'+
'<div class="awm-bottom"><div><h3>Relier un mod au serveur</h3>'+
'<p>Dans ANOMALIA Workshop, sélectionne un mod compilé puis « CMD Hosting ↗ ». Importe le manifeste JSON ici : il est analysé dans ton navigateur, sans transfert de fichiers vers le serveur.</p>'+
'<label>Manifeste ANOMALIA Tools → CMD Hosting<input id="awmImport" type="file" accept=".json,application/json"></label>'+
'<p id="awmStatus" role="status">Aucun mod importé.</p><pre id="awmDetails"></pre></div>'+
'<aside><h3>Plan de configuration</h3><p id="awmServer">Aucun serveur ANOMALIA sélectionné.</p>'+
'<button id="awmExport" disabled type="button">Exporter le plan serveur JSON</button>'+
'<small>Le plan ne déploie ni plugin, ni archive, ni modification de serveur.</small></aside></div>';
host.prepend(panel);
const style=document.createElement('style');
style.textContent=[
'#cmdAnomaliaWorkshop{font:13px/1.6 system-ui,sans-serif;color:#ffe9e0;border-radius:13px;border:1px solid #a44b32;overflow:hidden;margin-bottom:22px;background:#110f15;box-shadow:0 0 28px #a82d222c}',
'#cmdAnomaliaWorkshop *{box-sizing:border-box}',
'#cmdAnomaliaWorkshop .awm-hero{padding:23px;min-height:210px;display:grid;grid-template-columns:minmax(0,1fr) 265px;gap:20px;background:linear-gradient(90deg,#0a0c14f2,#160c12df 54%,#0b0b11cc),url(/anomalia-promo-preview.jpg) center/cover}',
'#cmdAnomaliaWorkshop .awm-hero small{font-weight:800;letter-spacing:2px;color:#ffaa8b;font-size:10px}',
'#cmdAnomaliaWorkshop h2{font:bold clamp(27px,4vw,46px) Georgia,serif;color:#fce9d7;margin:6px 0;text-shadow:0 0 17px #e63b20}',
'#cmdAnomaliaWorkshop h2 em{color:#ff8564;font-style:normal}',
'#cmdAnomaliaWorkshop .awm-hero>div>p{max-width:600px;color:#edc5b5}',
'#cmdAnomaliaWorkshop .awm-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:15px}',
'#cmdAnomaliaWorkshop .awm-actions a{display:inline-flex;align-items:center;padding:9px 12px;border-radius:7px;color:#ffe5d5;text-decoration:none;border:1px solid #aa5c41;background:#2a1014;font-size:11px;font-weight:700}',
'#cmdAnomaliaWorkshop .awm-actions a:first-child{background:linear-gradient(#b93b28,#681615);border-color:#ff8060}',
'#cmdAnomaliaWorkshop .awm-hero aside{background:#070b11e8;border:1px solid #754437;border-radius:9px;padding:13px}',
'#cmdAnomaliaWorkshop aside p{font-size:11px;border-bottom:1px solid #513735;padding-bottom:7px}',
'#cmdAnomaliaWorkshop aside strong{color:#75e8af}',
'#cmdAnomaliaWorkshop aside strong.awm-amber{color:#ffb08f}',
'#cmdAnomaliaWorkshop .awm-bottom{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:25px;padding:21px;background:#101019}',
'#cmdAnomaliaWorkshop .awm-bottom h3{color:#fff;margin:0}',
'#cmdAnomaliaWorkshop .awm-bottom p{color:#d5b5ab;font-size:12px}',
'#cmdAnomaliaWorkshop .awm-bottom>aside{border-left:1px solid #754437;padding-left:17px}',
'#cmdAnomaliaWorkshop label{display:block;color:#f6b293;font-size:12px;margin-top:13px}',
'#cmdAnomaliaWorkshop input[type=file]{display:block;width:100%;margin-top:7px;background:#22121a;border:1px dashed #9c4e3b;color:#fff;padding:12px}',
'#cmdAnomaliaWorkshop #awmDetails{white-space:pre-wrap;overflow-wrap:anywhere;color:#ffc8aa}',
'#cmdAnomaliaWorkshop #awmExport{background:#a13424;border:1px solid #ff8466;color:white;border-radius:8px;padding:10px 12px;font-weight:800}',
'#cmdAnomaliaWorkshop #awmExport:disabled{opacity:.4;cursor:not-allowed}',
'#cmdAnomaliaWorkshop aside small{display:block;font-size:10px;color:#b89d9a;margin-top:11px}',
'@media(max-width:850px){#cmdAnomaliaWorkshop .awm-hero,#cmdAnomaliaWorkshop .awm-bottom{grid-template-columns:1fr}#cmdAnomaliaWorkshop .awm-bottom>aside{border:0;padding:0}}'
].join('\n');document.head.append(style);
const el=id=>document.getElementById(id);
let mod=null;
function validPath(x){return typeof x==='string'&&x.length>0&&x.length<251&&!x.includes('\\')&&
 !x.startsWith('/')&&!x.split('/').some(a=>!a||a==='..'||a==='.')&&!x.includes('\0');}
function readMod(d){
 if(!d||d.schema!=='anomalia-hosting-mod-handoff'||d.version!==1||
    d.target!=='cmd-hosting'||d.game!=='anomalia-primeval-outboundun'||
    d.source!=='anomalia-tools-workshop'||d.deployment?.ready!==false||
    d.deployment?.mode!=='manifest-only')throw Error('Ce fichier n’est pas un manifeste CMD Hosting ANOMALIA valide.');
 const m=d.mod||{};
 if(typeof m.id!=='string'||!/^[a-z0-9][a-z0-9-]{1,100}$/.test(m.id)||
    typeof m.plugin!=='string'||!/^ANM[A-Za-z0-9]{4,70}$/.test(m.plugin)||
    typeof m.name!=='string'||!m.name.trim()||m.name.length>90||
    typeof m.version!=='string'||! /^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/.test(m.version)||
    m.platform!=='Win64'||!Array.isArray(m.files)||m.files.length<2||m.files.length>2400)
   throw Error('Informations du mod incompatibles.');
 const seen=new Set();let bytes=0;
 for(const f of m.files){
  if(!f||!validPath(f.path)||seen.has(f.path)||!Number.isSafeInteger(f.size)||f.size<0||
     !/^[a-f0-9]{64}$/i.test(f.sha256||''))throw Error('Fichier ou SHA-256 invalide');
  seen.add(f.path);bytes+=f.size;if(bytes>512*1024*1024)throw Error('Mod trop volumineux');
 }
 if(m.totalBytes!==bytes||!seen.has(m.plugin+'.uplugin'))throw Error('Plugin Unreal incomplet');
 return {id:m.id,name:m.name,plugin:m.plugin,version:m.version,files:m.files,bytes};
}
function server(){
 const input=el('cvServer');if(!input?.value)return null;
 const label=input.selectedOptions?.[0]?.textContent||'';
 return /\banomalia\b/i.test(label)?{id:input.value,label:label.slice(0,120)}:null;
}
function refresh(){
 el('awmServer').textContent=server()?'Profil sélectionné : '+server().label+' (compatibilité non vérifiée)':
 'Aucun profil ANOMALIA sélectionné. Un plan sans serveur peut être exporté.';
 el('awmExport').disabled=!mod;
}
el('awmImport').onchange=async e=>{
 mod=null;refresh();el('awmDetails').textContent='';
 const f=e.target.files?.[0];if(!f)return;
 try{
  if(f.size>1024*1024)throw Error('Fichier supérieur à 1 Mo');
  mod=readMod(JSON.parse(await f.text()));
  el('awmDetails').textContent=mod.name+' · '+mod.version+'\nPlugin : '+mod.plugin+
   '\n'+mod.files.length+' fichiers · '+Math.ceil(mod.bytes/1024)+' Ko';
  el('awmStatus').textContent='Manifeste vérifié localement. Aucune installation serveur effectuée.';
 }catch(err){el('awmStatus').textContent='Import refusé : '+err.message;}
 refresh();
};
el('awmExport').onclick=()=>{
 if(!mod)return;
 const plan={schema:'cmd-hosting-anomalia-mod-plan',version:1,game:'anomalia-primeval-outboundun',
  server:server(),mods:[mod],state:'not-deployed',
  requirements:['Unreal Engine dedicated server','compatible ANOMALIA mod loader','CMD Hosting server agent'],
  note:'Plan uniquement ; aucun mod n’a été déployé.'};
 const url=URL.createObjectURL(new Blob([JSON.stringify(plan,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='CMD-Hosting-ANOMALIA-plan.json';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
 el('awmStatus').textContent='Plan téléchargé sur ton appareil. Le serveur n’a pas été modifié.';
};
el('awmOpen').onclick=()=>el('awmStatus').textContent='Ouverture locale demandée. ANOMALIA Tools 0.2.4 ou plus récent doit être installé sur Windows.';
el('cvServer')?.addEventListener('change',refresh);refresh();
})();
