(function(){
if(typeof pages==='undefined'||typeof show!=='function'||document.getElementById('rentals'))return;
pages.push('rentals');
const nav=document.querySelector('.links'),link=document.createElement('button');link.type='button';link.dataset.page='rentals';link.textContent='🗓 Locations';
const refresh=document.getElementById('siteRefresh');if(nav){if(refresh&&refresh.parentElement===nav)nav.insertBefore(link,refresh);else nav.append(link)}
const main=document.querySelector('main.wrap')||document.querySelector('main');if(!main)return;
const section=document.createElement('section');section.id='rentals';section.className='page section hide';
section.innerHTML='<span class="eyebrow">CMD HOSTING · GESTION DES LOCATIONS</span><h2>Mes locations de serveurs</h2><p class="sub">Le paiement des locations sera versé au PayPal du propriétaire de CMD Hosting, jamais au PayPal du client. À échéance impayée : suspension et reprise seulement après paiement vérifié, sans suppression des sauvegardes. Paiements encore désactivés pendant la préparation.</p><div class="host-dashboard"><div class="host-block"><h3>Mes serveurs et leurs durées</h3><div id="rentalsState" class="host-msg">Chargement…</div><div id="rentalsList"></div><button type="button" class="ghost" id="rentalsReload">↻ Actualiser les locations</button></div><div class="host-block"><h3>Configurer une location</h3><form id="rentalsForm"><p><label>Serveur<select id="rentalsGame" required style="width:100%;padding:12px"></select></label></p><p><label>Durée<select id="rentalsPeriod" style="width:100%;padding:12px"><option value="3">3 jours</option><option value="30" selected>1 mois (30 jours)</option><option value="90">90 jours</option><option value="365">1 an</option></select></label></p><p><label><input id="rentalsResume" type="checkbox" checked> Redémarrer automatiquement après confirmation du paiement</label></p><button class="button" id="rentalsSave" type="submit">Enregistrer la configuration</button><p class="small" id="rentalsNotice"></p></form><p class="small">Si le règlement n’arrive pas à l’échéance : serveur suspendu, aucune suppression des fichiers ou sauvegardes. Aucun encaissement ni arrêt automatique tant que le prestataire de paiement n’est pas connecté et vérifié.</p></div></div>';
main.append(section);
const $=x=>document.getElementById(x);
async function api(url,options={}){const r=await fetch(url,{credentials:'include',cache:'no-store',...options}),j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.message||'Erreur de connexion');return j}
let cache=[];
const states={exempt:'Accès permanent',awaiting_payment:'En attente de commercialisation',expired:'Échéance dépassée',suspended:'Serveur suspendu',active:'Location active'};
async function loadRentals(){
try{
const d=await api('/api/rentals');cache=d.rentals||[];
$('rentalsState').textContent=d.setupNote||'';
const list=$('rentalsList'),select=$('rentalsGame'),sel=select.value;list.replaceChildren();select.replaceChildren();
if(!cache.length){const p=document.createElement('p');p.textContent='Aucun jeu enregistré. Ajoute d’abord un jeu dans « Mes jeux ». ';list.append(p);return}
for(const x of cache){const o=document.createElement('option');o.value=x.gameId;o.textContent=x.name;select.append(o);const card=document.createElement('div');card.className='host-entry';const title=document.createElement('strong');title.textContent=x.name;const details=document.createElement('p');details.textContent=(states[x.state]||x.state)+' · '+x.periodDays+' jours'+(x.paidUntil?' · Jusqu’au '+new Date(x.paidUntil).toLocaleDateString('fr-FR'):'')+' · Reprise automatique : '+(x.autoResume?'oui':'non');card.append(title,details);list.append(card)}
if(cache.some(x=>x.gameId===sel))select.value=sel;syncSelected()
}catch(e){$('rentalsState').textContent=e.message}
}
function syncSelected(){const r=cache.find(x=>x.gameId===$('rentalsGame').value);if(r){$('rentalsPeriod').value=String(r.periodDays);$('rentalsResume').checked=r.autoResume}}
$('rentalsGame').onchange=syncSelected;$('rentalsReload').onclick=loadRentals;
$('rentalsForm').onsubmit=async e=>{e.preventDefault();const btn=$('rentalsSave');btn.disabled=true;try{const result=await api('/api/rentals',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({gameId:$('rentalsGame').value,periodDays:Number($('rentalsPeriod').value),autoResume:$('rentalsResume').checked})});$('rentalsNotice').textContent=result.message;await loadRentals()}catch(err){$('rentalsNotice').textContent=err.message}finally{btn.disabled=false}};
link.onclick=()=>{show('rentals');loadRentals()};
if(location.hash==='#rentals'){show('rentals');loadRentals()}
})();