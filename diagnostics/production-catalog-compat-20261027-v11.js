(function(){
'use strict';
const legacy=new Set(['minecraft','bedrock','terraria','valheim','zomboid','ark','dayz','arma','palworld','7dtd','fs25','conan']);
async function populate(){
const select=document.getElementById('hpGameKey');
if(!select||select.dataset.cmdExtraLoaded)return;
select.dataset.cmdExtraLoaded='1';
try{
const r=await fetch('/api/catalog',{cache:'no-store'});if(!r.ok)throw Error('Catalogue indisponible');
const {games=[]}=await r.json();
const known=new Set([...select.options].map(x=>x.value));
const supported=document.createElement('optgroup');supported.label='Jeux dédiés · profils en préparation';
const pending=document.createElement('optgroup');pending.label='Autres jeux · pas d’installation disponible';
let added=0;
for(const game of games){
if(known.has(game.key)||legacy.has(game.key))continue;
const option=document.createElement('option');option.value=game.key;option.textContent=game.name+(game.status==='dedicated'?'':' · à vérifier');
option.disabled=game.status!=='dedicated';
(game.status==='dedicated'?supported:pending).append(option);
known.add(game.key);added++;
}
if(supported.children.length)select.append(supported);
if(pending.children.length)select.append(pending);
const small=document.createElement('p');small.className='small';small.style.cssText='color:#9ebad1;line-height:1.55;margin:10px 0';
small.textContent='Catalogue CMD Hosting : '+games.length+' fiches. Un profil de serveur enregistre des paramètres : il ne télécharge pas encore le jeu. Les installations automatiques seront testées jeu par jeu lorsque la machine sera disponible.';
select.closest('label')?.parentElement?.append(small);
select.addEventListener('change',()=>{
if(legacy.has(select.value))return;
const platform=document.getElementById('hpPlatform');
if(platform&&[...platform.options].some(x=>x.value==='pc'))platform.value='pc';
});
}catch(e){delete select.dataset.cmdExtraLoaded;}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',populate,{once:true});else populate();
})();

/* CMD_RENTER_MENU_V1 */
;(function(){
'use strict';
const pid="cmdRenterProfile";if(document.getElementById(pid))return;
const root=document.querySelector('main.wrap')||document.querySelector('main');if(!root)return;
if(typeof pages!=='undefined'&&Array.isArray(pages)&&!pages.includes(pid))pages.push(pid);
const section=document.createElement('section');section.id=pid;section.className='page section hide';
section.innerHTML='<div class="cmdrp"><header class="cmdrp-head"><b>◆ CMD Hosting</b><div><button id="cmdrpServers">MES SERVEURS</button><button id="cmdrpStore">LOUER UN SERVEUR</button><button id="cmdrpReload">↻ ACTUALISER</button></div><span id="cmdrpUser">PROFIL LOUEUR</span></header><div class="cmdrp-layout"><aside class="cmdrp-sidebar"><small>CHOISIR UN SERVEUR</small><select id="cmdrpSelect" aria-label="Sélectionner un serveur"></select><div id="cmdrpBrief"></div><small>PARAMÈTRES</small><nav id="cmdrpSettings"></nav><small>ADMINISTRATION</small><nav id="cmdrpAdmin"></nav><button id="cmdrpCreate">＋ Nouveau serveur</button></aside><div class="cmdrp-main"><p id="cmdrpStatus" role="status"></p><header class="cmdrp-banner" id="cmdrpBanner"><div><small>CMD HOSTING / GESTION DES SERVEURS</small><h2 id="cmdrpTitle">Mes serveurs</h2><p id="cmdrpDescription"></p><div id="cmdrpActions"></div></div></header><div id="cmdrpDetails"></div></div></div></div>';root.append(section);
const style=document.createElement('style');style.textContent=[
'#cmdRenterProfile{max-width:1700px;margin:auto;color:#edf6ff}#cmdRenterProfile button,#cmdRenterProfile select{font:inherit}#cmdRenterProfile button{cursor:pointer}',
'.cmdrp{background:#071427;border:1px solid #365276;border-radius:15px;overflow:hidden}.cmdrp-head{display:flex;align-items:center;flex-wrap:wrap;justify-content:space-between;gap:12px;background:#081b35;padding:14px;border-bottom:1px solid #305075}',
'.cmdrp-head b{font-size:21px;color:#fff}.cmdrp-head>div{display:flex;gap:7px;flex-wrap:wrap}.cmdrp-head button{background:transparent;border:0;border-bottom:2px solid #269eff;color:#d5e8ff;padding:8px;font-size:11px;font-weight:800}#cmdrpUser{color:#9cbde7;font-size:12px}',
'.cmdrp-layout{display:grid;grid-template-columns:235px minmax(0,1fr);min-height:720px}.cmdrp-sidebar{background:linear-gradient(#0c2949,#08172d);border-right:1px solid #315071;padding:14px 10px;display:flex;flex-direction:column;gap:10px}',
'.cmdrp-sidebar small{font-size:10px;color:#98b9df;font-weight:800;letter-spacing:.12em;padding:5px 8px}.cmdrp-sidebar select{color:white;background:#173453;padding:11px;border-radius:8px;border:1px solid #416593;width:100%}#cmdrpBrief{padding:11px;border-radius:8px;background:#172d4a;border:1px solid #344f75;color:#c1d5ef;font-size:12px}',
'#cmdrpSettings,#cmdrpAdmin{display:grid;gap:2px}.cmdrp-sidebar button{background:transparent;border:0;text-align:left;padding:10px;color:#bcd0ec;border-radius:7px;font-size:12px}.cmdrp-sidebar button.cmdrp-on{background:#145ca4;border-left:3px solid #4de0ff;color:#fff}#cmdrpCreate{margin-top:auto;background:#153d6a;border:1px solid #3186dc;color:white;text-align:center}',
'.cmdrp-main{min-width:0;padding:15px}#cmdrpStatus{color:#b6cfe8;font-size:12px}.cmdrp-banner{border:1px solid #365b81;border-radius:12px;background:linear-gradient(125deg,#173a68,#1a254d);background-size:cover;background-position:center;overflow:hidden}',
'.cmdrp-banner>div{padding:23px;min-height:172px;background:linear-gradient(90deg,#07152bf5,#091d34cc 60%,#10172766)}.cmdrp-banner small{color:#80d4ff;font-size:11px}.cmdrp-banner h2{color:white;font-size:clamp(23px,3vw,32px);margin:7px 0}.cmdrp-banner p{color:#bfd8ee;font-size:13px}',
'#cmdrpActions{display:flex;gap:8px;flex-wrap:wrap}#cmdrpActions button{border:1px solid #287fdd;border-radius:8px;background:#1455ab;padding:9px 12px;color:white}#cmdrpActions button:disabled{opacity:.45;cursor:not-allowed}',
'.cmdrp-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:12px 0}.cmdrp-box{background:#0e2038;border:1px solid #294465;border-radius:10px;padding:14px;min-width:0}.cmdrp-box small{font-size:11px;color:#a5bfdf}.cmdrp-box strong{display:block;color:white;font-size:17px;overflow-wrap:anywhere;margin-top:5px}.cmdrp-box h3{color:#fff;margin:0 0 10px;font-size:17px}.cmdrp-box p,.cmdrp-box li{color:#bad1e9;font-size:13px}',
'.cmdrp-cols{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin:11px 0}.cmdrp-line{display:flex;justify-content:space-between;gap:8px;padding:9px 0;border-bottom:1px solid #28405d;font-size:12px}.cmdrp-line span{color:#abc2df}.cmdrp-line b{text-align:right;overflow-wrap:anywhere}.cmdrp-box button{width:100%;background:#164677;border:1px solid #3977ad;color:white;padding:9px;margin:7px 0;border-radius:8px;text-align:left}.cmdrp-warn{background:#30261f;border:1px solid #79603c;padding:15px;border-radius:10px;color:#eed4a7}',
'@media(max-width:940px){.cmdrp-layout{grid-template-columns:195px minmax(0,1fr)}.cmdrp-stats{grid-template-columns:repeat(2,1fr)}.cmdrp-cols{grid-template-columns:1fr}}@media(max-width:650px){.cmdrp-layout{display:block}.cmdrp-sidebar{border:0;border-bottom:1px solid #34506b}.cmdrp-sidebar #cmdrpSettings,.cmdrp-sidebar #cmdrpAdmin{display:flex;overflow:auto}.cmdrp-sidebar nav button{white-space:nowrap}}'
].join('\n');document.head.append(style);
const $=id=>document.getElementById(id),mk=(t,text,cls)=>{let e=document.createElement(t);if(text!==undefined)e.textContent=String(text);if(cls)e.className=cls;return e};
const cats=['Vue générale','Réglages de base','Fichiers & FTP','Console','Mods','Joueurs'],admins=['Sauvegardes','Redémarrages','Permissions & accès','Tâches planifiées','Réinstaller','Changer de jeu'];
let leases=[],library=[],catalog=[],pc=null,key='',tab=cats[0],sending=false;

/*CMD_MAP_PICKER_FIXED_V1 — game-specific covers and map choices, honest draft status*/
let blueprints=[],rpOwnerId="anonymous";
function rpIdentify(x){
 const direct=blueprints.find(g=>g.catalogId===Number(x?.g?.catalogId||x?.g?.id||x?.r?.gameId));if(direct)return direct.gameName;
 const raw=[x?.g?.game_key,x?.g?.gameKey,x?.g?.key,x?.g?.game_name,x?.g?.name,x?.g?.display_name,x?.name,x?.s?.id].filter(Boolean).join(' ').toLowerCase();
 if(/\bpalworld\b/.test(raw))return"Palworld";
 if(/\bday\s*z\b|\bdayz\b/.test(raw))return"DayZ";
 if(/\bark\b/.test(raw)&&/\b(ascended|asa)\b/.test(raw))return"ARK: Survival Ascended";
 if(/\bark\b/.test(raw)&&/\b(evolved|ase)\b/.test(raw))return"ARK: Survival Evolved";
 if(/\bark\b/.test(raw)&&!(/\b(evolved|ase)\b/.test(raw)))return"ARK: Survival Ascended";
 if(/\b7\s*days\s*to\s*die\b|\b7dtd\b/.test(raw))return"7 Days to Die";
 if(/\barma\s*reforger\b/.test(raw))return"Arma Reforger";
 const words=raw.replace(/[^a-z0-9]+/g,' ').trim();
 const matches=catalog.filter(g=>typeof g.name==='string'&&words.includes(g.name.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()));
 matches.sort((a,b)=>b.name.length-a.name.length);
 return matches[0]?.name||null;
}
function rpProfile(x){
 const title=rpIdentify(x);
 return blueprints.find(g=>g.gameName===title)||null;
}
function rpArtwork(x){
 const name=rpIdentify(x),g=catalog.find(y=>y.name===name),bp=rpProfile(x);
 const overrides={"DayZ":"221100","ARK: Survival Ascended":"2399830","ARK: Survival Evolved":"346110","Palworld":"1623730","7 Days to Die":"251570","Arma Reforger":"1874880"};
 let candidates=[g?.cover,bp?.visual?.imageUrl,overrides[name]?"https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/"+overrides[name]+"/header.jpg":null];
 for(const src of candidates){if(typeof src!=='string')continue;try{const u=new URL(src);if(u.protocol==='https:'&&["shared.fastly.steamstatic.com","cdn.cloudflare.steamstatic.com","steamcdn-a.akamaihd.net"].includes(u.hostname))return u.href;}catch(e){}}
 return null;
}
function rpPlatform(x){return String(x?.g?.platform||x?.s?.platform||x?.r?.platform||'').toLowerCase()}
function rpMapOptions(x){
 const title=rpIdentify(x),profile=rpProfile(x),platform=rpPlatform(x);
 const consoleGame=/ps[345]|playstation|xbox|switch|nintendo/.test(platform);
 let config=profile?.mapSelection||{mode:"none",choices:[],customAllowed:false,notes:"Aucune carte configurée pour ce jeu."};
 const options=(config.choices||[]).filter(c=>!consoleGame||c.kind==="official");
 const custom=!!config.customAllowed&&!(consoleGame&&/^(DayZ|ARK: Survival Evolved)$/.test(title||''));
 const disabled=config.mode==='none';
 return{title,options,custom,disabled,consoleGame,notes:config.notes||'',requires:config.modRequirement||'',syntax:config.customSyntax||null};
}
function rpSavedKey(x){return"cmd-hosting:map-draft:v1:"+rpOwnerId+":"+x.id}
function rpDraft(x){try{const v=JSON.parse(localStorage.getItem(rpSavedKey(x))||"null");return v&&typeof v.name==='string'?v:null}catch(e){return null}}
async function rpOpenMap(x=chosen()){
 if(!x)return;
 if(tab!==cats[0]){tab=cats[0];draw()}
 const root=$('cmdrpDetails');root.querySelector('#cmdrpMapEditor')?.remove();
 const pending=box('🗺️ Chargement des cartes du jeu…');pending.id='cmdrpMapEditor';root.prepend(pending);
 if(!blueprints.length){
  try{
   const r=await fetch('https://cmd-hosting-mods-api-production.up.railway.app/api/preproduction/games',{cache:'no-store',signal:AbortSignal.timeout(12000)});
   if(!r.ok)throw new Error('API '+r.status);
   const d=await r.json();if(!Array.isArray(d.games)||d.games.length<150)throw new Error('Profils incomplets');
   blueprints=d.games;
  }catch(e){
   pending.replaceChildren(mk('h3','🗺️ Cartes non chargées'),mk('p','Connexion au catalogue des cartes impossible : '+e.message+'. Le jeu et les serveurs ne sont pas modifiés.'));
   pending.append(btn('Réessayer',()=>rpOpenMap(x)));
   return;
  }
 }
 const m=rpMapOptions(x);
 pending.remove();
 const card=box('🗺️ Carte — À choisir');card.id='cmdrpMapEditor';card.classList.add('cmdrp-map-editor');
 const help=mk('p',m.disabled?(m.title?'Aucun réglage de carte documenté pour '+m.title+' dans le catalogue actuel.':'Le jeu de ce serveur n’est pas identifié : vérifie le jeu associé à cette location.'):"Choisis uniquement une carte compatible avec "+(m.title||'ce jeu')+".");
 card.append(help);
 if(!m.disabled){
 const choices=mk('select');choices.setAttribute('aria-label','Choisir une carte du jeu');
 choices.append(new Option('— Sélectionner une carte —',''));
 for(const c of m.options)choices.add(new Option(c.name+' · '+c.launchName,c.launchName));
 const saved=rpDraft(x);if(saved&&m.options.some(c=>c.launchName===saved.name))choices.value=saved.name;
 card.append(choices);
 let customField=null;
 if(m.custom){customField=mk('input');customField.placeholder='Nom interne de la carte mod (ex. Appalachia_Official_WP)';customField.setAttribute('aria-label','Nom interne de carte personnalisée');customField.autocomplete='off';customField.maxLength=150;if(saved&&!m.options.some(c=>c.launchName===saved.name))customField.value=saved.name;card.append(customField)}
 if(m.consoleGame)card.append(mk('p','Plateforme console : les cartes et mods réservés au PC ne sont pas proposés.'));
 if(m.requires)card.append(mk('p',m.requires));
 if(m.notes)card.append(mk('p',m.notes));
 const feedback=mk('p');card.append(feedback);
 const save=btn('Enregistrer mon choix (brouillon local)',()=>{
  const manual=(customField?.value||'').trim();const value=manual||choices.value;
  if(!value){feedback.textContent='Sélectionne une carte.';return}
  if(manual&&!m.custom){feedback.textContent='Carte personnalisée indisponible pour cette plateforme.';return}
  if(manual&&m.syntax){try{if(!new RegExp(m.syntax).test(value)){feedback.textContent='Nom de carte non valide pour ce jeu.';return}}catch(e){feedback.textContent='Validation indisponible.';return}}
  if(!manual&&!m.options.some(c=>c.launchName===value)){feedback.textContent='Cette carte ne figure pas dans les cartes compatibles.';return}
  try{localStorage.setItem(rpSavedKey(x),JSON.stringify({name:value,game:m.title,platform:rpPlatform(x),savedAt:new Date().toISOString()}))}
  catch(e){feedback.textContent='Impossible d’enregistrer sur cet appareil.';return}
  $('cmdrpStatus').textContent='Carte préparée : '+value+'. Non appliquée au serveur : synchronisation hébergeur requise.';
  draw();rpOpenMap(x)
 });
 card.append(save);
 card.append(mk('p','Le choix est conservé sur cet appareil uniquement. Le serveur ou la console garde sa carte actuelle tant que l’hébergeur ne confirme pas un changement.'));
 }
 root.prepend(card);card.scrollIntoView({behavior:'smooth',block:'nearest'});
}

const btn=(name,fn)=>{let b=mk('button',name);b.type='button';b.onclick=fn;return b};
function page(id){if(typeof show==='function')show(id);else{document.querySelectorAll('.page').forEach(x=>x.classList.add('hide'));$(id)?.classList.remove('hide')}}
function shop(){page($('cmdIntegratedGames')?'cmdIntegratedGames':'cmdCatalogSection')}
function host(){if(!$('hostingPanel'))return $('cmdrpStatus').textContent='Panneau PC indisponible.';page('hostingPanel');document.querySelector('[data-page="hostingPanel"]')?.click()}
function rentalsPage(){if(!$('rentals'))return $('cmdrpStatus').textContent='Locations indisponibles.';page('rentals');document.querySelector('[data-page="rentals"]')?.click()}

/*CMD_RENTER_WIRING_FIX_V1*/
function modsPage(x=chosen()){
  if(!x?.g?.id){$('cmdrpStatus').textContent='Mods : ce serveur doit être relié à un profil jeu CMD Hosting.';return;}
  if(!$('cmdMods')){$('cmdrpStatus').textContent='Le gestionnaire Mods & Workshop n’est pas disponible.';return;}
  try{sessionStorage.setItem('cvServer',String(x.g.id));}catch(e){}
  const sel=$('cvServer');if(sel)sel.value='';
  const nav=document.querySelector('#cmdOriginalNav [data-page="cmdMods"]');
  if(nav)nav.click();else{page('cmdMods');$('cvRefresh')?.click();}
}
function switchGamePage(x=chosen()){
  if(!x?.g?.id){$('cmdrpStatus').textContent='Changer de jeu : profil de serveur non trouvé.';return;}
  if(!$('cmdGameSwitch')){$('cmdrpStatus').textContent='Le gestionnaire de changement de jeu n’est pas disponible.';return;}
  const nav=document.querySelector('#cmdOriginalNav [data-page="cmdGameSwitch"]');
  if(nav)nav.click();else page('cmdGameSwitch');
  const wanted=String(x.g.id);let attempts=0;
  const sync=()=>{const select=$('switchServer');if(select&&[...select.options].some(o=>String(o.value)===wanted)){select.value=wanted;select.dispatchEvent(new Event('change',{bubbles:true}));return;}if(++attempts<5)setTimeout(sync,280)};
  sync();
}

function list(){let a=leases.map(r=>{let g=library.find(y=>String(y.id)===String(r.gameId));return{id:'r'+r.gameId,type:'location',name:r.name||g?.display_name||'Serveur',r,g}});
for(const s of pc?.machine?.servers||[])a.push({id:'p'+s.id,type:'machine',name:s.name||s.id,s});return a}
function chosen(){return list().find(x=>x.id===key)}
function state(x){if(!x)return'Aucun serveur';if(x.s)return pc?.machine?.online?(x.s.running?'En ligne':x.s.configured?'Prêt à démarrer':'Non configuré'):'PC hors ligne';
return({exempt:'Accès permanent',active:'Location active',awaiting_payment:'Précommercialisation',suspended:'Suspendu',expired:'Expiré'})[x.r?.state]||'Location enregistrée'}
function art(x){const image=rpArtwork(x);return image?'linear-gradient(90deg,#081629cf,#0c204877),url("'+image+'")':'linear-gradient(110deg,#173454,#122038)'}
const line=(k,v)=>{let c=mk('div',undefined,'cmdrp-line');c.append(mk('span',k),mk('b',v??'Non renseigné'));return c};
const box=t=>{let b=mk('div',undefined,'cmdrp-box');b.append(mk('h3',t));return b};
async function cmd(action){let x=chosen();if(sending||!x?.s||!pc?.machine?.online||!x.s.configured)return;if(action==='start'&&x.s.running||action!=='start'&&!x.s.running)return;if(action!=='start'&&!confirm((action==='stop'?'Arrêter ':'Redémarrer ')+x.name+' ?'))return;
sending=true;controls(x);try{let r=await fetch('/api/pc/command',{method:'POST',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify({serverId:x.s.id,action})}),j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.message||'Commande refusée');$('cmdrpStatus').textContent='Commande envoyée, en attente de confirmation du PC.';setTimeout(load,11000)}catch(e){$('cmdrpStatus').textContent=e.message}finally{sending=false;controls(chosen())}}
function controls(x){let c=$('cmdrpActions');c.replaceChildren();if(!x)return;if(!x.s){c.append(btn('Gérer ma location',rentalsPage));return}for(const [t,a]of[['▶ Démarrer','start'],['↻ Redémarrer','restart'],['■ Arrêter','stop']]){let b=btn(t,()=>cmd(a));b.disabled=sending||!pc?.machine?.online||!x.s.configured||(a==='start'?x.s.running:!x.s.running);c.append(b)}}
function content(x){let p=$('cmdrpDetails');p.replaceChildren();if(!x){p.append(mk('div','Aucun serveur lié à ce compte.','cmdrp-warn'),btn('Parcourir les jeux',shop));return}
if(tab===cats[0]){const stats=mk('div',undefined,'cmdrp-stats');for(const[k,v]of[[x.s?'STATUT':'LOCATION',state(x)],['JOUEURS',x.s?.players??'Non mesuré'],['RAM','Non mesurée'],['CARTE',x.s?.map??(rpDraft(x)?.name?rpDraft(x).name+' · brouillon':'À choisir')]]){const c=mk('div',undefined,'cmdrp-box');c.append(mk('small',k),mk('strong',v));if(k==='CARTE'){c.append(btn('Choisir une carte',()=>rpOpenMap(x))) }stats.append(c)}p.append(stats);
let two=mk('div',undefined,'cmdrp-cols'),access=box('🔗 Accès au serveur'),quick=box('⚡ Commandes rapides');for(const[k,v]of[['Nom',x.name],['Plateforme',x.g?.platform||x.s?.platform||'À confirmer'],['Slots',x.g?.slots??x.s?.slots],['IP',x.s?.address||'Non vérifiée']])access.append(line(k,v));quick.append(btn('Panneau de gestion',host),btn('Locations du compte',rentalsPage));two.append(access,quick);p.append(two);
let more=mk('div',undefined,'cmdrp-cols'),metrics=box('📈 Performances'),expiry=box('📅 Échéance');metrics.append(mk('p',"Données CPU, RAM et joueurs affichées uniquement quand l'agent les transmet."));expiry.append(line('Location',state(x)),line('Jusqu’au',x.r?.paidUntil?new Date(x.r.paidUntil).toLocaleDateString('fr-FR'):'Non renseigné'));more.append(metrics,expiry);p.append(more);return}
let c=box(tab);const descriptions={'Réglages de base':'Les réglages réels restent accessibles dans le panneau de gestion.','Console':'Console temps réel non disponible sans agent compatible.','Mods':'Mods et cartes compatibles avec ce jeu.','Joueurs':'Liste en direct indisponible sans données du serveur.','Sauvegardes':'Les sauvegardes doivent être vérifiées sur la machine.','Redémarrages':'Planification disponible dans le panneau existant.','Tâches planifiées':'Tâches disponibles sur les machines compatibles.','Réinstaller':'Réinstallation non activée sans sauvegarde validée.','Changer de jeu':'Sélectionne un jeu compatible avec les ressources de ta machine.'};
if(tab==='Fichiers & FTP'){let a=x.s?.files||[];if(a.length){let ul=mk('ul');for(const f of a)ul.append(mk('li',typeof f==='string'?f:f.name||f.path||'Fichier autorisé'));c.append(ul)}else c.append(mk('p','Aucun fichier autorisé actuellement disponible.'))}
else c.append(mk('p',descriptions[tab]||''));
if(tab==='Permissions & accès')c.append(mk('div',"Le partage par ID utilisateur CMD n'est pas encore relié aux autorisations réelles de chaque serveur.",'cmdrp-warn'));
else if(tab==='Mods')c.append(btn('Ouvrir les mods du serveur',()=>modsPage(x)));else if(tab==='Changer de jeu')c.append(btn('Ouvrir le changement de jeu',()=>switchGamePage(x)),btn('Voir les cartes disponibles',shop));
else if(!['Joueurs','Réinstaller'].includes(tab))c.append(btn('Ouvrir le panneau serveur',host));
p.append(c)}
function draw(){let a=list(),x=chosen(),sel=$('cmdrpSelect');sel.replaceChildren();for(const z of a)sel.add(new Option(z.name+' · '+z.type,z.id));if(x)sel.value=x.id;$('cmdrpBrief').replaceChildren();if(x){const img=rpArtwork(x);if(img){const tag=mk('img');tag.src=img;tag.alt='Image du jeu '+(rpIdentify(x)||x.name);tag.loading='lazy';$('cmdrpBrief').append(tag)}}$('cmdrpBrief').append(mk('span',state(x)));$('cmdrpTitle').textContent=x?.name||'Mon profil loueur';$('cmdrpDescription').textContent=x?x.type+' · '+state(x):'Mes serveurs CMD Hosting';$('cmdrpBanner').style.backgroundImage=x?art(x):'linear-gradient(110deg,#16365e,#28264c)';controls(x);
for(const[id,names]of[['cmdrpSettings',cats],['cmdrpAdmin',admins]]){let el=$(id);el.replaceChildren();for(const n of names){let b=btn(n,()=>{tab=n;if(n==='Mods'){modsPage();return;}if(n==='Changer de jeu'){switchGamePage();return;}draw()});if(n===tab)b.className='cmdrp-on';el.append(b)}}content(x)}
async function load(){$('cmdrpStatus').textContent='Chargement des serveurs…';
try{let m=await fetch('/api/auth/me',{credentials:'include'}).then(r=>r.json());if(!m.user){leases=[];library=[];pc=null;$('cmdrpUser').textContent='Non connecté';draw();$('cmdrpStatus').textContent='Connecte-toi pour consulter tes serveurs.';$('cmdrpDetails').prepend(btn('Se connecter',()=>location.href='/connexion'));return}
$('cmdrpUser').textContent=m.user.displayName||m.user.display_name||m.user.username||'Compte CMD';
const rr=await Promise.allSettled(['/api/rentals','/api/game-library','/api/catalog','/api/pc/status'].map(url=>fetch(url,{credentials:'include',cache:'no-store'})));
const doc=await Promise.all(rr.map(async r=>r.status==='fulfilled'&&r.value.ok?r.value.json().catch(()=>({})):{}));
leases=Array.isArray(doc[0]?.rentals)?doc[0].rentals:[];library=Array.isArray(doc[1]?.items)?doc[1].items:[];catalog=Array.isArray(doc[2]?.games)?doc[2].games:[];pc=doc[3]?.machine?doc[3]:null;
rpOwnerId=String(m.user.id||m.user.username||'account');try{const pr=await fetch('https://cmd-hosting-mods-api-production.up.railway.app/api/preproduction/games',{cache:'no-store',signal:AbortSignal.timeout(12000)});if(pr.ok){const bp=await pr.json();blueprints=Array.isArray(bp.games)&&bp.games.length>=150?bp.games:[]}}catch(e){blueprints=[]}
if(!list().some(v=>v.id===key))key=list()[0]?.id||'';draw();$('cmdrpStatus').textContent='Données du compte connecté. Aucune statistique fictive.'}catch(e){$('cmdrpStatus').textContent='Erreur : '+e.message}}
function open(){page(pid);if($('cmdTitle'))$('cmdTitle').textContent='Profil loueur';history.replaceState(null,'','#'+pid);load()}
$('cmdrpSelect').onchange=e=>{key=e.target.value;tab=cats[0];draw()};$('cmdrpServers').onclick=()=>{tab=cats[0];draw()};$('cmdrpStore').onclick=shop;$('cmdrpCreate').onclick=shop;$('cmdrpReload').onclick=load;
function nav(parent,label,klass){if(!parent)return;let b=btn(label,open);b.dataset.page=pid;if(klass)b.className=klass;parent.prepend(b)}
nav(document.querySelector('#cmdOriginalNav .links')||document.querySelector('.links'),'👤 Profil loueur');
nav($('cmdPrimary'),'👤 Mes serveurs · Profil','cmd-nav');
let account=$('compte')||$('account')||$('monCompte');if(account)nav(account,'👤 Gérer mes serveurs','ghost');
if(location.hash==='#'+pid)open();
})();


/*CMD_MAP_UI_STYLES_V1*/
(function(){const s=document.createElement('style');s.textContent=[
"#cmdrpBrief{display:flex;align-items:center;gap:9px}",
"#cmdrpBrief img{width:64px;height:46px;object-fit:cover;border-radius:8px;border:1px solid #456a95;flex:none}",
"#cmdrpBanner{min-height:210px}",
"#cmdrpBanner>div{min-height:210px}",
"#cmdRenterProfile .cmdrp-stats .cmdrp-box button{font-size:12px;margin-top:8px;text-align:center;background:#1662a8}",
"#cmdrpMapEditor{margin:12px 0 15px;border:1px solid #4387ba}",
"#cmdrpMapEditor select,#cmdrpMapEditor input{display:block;width:100%;box-sizing:border-box;background:#132f52;color:#edf6ff;border:1px solid #4574a7;border-radius:8px;padding:10px;margin:10px 0}",
"#cmdrpMapEditor p{max-width:780px;font-size:12px}"
].join(' ');document.head.append(s)})();

/*CMD_MAP_ROOT_REPAIR_20261011*/



/* CMD Hosting live V11: one compact catalogue and Palworld Workshop within its server profile. */
(()=>{'use strict';if(window.__CMD_HOSTING_RAILWAY_V11__)return;window.__CMD_HOSTING_RAILWAY_V11__=true;
const $=id=>document.getElementById(id);
const css=[
'html body [data-cmd-v11-hide="1"]{display:none!important}',
'html body #cmdCatalogSection #cmdShopGrid{display:grid!important;grid-template-columns:repeat(auto-fill,minmax(225px,1fr))!important;gap:10px!important}',
'html body #cmdCatalogSection #cmdShopGrid>.cmd-shop-card{max-width:100%!important;min-width:0!important;overflow:hidden!important;height:auto!important;max-height:none!important}',
'html body #cmdRenterProfile #cmdrpRailwayPalworld:not([hidden]){display:block!important;white-space:normal!important;min-height:44px!important;border:1px solid #8fb2ef!important;border-radius:10px!important;background:linear-gradient(115deg,#1b6da7,#4a3b9d)!important;color:#fff!important;font-weight:700!important;padding:10px!important}',
'html body #cmdRenterProfile #cmdrpRailwayPalworld[hidden]{display:none!important}',
'html body #cmdRenterProfile #cmdrpSettings button[data-cmd-profile-mods="1"]{background:linear-gradient(120deg,#245e9d,#513e9e)!important;color:#fff!important}',
'@media(max-width:800px){html body #cmdCatalogSection #cmdShopGrid{grid-template-columns:minmax(0,1fr)!important;gap:9px!important}',
'html body #cmdCatalogSection #cmdShopGrid>.cmd-shop-card{display:grid!important;grid-template-columns:94px minmax(0,1fr)!important;gap:10px!important;align-items:center!important;min-height:96px!important;max-height:126px!important;padding:9px!important;transform:none!important}',
'html body #cmdCatalogSection #cmdShopGrid>.cmd-shop-card>.cmd-shop-cover{grid-column:1!important;grid-row:1!important;position:static!important;width:94px!important;max-width:94px!important;min-width:0!important;height:76px!important;max-height:76px!important;overflow:hidden!important;transform:none!important;border-radius:8px!important}',
'html body #cmdCatalogSection #cmdShopGrid>.cmd-shop-card>.cmd-shop-cover img{position:static!important;width:94px!important;max-width:94px!important;height:76px!important;max-height:76px!important;min-height:0!important;object-fit:cover!important;transform:none!important}',
'html body #cmdCatalogSection #cmdShopGrid>.cmd-shop-card>.cmd-shop-text{grid-column:2!important;grid-row:1!important;display:flex!important;flex-direction:column!important;justify-content:center!important;gap:4px!important;width:100%!important;min-width:0!important;height:auto!important;max-height:110px!important;padding:3px!important;overflow:hidden!important}',
'html body #cmdCatalogSection #cmdShopGrid .cmd-shop-name{font-size:14px!important;line-height:1.25!important;white-space:normal!important;overflow-wrap:anywhere!important;color:#fff!important}',
'html body #cmdCatalogSection .cmd-shop-feature{height:135px!important;max-height:135px!important;overflow:hidden!important}',
'html body #cmdRenterProfile .cmdrp-layout{display:block!important}html body #cmdRenterProfile .cmdrp-sidebar,html body #cmdRenterProfile .cmdrp-main{max-width:100%!important;min-width:0!important;padding:12px!important}}'
].join('\n');
const norm=v=>String(v||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[\u{1F300}-\u{1FAFF}\uFE0F\u200D]/gu,'').replace(/[^a-z0-9 &+]/gi,' ').replace(/\s+/g,' ').trim().toLowerCase();
const hide=new Set(['mods & workshop','mods et workshop','mods workshop','jeux et decors hd','jeux & decors hd','boutique des jeux','boutique de jeux','changer de jeu','jeux et configurations']);
function update(){
 if(!$('cmdRailwayCssV11')){let e=document.createElement('style');e.id='cmdRailwayCssV11';e.textContent=css;document.head.append(e)}
 for(const root of document.querySelectorAll('#cmdSidebar,#cmdPrimary,#cmdOriginalNav,#nav')){
  for(const b of root.querySelectorAll('a,button')){
   if(b.closest('#cmdRenterProfile,#cmdMods,#hostingPanel,#cmdGameSwitch,#cmdCatalogSection,#jeux'))continue;
   if(!hide.has(norm(b.getAttribute('aria-label')||b.textContent)))continue;
   if(b.dataset.cmdV11Hide==='1')continue;
   b.dataset.cmdV11Hide='1';b.hidden=true;b.setAttribute('aria-hidden','true');b.tabIndex=-1;
  }
 }
 const profile=$('cmdRenterProfile'),side=profile?.querySelector('.cmdrp-sidebar');
 if(side){
  const choice=$('cmdrpSelect')?.selectedOptions?.[0];
  const val=[choice?.dataset?.cmdGame,choice?.textContent,$('cmdrpTitle')?.textContent].filter(Boolean).join(' ');
  const isPalworld=!!choice&&/\bpalworld\b/i.test(val);
  let b=$('cmdrpRailwayPalworld');
  if(!b){b=document.createElement('button');b.id='cmdrpRailwayPalworld';b.type='button';
   b.addEventListener('click',()=>{if(typeof window.CMDHostingOpenPalworldWorkshop==='function')window.CMDHostingOpenPalworldWorkshop();
    else window.open('https://steamcommunity.com/app/1623730/workshop/','_blank','noopener,noreferrer')});
   const anchor=side.querySelector('#cmdrpCreate');if(anchor)anchor.before(b);else side.append(b);
  }
  if(b.textContent!=='Palworld · Steam Workshop')b.textContent='Palworld · Steam Workshop';
  b.hidden=!isPalworld;b.disabled=!isPalworld;
  for(const old of side.querySelectorAll('#cmdrpPalworldWorkshop,#cmdrpPalworldOpenV6,#cmdrpAlwaysPalworld')){
   if(old!==b&&old.dataset.cmdV11Hide!=='1'){old.hidden=true;old.dataset.cmdV11Hide='1'}
  }
  for(const button of side.querySelectorAll('#cmdrpSettings button')){
   if(norm(button.textContent)==='mods'){button.textContent='Mods & Workshop';button.dataset.cmdProfileMods='1'}
  }
 }
}
function openGames(){const t=$('cmdCatalogSection')||$('jeux');if(!t)return;
 if(typeof window.show==='function')window.show(t.id);else document.querySelectorAll('.page').forEach(x=>x.classList.toggle('hide',x!==t));
 try{history.replaceState(null,'','#'+t.id)}catch{}}
function init(){
 update();let busy=false;
 if(typeof MutationObserver==='function')new MutationObserver(()=>{if(busy)return;busy=true;requestAnimationFrame(()=>{busy=false;update()})}).observe(document.body,{subtree:true,childList:true});
 document.addEventListener('click',e=>{const n=e.target?.closest?.('[data-page="jeux"],[href="#jeux"],#cmdv7Catalog');
  if(!n||!n.closest('#cmdSidebar,#cmdPrimary,#cmdOriginalNav,#nav')||!$('cmdCatalogSection'))return;
  e.preventDefault();e.stopImmediatePropagation();openGames()},true);
 document.addEventListener('change',e=>{if(e.target?.id==='cmdrpSelect')update()});
 if(location.hash==='#jeux'&&$('cmdCatalogSection'))openGames();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
