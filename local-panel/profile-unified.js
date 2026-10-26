/* CMD Hosting: one local profile workspace for real servers and prepared DayZ/ARK profiles.
 * Runs on the owner's PC with the existing authenticated local-panel APIs only.
 * Never uses Railway or claims uninstalled mods are running. */
(()=>{
'use strict';
let selectedProfile=null;
const modSources={
 dayz:['Steam Workshop DayZ PC','https://steamcommunity.com/app/221100/workshop/'],
 'ark-asa':['CurseForge ARK Survival Ascended','https://www.curseforge.com/ark-survival-ascended/mods'],
 'ark-ase':['Steam Workshop ARK Survival Evolved','https://steamcommunity.com/app/346110/workshop/'],
 'arma-reforger':['Arma Reforger Workshop','https://reforger.armaplatform.com/workshop'],
 palworld:['Steam Workshop Palworld','https://steamcommunity.com/app/1623730/workshop/']
};
function row(name,id){
 const wrap=element('div','profileModRow');
 wrap.append(element('b','',name),element('small','',id?'ID '+id:'Identifiant à vérifier'),
   element('span','tag offline','FICHIERS NON VÉRIFIÉS'));
 return wrap;
}
function linkSource(name,url){
 if(!/^https:\/\//.test(url))return null;
 const a=element('a','modSourceLink',name);
 a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;
}
async function showProfile(profile){
 selectedProfile={id:profile.id,name:profile.name,game:profile.game||'',map:profile.map||'',
  slots:profile.slots||100,installed:Boolean(profile.installed),linked:Boolean(profile.linked)};
 show('profileWorkspace',true);show('profileMods',false);show('profileConsoleStatus',false);
 $('profileGameName').textContent=selectedProfile.name;
 $('profileGameInfo').textContent=(selectedProfile.game||'Jeu du catalogue')+' · '+
  selectedProfile.slots+' slot(s) demandés'+(selectedProfile.map?' · '+selectedProfile.map:'')+
  (selectedProfile.installed?' · binaire officiel détecté sur ce PC':' · non installé / non vérifié');
 $('profileGameState').textContent=selectedProfile.installed?'BINAIRE DÉTECTÉ':'PROFIL PRÉPARÉ';
 $('profileGameState').className='tag '+(selectedProfile.installed?'online':'offline');
 $('profileOpenFiles').disabled=!selectedProfile.linked;
 $('profileOpenMaps').disabled=!(selectedProfile.linked&&selectedProfile.game==='dayz');
}
async function mods(){
 if(!selectedProfile)return;
 show('profileMods',true);show('profileConsoleStatus',false);
 const list=$('profileModsList'),sources=$('profileModsSource');list.replaceChildren();sources.replaceChildren();
 let pack=null;
 try{pack=await api('/api/profile/workshop?id='+encodeURIComponent(selectedProfile.id))}
 catch(error){notice('Mods : '+error.message,true)}
 const source=pack?.workshop?[pack.workshop.name,pack.workshop.url]:modSources[selectedProfile.game];
 const a=source&&linkSource(source[0],source[1]);if(a)sources.append(a);
 if(pack?.mods?.length){
  for(const mod of pack.mods)list.append(row(mod.name,mod.sourceId));
  $('profileModsStatus').textContent=pack.mods.length+
   ' mods demandés pour '+selectedProfile.name+'. Aucun mod déclaré installé tant que son dossier réel n’est pas contrôlé.';
 }else $('profileModsStatus').textContent='Aucun mod préinstallé vérifié. Utilise la source officielle ci-dessous. L’installation nécessite le serveur réel.';
 if(selectedProfile.game==='palworld'&&selectedProfile.linked&&current?.game==='palworld'){
  await refreshPalworld();
  $('palworldWorkshop').scrollIntoView({behavior:'smooth',block:'start'});
 }
}
async function pc(){
 const status=await api('/api/status');
 $('pcConnectionBadge').textContent=status.pcOnline?'PANNEAU LOCAL ACTIF':'PANNEAU INDISPONIBLE';
 $('pcConnectionBadge').className='tag '+(status.pcOnline?'online':'offline');
 $('pcConnectionAddresses').replaceChildren();
 if(status.lanEnabled&&status.lanAddresses?.length){
  $('pcConnectionStatus').textContent='PC raccordé localement. Pour ton téléphone sur le même Wi-Fi, ouvre :';
  for(const url of status.lanAddresses){
   const link=linkSource(url,url);if(link){link.target='_self';$('pcConnectionAddresses').append(link)}
  }
 }else{
  $('pcConnectionStatus').textContent=
   'PC détecté. Pour accéder depuis ton iPhone sur le même Wi-Fi, relance le programme Windows et sélectionne le mode 2 (réseau local).';
 }
}
$('profileOpenMods').onclick=()=>safe(mods);
$('profileOpenFiles').onclick=()=>safe(async()=>{
 if(!selectedProfile?.linked)throw Error('Associe une installation réelle sur le PC avant d’ouvrir les fichiers.');
 const found=servers.find(p=>p.id===selectedProfile.id);
 if(found&&current?.id!==found.id)await select(found.id);
 $('explorer').scrollIntoView({behavior:'smooth',block:'start'});
});
$('profileOpenMaps').onclick=()=>safe(async()=>{
 if(!selectedProfile?.linked||selectedProfile.game!=='dayz')throw Error('Une mission DayZ réelle est nécessaire.');
 if(current?.id!==selectedProfile.id)await select(selectedProfile.id);
 $('maps').scrollIntoView({behavior:'smooth',block:'start'});
});
$('profileOpenConsole').onclick=()=>{
 show('profileMods',false);show('profileConsoleStatus',true);
 $('profileConsoleStatus').textContent=
  'Console non connectée : seuls les processus de jeu effectivement installés et lancés sur cet ordinateur pourront être contrôlés. Aucun processus fictif.';
};
$('refreshConnection').onclick=()=>safe(pc);
window.CMDLocalProfile={show:showProfile,pc,mods};
})();