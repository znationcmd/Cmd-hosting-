/* CMD Hosting Fichiers — simple, native, dependency-free browser client.
   Secret only held in this browser tab memory, not URL or localStorage. */
'use strict';
const $=id=>document.getElementById(id);
let token='',servers=[],current=null,folder='',editing='';
function element(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n}
function show(id,active){$(id).hidden=!active}
function notice(message,error=false){const n=$('alert');n.textContent=message;n.className=error?'error':'good';}
async function api(url,options={}){
 const headers={authorization:'Bearer '+token,...(options.headers||{})};
 const res=await fetch(url,{...options,headers,cache:'no-store'});
 if(!res.ok){
  let message;try{message=(await res.json()).error}catch{message='Erreur HTTP '+res.status}
  throw Error(message||('HTTP '+res.status));
 }
 if(options.raw)return res;
 return res.json();
}
function bytes(n){if(n===null||n===undefined)return '—';if(n<1024)return n+' o';if(n<1048576)return (n/1024).toFixed(1)+' Ko';return (n/1048576).toFixed(1)+' Mo'}
async function safe(job){try{await job()}catch(e){notice(e.message,true)}}
async function refresh(){
 const doc=await api('/api/servers');servers=doc.servers;
 const list=$('serverList');list.replaceChildren();
 if(!servers.length){list.append(element('p','empty','Aucun serveur encore installé ni associé sur cette machine.'));show('explorer',false);show('maps',false);show('palworldWorkshop',false);show('editor',false);return}
 for(const x of servers){
  const b=element('button','serverItem'+(current?.id===x.id?' active':''));
  const name=element('b','',x.name),info=element('small','',x.installed?'Dossiers réels · serveur trouvé':'Dossier associé · installation non vérifiée');
  const pill=element('span','dot '+(x.installed?'ready':'pending'),'●');
  b.append(pill,name,info);b.addEventListener('click',()=>safe(()=>select(x.id)));list.append(b);
 }
 if(current){
  const updated=servers.find(s=>s.id===current.id);
  if(updated){current=updated;await select(current.id,false)}else current=null;
 }
}
async function select(id,restart=true){
 current=servers.find(s=>s.id===id);
 if(!current)throw Error('Serveur inconnu');
 document.querySelectorAll('.serverItem').forEach((button,i)=>button.classList.toggle('active',servers[i].id===id));
 $('selectedName').textContent=current.name;
 await window.CMDLocalProfile?.show({id:current.id,name:current.name,game:current.game,map:current.map,slots:current.slots,installed:current.installed,linked:true});
 $('selectedRoot').textContent=current.root;
 $('selectedState').textContent=current.note;
 $('installedBadge').textContent=current.installed?'FICHIERS DÉTECTÉS':'INSTALLATION NON VÉRIFIÉE';
 $('installedBadge').className='tag '+(current.installed?'online':'offline');
 show('explorer',true);show('maps',current.game==='dayz');show('palworldWorkshop',current.game==='palworld');show('editor',false);
 $('quickConfigs').replaceChildren();
 for(const config of current.configFiles){
  const b=element('button','chip',config);b.onclick=()=>safe(async()=>{
   if(/\/$/.test(config)||config==='mpmissions'||config==='Mods/Workshop'){await files(config)}else await openText(config);
  });
  $('quickConfigs').append(b);
 }
 if(restart)folder='';
 await files(folder);
 if(current.game==='dayz')await refreshMaps();
 if(current.game==='palworld')await refreshPalworld();
}
async function files(sub=''){
 if(!current)return;
 const data=await api('/api/files?id='+encodeURIComponent(current.id)+'&path='+encodeURIComponent(sub));
 folder=data.path;show('editor',false);
 const crumb=$('crumbs');crumb.replaceChildren();
 const home=element('button','quiet','⌂ '+current.name);home.onclick=()=>safe(()=>files(''));crumb.append(home);
 let soFar='';
 for(const segment of folder.split('/').filter(Boolean)){
  soFar=soFar?soFar+'/'+segment:segment;
  const slash=element('span','muted',' / ');crumb.append(slash);
  const b=element('button','quiet',segment),rel=soFar;b.onclick=()=>safe(()=>files(rel));crumb.append(b);
 }
 const root=$('fileList');root.replaceChildren();
 if(!data.files.length){root.append(element('p','empty','Ce dossier est réellement vide. Aucune configuration inventée.'))}
 for(const entry of data.files){
  const line=element('div','fileRow');
  const file=element('button','fileName',(entry.type==='folder'?'📁 ':'📄 ')+entry.name);
  file.title=entry.path;
  file.onclick=()=>safe(()=>entry.type==='folder'?files(entry.path):entry.editable?openText(entry.path):download(entry.path));
  const size=element('span','fileMeta',bytes(entry.bytes));
  const date=element('span','fileMeta',new Date(entry.modified).toLocaleString('fr-FR'));
  const actions=element('div','fileActions');
  if(entry.type==='file'){
   if(entry.editable){
    const edit=element('button','quiet','Éditer');edit.onclick=()=>safe(()=>openText(entry.path));actions.append(edit);
   }
   const dl=element('button','quiet','↓');dl.setAttribute('aria-label','Télécharger '+entry.name);
   dl.onclick=()=>safe(()=>download(entry.path));actions.append(dl);
  }
  line.append(file,size,date,actions);root.append(line);
 }
 $('filesWarning').textContent=data.truncated?'Plus de 1500 entrées : utilise les sous-dossiers pour retrouver tes fichiers.':'Les données affichées proviennent directement du disque de la machine hôte.';
}
async function openText(rel){
 const data=await api('/api/file?id='+encodeURIComponent(current.id)+'&path='+encodeURIComponent(rel));
 editing=rel;$('editingPath').textContent=rel;$('fileEditor').value=data.content;$('confirmStopped').checked=false;show('editor',true);
 $('editor').scrollIntoView({behavior:'smooth',block:'start'});
}
async function download(rel){
 const result=await api('/api/file?id='+encodeURIComponent(current.id)+'&download=1&path='+encodeURIComponent(rel),{raw:true});
 const blob=await result.blob(),url=URL.createObjectURL(blob);
 try{const link=element('a');link.href=url;link.download=rel.split('/').at(-1);document.body.append(link);link.click();link.remove();}
 finally{setTimeout(()=>URL.revokeObjectURL(url),30000)}
}
async function refreshPalworld(){
 if(!current||current.game!=='palworld')return;
 const result=await api('/api/palworld/workshop?id='+encodeURIComponent(current.id));
 const list=$('palworldModList');list.replaceChildren();
 $('palworldWorkshopStatus').textContent=result.installedMods.length+' mod(s) trouvé(s) sur le disque. '+
   (result.enabledGlobal?'Chargement global activé.':'Chargement global non activé.');
 if(!result.installedMods.length){
  list.append(element('p','empty','Aucun mod serveur détecté. Installe d’abord les vrais fichiers Workshop dans Mods/Workshop, puis ouvre PalModSettings.ini.'));
 }
 for(const mod of result.installedMods){
  const row=element('article','serverItem');
  row.append(element('strong','',mod.packageName),
    element('small','',mod.serverCompatible?(mod.enabled?'Compatible serveur · activé':'Compatible serveur · inactif'):
      'Mod non confirmé compatible avec un serveur dédié'));
  list.append(row);
 }
}
$('palworldRefresh').onclick=()=>safe(refreshPalworld);
async function refreshMaps(){
 const r=await api('/api/maps?id='+encodeURIComponent(current.id));
 const select=$('mapSelect');select.replaceChildren();
 if(!r.maps.length){
  select.append(new Option('Aucune mission DayZ installée et vérifiée',''));
  select.disabled=true;$('applyMap').disabled=true;
 }else{
  for(const m of r.maps)select.append(new Option(m.label,m.id));
  select.disabled=false;$('applyMap').disabled=false;if(r.maps.some(m=>m.id===r.active))select.value=r.active;
 }
 $('mapCurrent').textContent='Actuellement : '+(r.active||'inconnue');
}
$('loginForm').addEventListener('submit',e=>{e.preventDefault();safe(async()=>{
 token=$('token').value.trim();await api('/api/servers');$('token').value='';
 show('loginView',false);show('workspace',true);await Promise.all([loadLifetimeCatalogue(),refreshLifetime()]);await refresh();await refreshDayzInstall();await refreshProfiles();await window.CMDLocalProfile?.pc();notice('Bibliothèque de serveurs ouverte. Les profils restent enregistrés sans échéance.');
})});
let previousDayzState='';
function dayzMessage(message,problem=false){
 const field=$('dayzSetupStatus');field.textContent=message;
 field.style.color=problem?'#ffada9':'#b7d7fa';
}
async function refreshDayzInstall(){
 const status=await api('/api/install/dayz');
 const canInstall=status.allowed&&status.localBrowser&&status.installerAvailable&&!status.filesPresent&&
  status.state!=='running'&&status.state!=='starting';
 $('createDayz').disabled=!canInstall||!$('dayzTerms').checked;
 if(status.filesPresent){
  dayzMessage('Fichiers DayZ détectés dans '+status.gameDir+'. Ouvre maintenant ton serveur dans la liste.');
  if(previousDayzState!=='installed')await refresh();
  previousDayzState='installed';
 }else if(!status.allowed){
  dayzMessage('Création disponible uniquement depuis le panneau lancé sur Windows.',true);
 }else if(!status.localBrowser){
  dayzMessage('Pour installer DayZ, ouvre ce panneau directement sur le PC : http://127.0.0.1:8788. La consultation depuis le téléphone reste possible.',true);
 }else if(!status.installerAvailable){
  dayzMessage('Installateur manquant : récupère le paquet Windows complet, avec le dossier scripts.',true);
 }else if(status.state==='running'||status.state==='starting'){
  dayzMessage('Installation lancée. Confirme dans la fenêtre Windows, puis laisse SteamCMD télécharger les fichiers.');
 }else if(status.state==='error'){
  dayzMessage('Installation DayZ interrompue ou refusée. Regarde le message dans la fenêtre de l’installateur, puis réessaie.',true);
 }else if(status.state==='finished'){
  dayzMessage('Programme terminé mais fichiers DayZ non vérifiés. Vérifie le dossier '+status.gameDir+'.',true);
 }else{
  dayzMessage('DayZ n’est pas encore installé. Accepte les conditions puis clique sur Installer DayZ sur ce PC.');
 }
 return status;
}
$('dayzTerms').addEventListener('change',()=>safe(refreshDayzInstall));
$('checkDayz').onclick=()=>safe(async()=>{await refreshDayzInstall();await refresh()});
$('createDayz').onclick=()=>safe(async()=>{
 if(!$('dayzTerms').checked)throw Error('Accepte d’abord les conditions des éditeurs.');
 if(!confirm('Télécharger et installer le vrai serveur DayZ PC (SteamCMD 223350) sur CET ordinateur ? Tu devras aussi confirmer dans la fenêtre Windows.'))return;
 $('createDayz').disabled=true;
 const result=await api('/api/install/dayz',{method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({confirmed:true,publisherTermsAccepted:true})});
 dayzMessage(result.message||'Installation DayZ demandée sur ce PC.');
 await refreshDayzInstall();
});

// Unified launcher: the profile is visible before installation, but only real Windows game executables may start.
async function refreshProfiles(){
 const data=await api('/api/profiles');
 const list=$('cmdProfileList');list.replaceChildren();
 const ready=data.profiles.filter(p=>p.ready).length;
 const initiated=data.profiles.filter(p=>p.startedByThisPanel).length;
 $('cmdProfileSummary').textContent=data.profiles.length+' profils enregistrés · '+ready+
  ' prêts à tenter un démarrage · '+initiated+' gestionnaire actif · '+(data.activeProfile?'un profil en cours':'aucun serveur actif confirmé');
 for(const item of data.profiles){
  const card=element('article','cmdProfileCard');
  const heading=element('strong','',item.title);
  const desc=element('small','',item.map+' · '+item.slots+' slots · '+item.game.toUpperCase());
  const stat=element('span','tag '+(item.ready?'online':'offline'),item.startedByThisPanel?'GESTIONNAIRE ACTIF':item.ready?'FICHIERS VÉRIFIÉS':'À INSTALLER');
  const summary=element('p','muted',item.state);
  const blockers=element('details','');
  const top=element('summary','','Manques ('+item.blockers.length+')');blockers.append(top);
  const issues=element('ul');for(const text of item.blockers.slice(0,35))issues.append(element('li','',text));blockers.append(issues);
  const actions=element('div','cmdProfileButtons');
  const prepare=element('button','quiet','Préparer');
  prepare.disabled=!data.localBrowser||item.startedByThisPanel;
  prepare.onclick=()=>safe(async()=>{
   if(!confirm('Préparer les fichiers de configuration de '+item.title+' sur CE PC Windows sans écraser les sauvegardes ?'))return;
   await api('/api/profiles/prepare',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({id:item.id,confirmLocal:true})});
   notice('Configurations '+item.title+' préparées. Installer le serveur officiel et les mods avant de démarrer.');
   await refreshProfiles();
  });
  const start=element('button','primary','▶ Démarrer');
  start.disabled=!data.localBrowser||!item.ready||!!data.activeProfile||item.activeGameDetected;
  start.title=!data.localBrowser?'Lancement autorisé depuis le PC Windows uniquement':
    !item.ready?'Fichiers officiels, missions ou mods incomplets':
    item.activeGameDetected?'Un DayZ ou ARK tourne déjà sur Windows':'Démarrer ce profil en local';
  start.onclick=()=>safe(async()=>{
   if(!confirm('Démarrer réellement '+item.title+' sur CET ordinateur ? Un seul serveur DayZ ou ARK à la fois.'))return;
   const result=await api('/api/profiles/start',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({id:item.id,confirmLocal:true})});
   notice(result.note||'Lancement demandé. Vérifier la console Windows et le jeu.');
   await refreshProfiles();
  });
  const openProfile=element('button','quiet','Ouvrir profil · Mods');
  openProfile.type='button';
  openProfile.onclick=()=>safe(async()=>{
   await window.CMDLocalProfile?.show({id:item.id,name:item.title,game:item.game,map:item.map,
    slots:item.slots,installed:item.filesVerified,linked:false});
   $('profileWorkspace').scrollIntoView({behavior:'smooth',block:'start'});
  });
  actions.append(openProfile,prepare,start);
  card.append(heading,desc,stat,summary,blockers,actions);
  list.append(card);
 }
 if(!data.localBrowser){
  list.prepend(element('p','muted','Sur téléphone : état consultable. Pour installer ou démarrer un vrai serveur, ouvre ce même panneau sur ton PC hôte : http://127.0.0.1:8788.'));
 }
}

let lifetimeCatalogue=[];
let lifetimeCache=[];
async function loadLifetimeCatalogue(){
 const result=await api('/api/library/catalogue');
 lifetimeCatalogue=result.suggestions||[];
 const datalist=$('lifetimeGames');datalist.replaceChildren();
 for(const g of lifetimeCatalogue){
  const option=document.createElement('option');
  option.value=g.name;option.label=g.key;
  datalist.append(option);
 }
}
async function refreshLifetime(){
 const result=await api('/api/library/profiles');
 lifetimeCache=result.profiles;
 const panel=$('lifetimeList');panel.replaceChildren();
 $('lifetimeSummary').textContent=result.profiles.length+
  ' serveur(s) sauvegardé(s) à vie · 0 expiration automatique · 1 seul serveur démarrable à la fois';
 if(!result.profiles.length){
  panel.append(element('p','empty','Aucun profil personnalisé : choisis un jeu puis crée ton premier serveur.'));
 }
 for(const item of result.profiles){
  const card=element('article','lifetimeRow');
  const title=element('strong','',item.name);
  const sub=element('small','',item.gameName+' · '+item.slots+' slots'+
   (item.map?' · '+item.map:''));
  const flag=element('span','tag '+(item.gameInstalledVerified?'online':'offline'),
   item.gameInstalledVerified?'BINAIRE DÉTECTÉ':'PROFIL CONSERVÉ');
  const state=element('p','muted',item.gameInstalledVerified?
   'Installation associée ; lancement/ports/joueurs non vérifiés.':
   item.linkedFilesAvailable?'Dossier lié · fichiers du jeu non validés':
   'Non installé : télécharge d’abord le serveur dédié officiel sur la machine.');
  const actions=element('div','lifetimeButtons');
  const edit=element('button','quiet','Modifier');
  edit.type='button';
  edit.onclick=()=>safe(async()=>{
   const name=prompt('Nom du serveur',item.name);if(name===null)return;
   const slots=prompt('Nombre de joueurs (1 à 500)',String(item.slots));if(slots===null)return;
   const map=prompt('Carte / monde (facultatif)',item.map||'');if(map===null)return;
   await api('/api/library/profiles',{method:'PATCH',headers:{'content-type':'application/json'},
    body:JSON.stringify({id:item.id,name,slots:Number(slots),map})});
   await refreshLifetime();notice('Profil modifié. Aucun fichier ni sauvegarde supprimé.');
  });
  const link=element('button','quiet',item.directory?'Changer le dossier':'Associer les fichiers');
  link.type='button';
  link.onclick=()=>safe(async()=>{
   const hint=item.directory||'C:\\CMD-Servers\\MonServeur\\jeu';
   const directory=prompt('Dossier réel du serveur dédié sur CE PC Windows. Doit exister et rester distinct des autres mondes.',hint);
   if(directory===null)return;
   await api('/api/library/profiles/link',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({id:item.id,directory})});
   await refreshLifetime();await refresh();
   notice('Fichiers locaux liés. Le jeu ne sera pas démarré sans validation de son exécutable.');
  });
  if(!['localhost','127.0.0.1','::1','[::1]'].includes(location.hostname))link.disabled=true;
  const openFiles=element('button','quiet','Fichiers / Mods');
  openFiles.type='button';openFiles.disabled=!item.linkedFilesAvailable;
  openFiles.onclick=()=>safe(async()=>{
   await refresh();await select(item.id);
   $('explorer').scrollIntoView({behavior:'smooth',block:'start'});
  });
  const remove=element('button','quiet','Supprimer ce profil');
  remove.type='button';
  remove.onclick=()=>safe(async()=>{
   const confirmation=prompt('Pour retirer seulement cette fiche (les sauvegardes et mods restent sur le disque), recopie exactement : '+item.name);
   if(confirmation===null)return;
   const result=await api('/api/library/profiles',{method:'DELETE',headers:{'content-type':'application/json'},
    body:JSON.stringify({id:item.id,confirmName:confirmation})});
   await refreshLifetime();await refresh();
   notice(result.note||'Profil retiré uniquement sur demande explicite ; fichiers conservés.');
  });
  const profileButton=element('button','primary','Ouvrir mon profil');
  profileButton.type='button';
  profileButton.onclick=()=>safe(async()=>{
   if(item.linkedFilesAvailable){await refresh();await select(item.id);}
   else await window.CMDLocalProfile?.show({id:item.id,name:item.name,game:item.gameKey,
    map:item.map,slots:item.slots,installed:false,linked:false});
   $('profileWorkspace').scrollIntoView({behavior:'smooth',block:'start'});
  });
  actions.append(profileButton,edit,link,openFiles,remove);
  card.append(title,sub,flag,state,actions);panel.append(card);
 }
}
$('createLifetimeForm').addEventListener('submit',event=>{
 event.preventDefault();
 safe(async()=>{
  const gameName=$('lifetimeGameName').value.trim();
  const guess=lifetimeCatalogue.find(g=>g.name.toLowerCase()===gameName.toLowerCase());
  const name=$('lifetimeServerName').value.trim();
  const slots=Number($('lifetimeSlots').value);
  const map=$('lifetimeMap').value.trim();
  const result=await api('/api/library/profiles',{
   method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify({gameName,gameKey:guess?.key||'custom',name,slots,map,platform:'pc'})
  });
  $('lifetimeServerName').value='';$('lifetimeMap').value='';
  await refreshLifetime();
  notice(result.note||'Profil enregistré à vie. Le jeu doit encore être installé.');
 });
});
$('refreshLifetime').onclick=()=>safe(refreshLifetime);
$('exportLifetime').onclick=()=>safe(async()=>{
 const snapshot=await api('/api/library/profiles/export');
 const blob=new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'});
 const link=document.createElement('a'),url=URL.createObjectURL(blob);
 link.href=url;link.download='CMDHosting-Mes-Serveurs-'+new Date().toISOString().slice(0,10)+'.json';
 document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1500);
 notice('Liste de serveurs exportée. Conserve aussi les véritables sauvegardes des jeux sur ton PC.');
});

$('refreshProfiles').onclick=()=>safe(refreshProfiles);

$('refresh').onclick=()=>safe(refresh);
$('rootBtn').onclick=()=>safe(()=>files(''));
$('upBtn').onclick=()=>safe(()=>files(folder.split('/').slice(0,-1).join('/')));
$('reloadFiles').onclick=()=>safe(()=>files(folder));
$('closeEditor').onclick=()=>show('editor',false);
$('saveFile').onclick=()=>safe(async()=>{
 if(!editing||!current)throw Error('Aucun fichier sélectionné');
 if(!$('confirmStopped').checked)throw Error('Confirme que ton serveur est arrêté.');
 if(!confirm('Sauvegarder '+editing+' ? Une copie de sécurité sera conservée.'))return;
 await api('/api/file?id='+encodeURIComponent(current.id)+'&path='+encodeURIComponent(editing),{
  method:'PUT',headers:{'content-type':'application/json'},
  body:JSON.stringify({content:$('fileEditor').value,confirmStopped:true})
 });
 notice('Fichier sauvegardé avec copie de sécurité : '+editing);await files(folder);
});
$('applyMap').onclick=()=>safe(async()=>{
 if(!$('mapSelect').value)throw Error('Aucune mission installée.');
 if(!confirm('Tu dois avoir arrêté le serveur DayZ. Appliquer '+$('mapSelect').value+' et conserver un backup du serverDZ.cfg ?'))return;
 await api('/api/maps?id='+encodeURIComponent(current.id),{
  method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({map:$('mapSelect').value,confirmStopped:true})
 });
 notice('Mission sélectionnée. Redémarre ton serveur pour appliquer les changements.');await refreshMaps();await files(folder);
});
$('registerForm').addEventListener('submit',e=>{e.preventDefault();safe(async()=>{
 const fields={game:$('registerGame').value.trim(),name:$('registerName').value.trim(),root:$('registerRoot').value.trim()};
 const res=await api('/api/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(fields)});
 await refresh();await select(res.id);notice('Dossier réel associé. Aucun fichier généré ou supprimé.');
})});
$('uploadFile').onchange=()=>{if($('uploadFile').files[0])$('uploadName').value=$('uploadFile').files[0].name};
$('uploadForm').addEventListener('submit',e=>{e.preventDefault();safe(async()=>{
 const file=$('uploadFile').files[0];if(!file)throw Error('Choisis un fichier');
 if(file.size>2097152)throw Error('Les configurations sont limitées à 2 Mo');
 const name=$('uploadName').value.trim();
 if(!/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,180}$/.test(name))throw Error('Nom de fichier invalide');
 const rel=[folder,name].filter(Boolean).join('/');
 if(!confirm('Importer '+name+' sans écraser de fichier existant ?'))return;
 await api('/api/upload?id='+encodeURIComponent(current.id)+'&path='+encodeURIComponent(rel),{
  method:'POST',headers:{'content-type':'application/octet-stream'},body:await file.arrayBuffer()
 });
 await files(folder);notice('Nouveau fichier réel importé : '+rel);
})});
setInterval(()=>{if(!$('workspace').hidden && token)void refreshDayzInstall().catch(()=>{})},9000);

// Show the five requested CMD profiles before the general game catalogue form.
$('lifetimeServers').before($('cmdProfiles'));
setInterval(()=>{if(!$('workspace').hidden&&token)void refreshProfiles().catch(()=>{})},20000);
