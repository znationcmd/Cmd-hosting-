(function(){
'use strict';
if(document.getElementById('cmdGameSwitch'))return;
const host=document.querySelector('main.wrap')||document.querySelector('main');if(!host)return;
const sec=document.createElement('section');sec.id='cmdGameSwitch';sec.className='page section hide';
sec.innerHTML='<span class="switch-label">CMD HOSTING · ABONNEMENT</span><h2>Changer de jeu</h2><p class="switch-muted">Change le jeu de ton serveur tout en conservant ton compte et la période de location déjà réglée.</p><div class="switch-banner"><strong>Préparation uniquement</strong><p>La tarification et la machine ne sont pas encore en service : aucun jeu ne sera remplacé et aucun paiement n’est demandé ici.</p></div><div class="switch-grid"><div class="switch-panel"><h3>1. Mon serveur actuel</h3><label>Choisir un serveur<select id="switchServer"><option value="">Chargement…</option></select></label><p id="switchCurrent" class="switch-muted"></p></div><div class="switch-panel"><h3>2. Nouveau jeu</h3><label>Jeu souhaité<select id="switchTarget"><option value="">Chargement…</option></select></label><p class="switch-muted">Les jeux non validés restent indisponibles à l’installation. Les plateformes doivent être vérifiées.</p></div></div><div class="switch-panel"><h3>3. Différence à régler</h3><div id="switchQuote" class="switch-quote">Sélectionne un serveur et un nouveau jeu pour préparer le devis.</div><p class="switch-muted">Principe : valeur de la période restante de l’ancien jeu déduite du coût du nouveau jeu pour cette même période. Aucun tarif fictif ne sera affiché.</p><button id="switchPreview" type="button">Vérifier le changement</button> <button id="switchSubmit" type="button" disabled>Enregistrer ma demande</button></div><div class="switch-panel"><h3>Conservation des données</h3><p class="switch-muted">Le futur changement devra sauvegarder les fichiers et réglages de l’ancien jeu avant toute installation. Changer de jeu ne rend pas ses sauvegardes compatibles avec le nouveau.</p><p id="switchStatus" class="switch-status" role="status"></p></div>';
host.append(sec);
const css=document.createElement('style');css.textContent='#cmdGameSwitch{max-width:1100px;margin:0 auto;color:#ecf7ff}#cmdGameSwitch h2{font-size:clamp(25px,3vw,34px);margin:7px 0}#cmdGameSwitch h3{font-size:17px;margin:0 0 15px;color:#f1f8ff}.switch-label{color:#87d3ff;font:700 11px system-ui;letter-spacing:.13em}.switch-muted{font:13px/1.6 system-ui;color:#b2cadd}.switch-banner{margin:16px 0;background:#14354a;border:1px solid #3f7191;border-radius:10px;padding:14px 17px}.switch-banner strong{color:white}.switch-banner p{font:12px/1.5 system-ui;margin:5px 0 0;color:#bdd7e7}.switch-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}.switch-panel{border:1px solid #34546f;background:#102337;padding:18px;border-radius:12px;margin:15px 0}.switch-panel label{font:600 13px system-ui;color:#d7e9f6}.switch-panel select{box-sizing:border-box;display:block;margin-top:7px;padding:11px 9px;border:1px solid #4a7290;border-radius:7px;background:#0c1a2a;color:#f1f9ff;width:100%;min-height:44px;max-width:100%}.switch-panel button{padding:11px 14px;background:#176e9f;border:1px solid #3e92bf;color:#fff;border-radius:8px;font:700 12px system-ui;cursor:pointer}.switch-panel button:disabled{opacity:.45;cursor:default}.switch-quote{background:#152e43;border-radius:8px;padding:15px;color:#e3f3fd;line-height:1.7;font:13px system-ui;margin-bottom:12px}.switch-status{font:13px/1.6 system-ui;color:#89d6ff;min-height:20px}@media(max-width:750px){.switch-grid{grid-template-columns:1fr}.switch-panel{padding:15px;margin:12px 0}}';document.head.append(css);
const $=id=>document.getElementById(id);
let games=[],servers=[],quote=null;
function message(s){$('switchStatus').textContent=s}
async function api(url,opts={}){const response=await fetch(url,{credentials:'include',cache:'no-store',...opts});let data={};try{data=await response.json()}catch{}if(!response.ok)throw Error(data.message||'Service momentanément indisponible');return data}
function post(url,d){return api(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)})}
function reset(){quote=null;$('switchSubmit').disabled=true;$('switchQuote').textContent='Clique sur « Vérifier le changement » pour obtenir les conditions du devis.'}
async function load(){
try{
const [owned,catalog]=await Promise.all([api('/api/game-library'),api('/api/catalog')]);
servers=owned.items||[];games=catalog.games||[];
const sel=$('switchServer'),old=sel.value;sel.replaceChildren();
const label=document.createElement('option');label.value='';label.textContent='Choisir mon serveur';sel.append(label);
for(const srv of servers){const o=document.createElement('option');o.value=srv.id;o.textContent=srv.server_label||srv.display_name+' — '+(srv.game_name||srv.game_key);sel.append(o)}
if(servers.some(s=>s.id===old))sel.value=old;else if(servers.length)sel.value=servers[0].id;
const target=$('switchTarget'),oldGame=target.value;target.replaceChildren();
const first=document.createElement('option');first.value='';first.textContent='Choisir un autre jeu';target.append(first);
const unique=new Set();
for(const game of [...games].sort((a,b)=>a.name.localeCompare(b.name,'fr'))){
 if(unique.has(game.key))continue;unique.add(game.key);
 const o=document.createElement('option');o.value=game.key;o.textContent=game.name+(game.status==='restricted'?' · indisponible':game.status==='review'?' · à vérifier':'');
 o.disabled=game.status==='restricted';target.append(o)
}
if(games.some(g=>g.key===oldGame&&g.status!=='restricted'))target.value=oldGame;
if(!target.value){const fallback=games.find(g=>g.name==='DayZ'&&g.key!==(servers.find(v=>v.id===sel.value)?.game_key));if(fallback)target.value=fallback.key}
update();reset();
}catch(e){message(e.message)}}
function update(){const s=servers.find(x=>x.id===$('switchServer').value);$('switchCurrent').textContent=s?'Jeu actuel : '+(s.game_name||s.game_key)+' · '+s.platform+' · '+s.slots+' places.':'Aucun serveur sélectionné.';const current=s?.game_key;
for(const option of $('switchTarget').options){const game=games.find(g=>g.key===option.value);option.disabled=!!game&&(game.status==='restricted'||game.key===current)}
if($('switchTarget').selectedOptions[0]?.disabled)$('switchTarget').value='';
reset();}
$('switchServer').addEventListener('change',update);
$('switchTarget').addEventListener('change',reset);
$('switchPreview').onclick=async()=>{const gameId=$('switchServer').value,targetKey=$('switchTarget').value;if(!gameId||!targetKey){message('Choisis ton serveur et le nouveau jeu.');return}
const b=$('switchPreview');b.disabled=true;try{quote=await post('/api/game-switch/quote',{gameId,targetKey});
const days=quote.remainingDays===null?'Période payée non encore déterminée':quote.remainingDays+' jour(s) restant(s)';
$('switchQuote').textContent=quote.currentGame+' → '+quote.targetGame+' · '+days+' · Différence de prix : à calculer après configuration des tarifs. Aucun prélèvement.';
$('switchSubmit').disabled=false;message('Prévisualisation prête. Le serveur restera sur son jeu actuel.');
}catch(e){reset();message(e.message)}finally{b.disabled=false}};
$('switchSubmit').onclick=async()=>{if(!quote)return;const b=$('switchSubmit');b.disabled=true;
try{const res=await post('/api/game-switch/request',{gameId:quote.serverId,targetKey:quote.targetKey});
message(res.requestSaved?'Demande de changement enregistrée. Aucun paiement et aucun changement de jeu effectués.':res.message||'Demande en attente.');
}catch(e){message(e.message)}finally{b.disabled=false}};
function open(){if(typeof pages!=='undefined'&&Array.isArray(pages)&&!pages.includes('cmdGameSwitch'))pages.push('cmdGameSwitch');if(typeof show==='function')show('cmdGameSwitch');else{document.querySelectorAll('.page').forEach(p=>p.classList.add('hide'));sec.classList.remove('hide')}sec.classList.remove('hide');location.hash='cmdGameSwitch';load()}
const nav=document.querySelector('#cmdOriginalNav .links')||document.querySelector('.links');
if(nav){const b=document.createElement('button');b.type='button';b.dataset.page='cmdGameSwitch';b.textContent='🔄 Changer de jeu';b.onclick=open;nav.prepend(b)}
const sidebar=$('cmdPrimary');if(sidebar){const b=document.createElement('button');b.type='button';b.className='cmd-nav';const icon=document.createElement('span');icon.textContent='🔄';const label=document.createElement('span');label.textContent='Changer de jeu';b.append(icon,label);b.onclick=open;sidebar.prepend(b)}
if(location.hash==='#cmdGameSwitch')open();
})();