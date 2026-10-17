(function(){
if(typeof pages==='undefined'||typeof show!=='function'||document.getElementById('hostingPanel'))return;
pages.push('hostingPanel');
const nav=document.querySelector('.links'),link=document.createElement('button');
link.type='button';link.dataset.page='hostingPanel';link.textContent='⚙ Panneau serveurs';
const siteRefresh=document.getElementById('siteRefresh');
if(nav){if(siteRefresh&&siteRefresh.parentElement===nav)nav.insertBefore(link,siteRefresh);else nav.append(link)}
const main=document.querySelector('main.wrap')||document.querySelector('main');if(!main)return;
const page=document.createElement('section');page.id='hostingPanel';page.className='page section hide';page.innerHTML="<span class=\"eyebrow\">CMD HOSTING · GESTION</span><h2>⚙ Panneau des serveurs</h2>\n<p class=\"sub\">Configuration des jeux, redémarrages automatiques et fichiers texte autorisés. Ton serveur et ses sauvegardes sont conservés.</p>\n<div class=\"host-dashboard\">\n<div class=\"host-block\"><h3>🎮 Serveurs sur mon PC</h3><p class=\"small\" id=\"hpStatus\">Chargement...</p><p><label>Serveur<select id=\"hpServer\" style=\"width:100%;padding:12px\"></select></label></p>\n<p class=\"small\" id=\"hpLive\"></p><div class=\"host-toolbar\"><button type=\"button\" class=\"ghost\" id=\"hpRefresh\">↻ Actualiser</button><button type=\"button\" class=\"ghost\" id=\"hpStart\">▶ Démarrer</button><button type=\"button\" class=\"ghost\" id=\"hpStop\">■ Arrêter</button><button type=\"button\" class=\"ghost\" id=\"hpRestart\">↻ Redémarrer</button></div>\n<p class=\"small\">Si un serveur est déjà lancé manuellement, arrête-le proprement avant de le lancer dans CMD Hosting.</p></div>\n<div class=\"host-block\"><h3>⏰ Redémarrage automatique</h3><label><input type=\"checkbox\" id=\"hpAutoOn\"> Activer</label><p><label>Intervalle<select id=\"hpInterval\" style=\"width:100%;padding:12px\">\n<option value=\"60\">Toutes les heures</option><option value=\"180\">Toutes les 3 heures</option><option value=\"360\">Toutes les 6 heures</option><option value=\"720\">Toutes les 12 heures</option><option value=\"1440\" selected>Tous les jours</option><option value=\"2880\">Toutes les 48 heures</option><option value=\"10080\">Toutes les semaines</option></select></label></p>\n<label>Premier redémarrage (facultatif)<input type=\"datetime-local\" id=\"hpFirst\" style=\"width:100%;padding:12px\"></label><p><button type=\"button\" class=\"button\" id=\"hpAutoSave\">Enregistrer</button></p><p id=\"hpAutoStatus\" class=\"small\"></p></div>\n<div class=\"host-block\"><h3>🛠 Jeu, nom et slots</h3><p><label>Profil<select id=\"hpGame\" style=\"width:100%;padding:12px\"></select></label></p>\n<p><label>Jeu<select id=\"hpGameKey\" style=\"width:100%;padding:12px\"><option value=\"ark\">ARK Survival Ascended</option><option value=\"arma\">Arma Reforger</option><option value=\"dayz\">DayZ</option><option value=\"minecraft\">Minecraft Java</option><option value=\"bedrock\">Minecraft Bedrock</option><option value=\"valheim\">Valheim</option><option value=\"terraria\">Terraria</option><option value=\"zomboid\">Project Zomboid</option><option value=\"palworld\">Palworld</option><option value=\"7dtd\">7 Days to Die</option><option value=\"fs25\">Farming Simulator 25</option><option value=\"conan\">Conan Exiles</option></select></label></p>\n<p><label>Nom du serveur<input id=\"hpGameName\" style=\"width:100%;padding:12px\" maxlength=\"80\"></label></p><p><label>Plateforme<select id=\"hpPlatform\" style=\"width:100%;padding:12px\"><option value=\"crossplay\">Cross-play</option><option value=\"pc\">PC</option><option value=\"ps\">PlayStation</option><option value=\"xbox\">Xbox</option></select></label></p>\n<p><label>Nombre de joueurs / slots<input type=\"number\" id=\"hpSlots\" min=\"2\" max=\"100\" value=\"5\" style=\"width:100%;padding:12px\"></label></p>\n<p><button type=\"button\" class=\"button\" id=\"hpGameSave\">Sauvegarder le profil</button></p><p id=\"hpGameStatus\" class=\"small\"></p>\n<p class=\"small\">ARK créé automatiquement : nom et slots seront appliqués au prochain lancement. Changer de jeu crée une nouvelle configuration sans supprimer les anciens mondes. Les autres jeux peuvent nécessiter une installation propre.</p></div>\n<div class=\"host-block\"><h3>📁 Fichiers de configuration</h3><p class=\"small\">Ouvrir, modifier, importer et exporter un fichier texte autorisé par l’agent. Les fichiers ZIP et les fichiers exécutables ne sont pas pris en charge.</p>\n<label>Fichier<select id=\"hpFile\" style=\"width:100%;padding:12px\"></select></label><div class=\"host-toolbar\"><button type=\"button\" class=\"ghost\" id=\"hpOpenFile\">Ouvrir</button><button type=\"button\" class=\"ghost\" id=\"hpDownload\">Télécharger</button><label class=\"ghost\" style=\"display:inline-block;cursor:pointer\">Importer<input type=\"file\" accept=\".ini,.json,.xml,.cfg,.txt\" id=\"hpUpload\" style=\"display:none\"></label></div>\n<textarea id=\"hpText\" rows=\"12\" spellcheck=\"false\" placeholder=\"Sélectionne puis ouvre un fichier…\" style=\"width:100%;max-width:100%;padding:12px;background:#0d192f;color:#eef;border:1px solid #436084;border-radius:8px\"></textarea>\n<p><button type=\"button\" class=\"button\" id=\"hpSaveFile\">Enregistrer sur le PC</button></p><p class=\"small\" id=\"hpFileStatus\"></p>\n<p class=\"small\">La modification directe des mots de passe d’administration dans les commandes de lancement n’est pas encore disponible dans cette interface. Ne partage pas tes secrets.</p></div>\n</div>";main.append(page);
const $=id=>document.getElementById(id),say=(id,txt)=>$(id).textContent=txt;
const request=async(url,options={})=>{const r=await fetch(url,{credentials:'include',cache:'no-store',...options}),d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.message||'Erreur réseau');return d};
const option=(id,title)=>{const o=document.createElement('option');o.value=id;o.textContent=title;return o};
let servers=[],restarts=[],games=[];
const server=()=>servers.find(s=>s.id===$('hpServer').value);
const game=()=>games.find(s=>s.id===$('hpGame').value);
function updateServer(){
const s=server();$('hpFile').replaceChildren();for(const f of s?.files||[])$('hpFile').append(option(f.id,f.name||f.id));
say('hpLive',s?(s.running?'● Démarré par CMD Hosting':s.configured?'○ Configuré':'○ À configurer')+' · '+(s.name||s.id):'Aucun serveur détecté.');
for(const [id,on] of [['hpStart',!!s?.configured&&!s.running],['hpStop',!!s?.running],['hpRestart',!!s?.running]])$(id).disabled=!on;
const sch=restarts.find(x=>x.serverId===s?.id);$('hpAutoOn').checked=!!sch?.enabled;$('hpInterval').value=String(sch?.intervalMinutes||1440);$('hpFirst').value='';
say('hpAutoStatus',sch?.enabled?'Prochaine exécution : '+new Date(sch.nextRun).toLocaleString('fr-FR'):'Redémarrage automatique non activé');
say('hpFileStatus',s?.files?.length?'Fichier texte autorisé disponible.':'Aucun fichier texte exposé par cet agent. Mise à jour de l’agent nécessaire.');
$('hpText').value='';
}
async function loadPC(){try{const [p,r]=await Promise.all([request('/api/pc/status'),request('/api/pc/restarts')]);const saved=$('hpServer').value;
servers=p.machine?.servers||[];restarts=r.schedules||[];
$('hpServer').replaceChildren();for(const s of servers)$('hpServer').append(option(s.id,s.name||s.id));
if(servers.some(s=>s.id===saved))$('hpServer').value=saved;
say('hpStatus',(p.machine?.online?'PC connecté':'PC hors ligne')+' · '+servers.length+' serveur(s) · RAM libre : '+(p.machine?.availableGB??'—')+' Go');updateServer();
}catch(e){say('hpStatus',e.message)}}
function loadProfile(){const g=game();$('hpGameKey').value=g?.game_key||'ark';$('hpGameName').value=g?.display_name||'';$('hpPlatform').value=g?.platform||'crossplay';$('hpSlots').value=g?.slots||5}
async function loadGames(){try{const d=await request('/api/game-library');games=d.items||[];const old=$('hpGame').value;$('hpGame').replaceChildren();
$('hpGame').append(option('','＋ Ajouter un nouveau serveur'));for(const g of games)$('hpGame').append(option(g.id,g.display_name));if(games.some(g=>g.id===old))$('hpGame').value=old;loadProfile();
}catch(e){say('hpGameStatus',e.message)}}
$('hpServer').onchange=updateServer;$('hpGame').onchange=loadProfile;$('hpRefresh').onclick=()=>{loadPC();loadGames()};
for(const [button,action] of [['hpStart','start'],['hpStop','stop'],['hpRestart','restart']])$(button).onclick=async()=>{
const s=server();if(!s)return;if(action!=='start'&&!confirm((action==='restart'?'Redémarrer ':'Arrêter ')+s.name+' ?'))return;
try{await request('/api/pc/command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({serverId:s.id,action})});say('hpStatus','Commande envoyée au PC, en attente de confirmation.');setTimeout(loadPC,11000)}
catch(e){say('hpStatus',e.message)}
};
$('hpAutoSave').onclick=async()=>{
const s=server();if(!s)return say('hpAutoStatus','Choisis un serveur.');
const d={serverId:s.id,enabled:$('hpAutoOn').checked,intervalMinutes:Number($('hpInterval').value)};
const first=$('hpFirst').value;if(first)d.firstAt=new Date(first).toISOString();
try{const x=await request('/api/pc/restarts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});
say('hpAutoStatus',x.message);const a=await request('/api/pc/restarts');restarts=a.schedules||[]}
catch(e){say('hpAutoStatus',e.message)}
};
$('hpGameSave').onclick=async()=>{
const g=game(),d={gameKey:$('hpGameKey').value,name:$('hpGameName').value.trim(),platform:$('hpPlatform').value,slots:Number($('hpSlots').value)};if(g)d.id=g.id;
try{const r=await request('/api/game-library',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});
await loadGames();$('hpGame').value=r.id;loadProfile();say('hpGameStatus','Profil enregistré. Les fichiers et sauvegardes existants restent conservés.')}
catch(e){say('hpGameStatus',e.message)}
};
async function waitJob(id){for(let n=0;n<30;n++){await new Promise(done=>setTimeout(done,1100));const d=await request('/api/pc/status');const j=(d.jobs||[]).find(v=>v.id===id);if(j?.status==='failed')throw Error(j.message||'Échec de la commande');if(j?.status==='completed')return j}throw Error('Délai expiré. Consulte l’historique des commandes.')}
$('hpOpenFile').onclick=async()=>{
const s=server(),f=$('hpFile').value;if(!s||!f)return say('hpFileStatus','Sélectionne un fichier autorisé.');
say('hpFileStatus','Lecture sur le PC en cours…');
try{const r=await request('/api/pc/command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({serverId:s.id,action:'read-config',fileId:f})}),job=await waitJob(r.commandId);
$('hpText').value=String(job.content||'');say('hpFileStatus','Fichier chargé dans l’éditeur.')}
catch(e){say('hpFileStatus',e.message)}
};
$('hpSaveFile').onclick=async()=>{
const s=server(),f=$('hpFile').value,content=$('hpText').value;if(!s||!f)return say('hpFileStatus','Sélectionne un fichier autorisé.');
if(content.length>60000)return say('hpFileStatus','Fichier texte trop volumineux (60 000 caractères maximum).');
if(!confirm('Enregistrer les modifications de ce fichier sur ton PC ?'))return;
try{const r=await request('/api/pc/command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({serverId:s.id,action:'save-config',fileId:f,content})});
say('hpFileStatus','Enregistrement en cours…');const j=await waitJob(r.commandId);say('hpFileStatus',j.message||'Enregistrement confirmé par le PC. Certains réglages exigent un redémarrage.')}
catch(e){say('hpFileStatus',e.message)}
};
$('hpDownload').onclick=()=>{const name=(server()?.files||[]).find(x=>x.id===$('hpFile').value)?.name||'config.txt';
const blob=new Blob([$('hpText').value],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);say('hpFileStatus','Copie locale téléchargée.')}
$('hpUpload').onchange=async()=>{const file=$('hpUpload').files?.[0];if(!file)return;
if(file.size>60000||!/\.(ini|cfg|json|xml|txt)$/i.test(file.name))return say('hpFileStatus','Seuls les fichiers texte INI, CFG, JSON, XML ou TXT de 60 Ko maximum sont acceptés.');
$('hpText').value=await file.text();say('hpFileStatus','Fichier importé dans l’éditeur. Clique sur Enregistrer pour le transmettre au PC.');$('hpUpload').value='';
};
link.onclick=()=>{show('hostingPanel');loadPC();loadGames()};
if(location.hash==='#hostingPanel'){show('hostingPanel');loadPC();loadGames()}
})();